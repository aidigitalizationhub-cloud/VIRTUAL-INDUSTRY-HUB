
import { Project, NewsItem, User, UserRole, SavedSearch, AlertNotification, AccountDeletionRecord } from '../types';
import { supabase } from '../lib/supabase';
import { EmbeddingService } from './embeddingService';
import { decryptMessage } from '../lib/cryptoService';

const getStorageFilePath = (urlOrPath: string, bucket = 'projects'): string => {
  if (!urlOrPath) return '';
  const searchStr = `/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(searchStr);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + searchStr.length));
  }
  const searchSignStr = `/object/sign/${bucket}/`;
  const idxSign = urlOrPath.indexOf(searchSignStr);
  if (idxSign !== -1) {
    const remaining = urlOrPath.substring(idxSign + searchSignStr.length);
    const qIdx = remaining.indexOf('?');
    const path = qIdx !== -1 ? remaining.substring(0, qIdx) : remaining;
    return decodeURIComponent(path);
  }
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    try {
      const parsed = new URL(urlOrPath);
      const parts = parsed.pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (e) {
      return urlOrPath;
    }
  }
  return urlOrPath;
};

const isStorageUrl = (url: string, bucket = 'projects'): boolean => {
  if (!url) return false;
  return url.includes(`/object/public/${bucket}/`) || url.includes(`/object/sign/${bucket}/`);
};

export const StorageService = {
  // Initialization
  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Session initialization error:', error);
      return null;
    }
  },

  // --- FILE UPLOAD LOGIC ---
  uploadFile: async (file: File, bucket: string): Promise<string> => {
    const bucketName = bucket.toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Upload failed for bucket ${bucketName}:`, uploadError);
      throw new Error(`Upload failed: ${uploadError.message || 'Check storage permissions'}`);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  },

  signProjectUrls: async (projects: Project[]): Promise<Project[]> => {
    if (!projects || projects.length === 0) return [];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let isAdmin = false;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.role === 'Admin') {
          isAdmin = true;
        }
      }

      const briefsToSign: { index: number; filePath: string; expiry: number }[] = [];
      const docsToSign: { projectIndex: number; docIndex: number; filePath: string }[] = [];
      const imagesToSign: { projectIndex: number; partIndex: number; filePath: string }[] = [];
      
      const mutableProjects = JSON.parse(JSON.stringify(projects)) as Project[];
      const projectImageParts: { [projectIndex: number]: string[] } = {};

      for (let pIdx = 0; pIdx < mutableProjects.length; pIdx++) {
        const proj = mutableProjects[pIdx];
        const isOwnerOrAdmin = isAdmin || (userId && proj.owner_id === userId);

        if (proj.image_url) {
          const parts = proj.image_url.split('|');
          projectImageParts[pIdx] = parts;
          parts.forEach((part, partIdx) => {
            if (isStorageUrl(part, 'projects')) {
              const filePath = getStorageFilePath(part, 'projects');
              if (filePath) {
                imagesToSign.push({ projectIndex: pIdx, partIndex: partIdx, filePath });
              }
            }
          });
        }

        if (proj.technical_details_url) {
          let canAccessBrief = isOwnerOrAdmin;
          let remainingSeconds = 3600;

          if (!canAccessBrief && userId) {
            // Check if they have an approved and active secure reveal
            const { approved, remainingMinutes } = await StorageService.getRevealApprovalDetails(userId, proj.id);
            if (approved) {
              canAccessBrief = true;
              remainingSeconds = remainingMinutes * 60;
            }
          }

          if (canAccessBrief) {
            const filePath = getStorageFilePath(proj.technical_details_url);
            if (filePath) {
              briefsToSign.push({ index: pIdx, filePath, expiry: remainingSeconds });
            }
          } else {
            // Keep the property so the UI renders the locked brief box,
            // but set it to a placeholder/non-downloadable value so they cannot direct-download
            proj.technical_details_url = "locked";
          }
        }
        
        // Supporting documents: ONLY visible/accessible for owner or admins!
        if (isOwnerOrAdmin && Array.isArray(proj.requested_documents)) {
          proj.requested_documents.forEach((doc, dIdx) => {
            if (doc.url) {
              const filePath = getStorageFilePath(doc.url);
              if (filePath) {
                docsToSign.push({ projectIndex: pIdx, docIndex: dIdx, filePath });
              }
            }
          });
        } else {
          proj.requested_documents = undefined;
        }
      }
      
      const briefPromises = briefsToSign.map(async (item) => {
        try {
          const { data, error } = await supabase.storage
            .from('projects')
            .createSignedUrl(item.filePath, item.expiry);
          if (!error && data?.signedUrl) {
            return { index: item.index, signedUrl: data.signedUrl };
          }
        } catch (e) {
          console.warn(`Failed to sign brief filePath "${item.filePath}":`, e);
        }
        return { index: item.index, signedUrl: null };
      });
      
      const docPromises = docsToSign.map(async (item) => {
        try {
          const { data, error } = await supabase.storage
            .from('projects')
            .createSignedUrl(item.filePath, 3600);
          if (!error && data?.signedUrl) {
            return { projectIndex: item.projectIndex, docIndex: item.docIndex, signedUrl: data.signedUrl };
          }
        } catch (e) {
          console.warn(`Failed to sign doc filePath "${item.filePath}":`, e);
        }
        return { projectIndex: item.projectIndex, docIndex: item.docIndex, signedUrl: null };
      });

      const imagePromises = imagesToSign.map(async (item) => {
        try {
          const { data, error } = await supabase.storage
            .from('projects')
            .createSignedUrl(item.filePath, 3600);
          if (!error && data?.signedUrl) {
            return { projectIndex: item.projectIndex, partIndex: item.partIndex, signedUrl: data.signedUrl };
          }
        } catch (e) {
          console.warn(`Failed to sign image filePath "${item.filePath}":`, e);
        }
        return { projectIndex: item.projectIndex, partIndex: item.partIndex, signedUrl: null };
      });
      
      const [signedBriefs, signedDocs, signedImages] = await Promise.all([
        Promise.all(briefPromises),
        Promise.all(docPromises),
        Promise.all(imagePromises)
      ]);
      
      signedBriefs.forEach(item => {
        if (item.signedUrl) {
          mutableProjects[item.index].technical_details_url = item.signedUrl;
        }
      });
      
      signedDocs.forEach(item => {
        const doc = mutableProjects[item.projectIndex]?.requested_documents?.[item.docIndex];
        if (item.signedUrl && doc) {
          doc.url = item.signedUrl;
        }
      });

      signedImages.forEach(item => {
        if (item.signedUrl && projectImageParts[item.projectIndex]) {
          projectImageParts[item.projectIndex][item.partIndex] = item.signedUrl;
        }
      });

      Object.keys(projectImageParts).forEach(pIdxStr => {
        const pIdx = parseInt(pIdxStr, 10);
        if (mutableProjects[pIdx]) {
          mutableProjects[pIdx].image_url = projectImageParts[pIdx].join('|');
        }
      });
      
      return mutableProjects;
    } catch (err) {
      console.warn("Error in signProjectUrls, returning unmodified projects:", err);
      return projects;
    }
  },

  // Projects CRUD
  getProjects: async (): Promise<Project[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) return [];
      if (!data) return [];

      let isAdmin = false;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.role === 'Admin') {
          isAdmin = true;
        }
      }

      // 1. Remove client-side privacy-filtering (which was based on visibility) to match 
      // strict database Row Level Security (RLS). 
      // 2. Clear out sensitive details (internal notes, requested docs list) for non-owners/non-admins
      // to ensure they are never publicly queryable/accessible if selected.
      const sanitizedAndFiltered = data.filter((p: Project) => {
        if (isAdmin) return true;
        if (userId && p.owner_id === userId) return true;
        
        // A project MUST be Approved or Published by an admin before showing to other users or the public!
        const isApprovedOrPublished = p.disclosure_status === 'Approved' || p.disclosure_status === 'Published';
        if (!isApprovedOrPublished) return false;

        // If it is approved or published, respect its visibility setting
        if (p.visibility === 'Public') return true;
        if (p.visibility === 'Internal' && userId) return true;

        return false;
      }).map((p: Project) => {
        const isOwnerOrAdmin = isAdmin || (userId && p.owner_id === userId);
        if (!isOwnerOrAdmin) {
          return {
            ...p,
            internal_notes: undefined,
            requested_documents: undefined,
            disclosure_timeline: undefined,
            ai_verification: undefined
          };
        }
        return p;
      });

      // Fetch owner profile metadata for researcher search filtering
      const ownerIds = Array.from(new Set(sanitizedAndFiltered.map((p: Project) => p.owner_id).filter((id): id is string => Boolean(id))));
      let profileMap: Record<string, any> = {};
      
      if (ownerIds.length > 0) {
        try {
          const { data: ownerProfiles } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url, department, company')
            .in('id', ownerIds);
            
          if (ownerProfiles) {
            ownerProfiles.forEach((prof: any) => {
              profileMap[prof.id] = prof;
            });
          }
        } catch (err) {
          console.warn("Error fetching project owner profiles:", err);
        }
      }

      const projectsWithOwners = sanitizedAndFiltered.map((p: Project) => {
        if (p.owner_id && profileMap[p.owner_id]) {
          const prof = profileMap[p.owner_id];
          return {
            ...p,
            owner_name: prof.name || 'University Researcher',
            owner_email: prof.email || '',
            owner_avatar: prof.avatar_url || '',
            owner_department: prof.department || p.department || '',
            owner_company: prof.company || ''
          };
        }
        return {
          ...p,
          owner_name: p.owner_name || 'University Researcher'
        };
      });

      return await StorageService.signProjectUrls(projectsWithOwners);
    } catch (e) {
      return [];
    }
  },

  getMyProjects: async (userId: string): Promise<Project[]> => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];

      // Since these are already the user's projects (or the user is the owner),
      // we don't need to strip owner properties, but we DO need to generate
      // signed URLs for the technical brief & requested documents.
      return await StorageService.signProjectUrls(data);
    } catch (e) {
      return [];
    }
  },

  getSignedTechnicalBrief: async (projectId: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Authentication required to access technical brief.");

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('owner_id, technical_details_url')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      throw new Error("Project not found.");
    }

    let isAuthorized = project.owner_id === userId;
    if (!isAuthorized) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.role === 'Admin') {
        isAuthorized = true;
      }
    }

    let expirySeconds = 3600; // def 1 hour

    if (!isAuthorized) {
      const { approved, remainingMinutes } = await StorageService.getRevealApprovalDetails(userId, projectId);
      if (approved) {
        isAuthorized = true;
        expirySeconds = remainingMinutes * 60;
      }
    }

    if (!isAuthorized) {
      throw new Error("Access denied. A secure reveal approval is required to view this technical brief.");
    }

    if (!project.technical_details_url || project.technical_details_url === 'locked') {
      // Fetch raw technical details url bypassing cached sign mapping if any
      const { data: rawProj } = await supabase
        .from('projects')
        .select('technical_details_url')
        .eq('id', projectId)
        .single();
      project.technical_details_url = rawProj?.technical_details_url;
    }

    if (!project.technical_details_url || project.technical_details_url === 'locked') {
      throw new Error("No technical brief exists for this project.");
    }

    const filePath = getStorageFilePath(project.technical_details_url);
    if (!filePath) {
      throw new Error("Invalid technical brief path.");
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from('projects')
      .createSignedUrl(filePath, expirySeconds);

    if (signError || !signedData?.signedUrl) {
      throw new Error("Failed to generate secure signed URL: " + (signError?.message || "unknown storage error"));
    }

    return signedData.signedUrl;
  },

  getPublicResearcherProjects: async (researcherId: string): Promise<Project[]> => {
    if (!researcherId) return [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      let isAdmin = false;
      if (currentUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUserId)
          .maybeSingle();
        if (profile?.role === 'Admin') {
          isAdmin = true;
        }
      }

      // Fetch researcher's projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', researcherId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      const filtered = data.filter((p: Project) => {
        if (isAdmin) return true;
        if (currentUserId && p.owner_id === currentUserId) return true;

        // A project MUST be Approved or Published by an admin before showing to other users or the public!
        const isApprovedOrPublished = p.disclosure_status === 'Approved' || p.disclosure_status === 'Published';
        if (!isApprovedOrPublished) return false;

        if (p.visibility === 'Public') return true;
        if (p.visibility === 'Internal' && currentUserId) return true;

        return false;
      });

      // Secure: sanitize and strip sensitive information (internal notes, requested docs, etc)
      const sanitized = filtered.map((p: Project) => {
        return {
          ...p,
          internal_notes: undefined,
          requested_documents: undefined,
          disclosure_timeline: undefined,
          ai_verification: undefined
        };
      });

      // Return researcher's public disclosures (they won't get briefs signed by default here,
      // they must use approved reveal dynamically in ProjectDetail page via the secure 1-hour window)
      return await StorageService.signProjectUrls(sanitized);
    } catch (e) {
      console.error("Failed to retrieve researcher public projects:", e);
      return [];
    }
  },

  getTrendingProjects: async (): Promise<Project[]> => {
    try {
      const projects = await StorageService.getProjects();
      const { data: eois } = await supabase.from('eois').select('project_id');
      
      if (!projects || projects.length === 0) return [];

      return projects.map(p => {
        const inquiryCount = eois?.filter(e => e.project_id === p.id).length || 0;
        return { ...p, trendScore: inquiryCount * 10 + Math.floor(Math.random() * 50) };
      }).sort((a: any, b: any) => b.trendScore - a.trendScore).slice(0, 5);
    } catch (e) {
      return [];
    }
  },

  saveProject: async (project: Partial<Project>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId && !project.id) throw new Error("Authentication required.");

    let payload: any = {
      title: project.title,
      description: project.description,
      department: project.department,
      status: project.status,
      visibility: (((project.visibility as any) === 'Private' ? 'Internal' : project.visibility) as any) || (project.id ? undefined : 'Internal'),
      trl: project.trl,
      research_area: project.research_area,
      image_url: project.image_url,
      budget: project.budget,
      start_date: project.start_date,
      owner_id: project.owner_id || currentUserId,
      funding_amount_usd: project.funding_amount_usd,
      open_to_collaboration: project.open_to_collaboration,
      technical_details_url: project.technical_details_url,
      achievements: project.achievements,
      needs: project.needs,
      views: project.views || 0,
      expressions_of_interest: project.expressions_of_interest || 0,
      requests: project.requests || 0,
      embedding: project.embedding,
      
      // Disclosure Workflow Columns
      disclosure_status: project.disclosure_status || (project.id ? undefined : 'Submitted'),
      internal_notes: project.internal_notes,
      requested_documents: project.requested_documents || (project.id ? undefined : []),
      disclosure_timeline: project.disclosure_timeline || (project.id ? undefined : [
        { event: 'Submission', user_name: 'Author', timestamp: new Date().toISOString(), details: 'Initial research disclosure submitted.' }
      ]),
      ai_verification: project.ai_verification || (project.id ? undefined : {})
    };

    // Auto-generate embedding if not present and we have enough data
    if (!payload.embedding && payload.title && payload.description) {
      try {
        const textToEmbed = `${payload.title} ${payload.description} ${payload.research_area || ''} ${payload.department || ''}`;
        const generatedEmbed = await EmbeddingService.getEmbedding(textToEmbed);
        if (generatedEmbed && generatedEmbed.length > 0) {
          payload.embedding = generatedEmbed;
        }
        // else: leave embedding unset (stored as NULL) — never fabricate a fake vector.
      } catch (err) {
        console.warn("Project embedding failed during save:", err);
      }
    }

    let attempt = 0;
    const maxAttempts = 12;

    while (attempt < maxAttempts) {
      try {
        if (project.id) {
          // Security Check: Get existing project owner_id
          const { data: existingProject } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', project.id)
            .maybeSingle();
            
          if (!existingProject) throw new Error("Project not found.");
          
          let isAdmin = false;
          if (currentUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUserId)
              .maybeSingle();
            if (profile?.role === 'Admin') {
              isAdmin = true;
            }
          }

          if (existingProject.owner_id !== currentUserId && !isAdmin) {
            throw new Error("Unauthorized. You do not have permission to modify this project.");
          }

          const { data, error } = await supabase
            .from('projects')
            .update(payload)
            .eq('id', project.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          const { data, error } = await supabase
            .from('projects')
            .insert([payload])
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      } catch (err: any) {
        attempt++;
        const errorMsg = (err?.message || "").toLowerCase();
        const errorDetails = (err?.details || "").toLowerCase();
        const fullErrorInfo = `${errorMsg} ${errorDetails}`;
        
        const isColumnOrSchemaError = 
          err?.code === 'PGRST204' || 
          fullErrorInfo.includes('column') || 
          fullErrorInfo.includes('cache') || 
          fullErrorInfo.includes('does not exist') ||
          fullErrorInfo.includes('not found') || 
          fullErrorInfo.includes('not exist');

        if (isColumnOrSchemaError && attempt < maxAttempts) {
          let columnRemoved = false;
          
          // Try to extract column name from error message/details (e.g. "Could not find the 'disclosure_status' column...")
          const quotedMatches = fullErrorInfo.match(/['"`]([a-z0-9_]+)['"`]/g);
          if (quotedMatches) {
            for (const match of quotedMatches) {
              const colName = match.replace(/['"`]/g, '');
              if (payload[colName] !== undefined) {
                console.warn(`[Autocorrect] Removing missing column '${colName}' from payload and retrying...`);
                delete payload[colName];
                columnRemoved = true;
              }
            }
          }

          // Fallback check against known custom or newer columns
          if (!columnRemoved) {
            const potentialNewColumns = [
              'disclosure_status', 'internal_notes', 'requested_documents', 
              'disclosure_timeline', 'ai_verification', 'owner_id', 
              'funding_amount_usd', 'open_to_collaboration', 'technical_details_url',
              'embedding', 'achievements', 'needs', 'views', 
              'expressions_of_interest', 'requests'
            ];
            for (const colName of potentialNewColumns) {
              if (payload[colName] !== undefined && fullErrorInfo.includes(colName)) {
                console.warn(`[Autocorrect] Removing missing column '${colName}' from payload and retrying...`);
                delete payload[colName];
                columnRemoved = true;
                break;
              }
            }
          }

          // Last-resort fallback to absolutely basic columns
          if (!columnRemoved) {
            console.warn("[Autocorrect] Schema mismatch detected, dropping to core columns.");
            const coreFields = [
              'title', 'description', 'department', 'status', 'visibility', 'trl', 'research_area', 'image_url', 'budget', 'start_date'
            ];
            const newPayload: any = {};
            for (const key of coreFields) {
              if (payload[key] !== undefined) {
                newPayload[key] = payload[key];
              }
            }
            if (payload.owner_id !== undefined && !fullErrorInfo.includes('owner_id')) {
              newPayload.owner_id = payload.owner_id;
            }
            payload = newPayload;
          }
        } else {
          console.error("Supabase Save Project Error:", err);
          throw err;
        }
      }
    }
  },

  deleteProject: async (projectId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    if (!currentUserId) throw new Error("Authentication required.");

    // Security Check: Verify owner or Admin role
    const { data: existingProject } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle();
      
    if (!existingProject) throw new Error("Project not found.");

    let isAdmin = false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .maybeSingle();
    if (profile?.role === 'Admin') {
      isAdmin = true;
    }

    if (existingProject.owner_id !== currentUserId && !isAdmin) {
      throw new Error("Unauthorized. You do not have permission to withdraw this project.");
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    return true;
  },

  // Bookmarks
  toggleBookmark: async (userId: string, projectId: string): Promise<boolean> => {
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) {
      await supabase.from('bookmarks').delete().eq('id', existing.id);
      return false; 
    } else {
      await supabase.from('bookmarks').insert([{ user_id: userId, project_id: projectId }]);
      return true; 
    }
  },

  isBookmarked: async (userId: string, projectId: string): Promise<boolean> => {
    if (!userId) return false;
    const { data } = await supabase.from('bookmarks').select('id').eq('user_id', userId).eq('project_id', projectId).maybeSingle();
    return !!data;
  },

  getBookmarks: async (userId: string): Promise<Project[]> => {
    if (!userId) return [];
    
    try {
      const { data } = await supabase.from('bookmarks').select('projects(*)').eq('user_id', userId);
      const projects = data?.map(item => (item as any).projects).filter(p => !!p) || [];
      
      if (projects.length === 0) return [];

      let isAdmin = false;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.role === 'Admin') {
        isAdmin = true;
      }

      // Stripping of sensitive items for public/unauthorized bookmark queries
      const sanitized = projects.map((p: Project) => {
        const isOwnerOrAdmin = isAdmin || (p.owner_id === userId);
        if (!isOwnerOrAdmin) {
          return {
            ...p,
            internal_notes: undefined,
            requested_documents: undefined,
            disclosure_timeline: undefined,
            ai_verification: undefined
          };
        }
        return p;
      });

      return await StorageService.signProjectUrls(sanitized);
    } catch (err) {
      console.warn("Failed to retrieve secured bookmarks:", err);
      return [];
    }
  },

  // News
  signNewsUrls: async (news: NewsItem[]): Promise<NewsItem[]> => {
    if (!news || news.length === 0) return [];
    
    try {
      const mutableNews = JSON.parse(JSON.stringify(news)) as NewsItem[];

      for (let idx = 0; idx < mutableNews.length; idx++) {
        const item = mutableNews[idx];
        if (item.image_url && isStorageUrl(item.image_url, 'projects')) {
          const filePath = getStorageFilePath(item.image_url, 'projects');
          if (filePath) {
            // Since we configured public.can_access_project_file to allow public access to news images,
            // we retrieve a stable, non-expiring public URL. This prevents constant browser re-fetching 
            // and image container flickering/blinking.
            const { data } = supabase.storage.from('projects').getPublicUrl(filePath);
            if (data?.publicUrl) {
              item.image_url = data.publicUrl;
            }
          }
        }
      }

      return mutableNews;
    } catch (err) {
      console.warn("Failed to stabilize news URLs:", err);
      return news;
    }
  },

  getSignedUrl: async (urlOrPath: string, bucket = 'projects', expiry = 3600): Promise<string> => {
    if (!urlOrPath) return '';
    try {
      const filePath = getStorageFilePath(urlOrPath, bucket);
      if (!filePath) return urlOrPath;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiry);
      if (error || !data?.signedUrl) {
        return urlOrPath;
      }
      return data.signedUrl;
    } catch {
      return urlOrPath;
    }
  },

  getNews: async (
    includeDrafts: boolean = false,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
    }
  ): Promise<NewsItem[]> => {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const search = options?.search ?? '';
    const category = options?.category ?? '';

    const fromRange = (page - 1) * limit;
    const toRange = fromRange + limit - 1;

    try {
      // 1. Specific field selection rather than '*'
      const selectFields = 'id, title, category, published_at, image_url, summary, external_url, is_ai_generated, source_name, status, reference_links, tags, relevance_score, source_verification_notes';
      let query = supabase.from('news').select(selectFields);

      // 2. Draft filtering using status + published_at index
      if (!includeDrafts) {
        query = query.eq('status', 'Published');
      }

      // 3. Category filtering using category index
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      // 4. Server-side Full-Text Search using 'fts_doc' index
      if (search && search.trim() !== '') {
        const sanitizedSearch = search.trim().split(/\s+/).filter(Boolean).map(word => `${word}:*`).join(' & ');
        if (sanitizedSearch) {
          query = query.textSearch('fts_doc', sanitizedSearch);
        }
      }

      // 5. Paginated ordering & range selection
      const { data, error } = await query
        .order('published_at', { ascending: false })
        .range(fromRange, toRange);

      if (error) {
        // Keep fallback basic query, but log the failed filter parameters.
        console.warn("getNews filtered query failed, falling back to basic query. Failed parameters:", {
          includeDrafts,
          page,
          limit,
          search,
          category,
          error
        });
        const { data: basicData } = await supabase
          .from('news')
          .select('id, title, category, published_at, image_url, summary')
          .order('published_at', { ascending: false })
          .range(0, 19);
        return await StorageService.signNewsUrls((basicData || []) as NewsItem[]);
      }
      return await StorageService.signNewsUrls((data || []) as NewsItem[]);
    } catch (err) {
      console.error("Failed to retrieve news:", err, { includeDrafts, page, limit, search, category });
      // Last resort fallback
      try {
        const { data } = await supabase
          .from('news')
          .select('id, title, category, published_at, image_url, summary')
          .limit(20);
        return await StorageService.signNewsUrls((data || []) as NewsItem[]);
      } catch (innerErr) {
        return [];
      }
    }
  },

  // Expression of Interest (EOI) / Messaging System (Full Duplex)
  submitEOI: async (project_id: string | null, user_name: string, message: string, recipient_id?: string, metric: 'expressions_of_interest' | 'requests' = 'expressions_of_interest') => {
    const { data: { session } } = await supabase.auth.getSession();
    const sender_id = session?.user?.id;
    
    if (!sender_id) {
      throw new Error("Authentication Required: Please sign in to transmit messages.");
    }

    let finalUserName = user_name;
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sender_id)
      .maybeSingle();
    
    if (senderProfile?.role === 'Admin') {
      finalUserName = 'UG Industry Hub Admin';
    }

    let target_recipient = recipient_id;
    let validProjectId: string | null = null;

    // Resolve project owner as recipient if not provided, and ensure project_id exists in public.projects
    if (project_id) {
      const { data: proj } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', project_id)
        .maybeSingle();

      if (proj) {
        validProjectId = proj.id;
        if (!target_recipient) {
          target_recipient = proj.owner_id;
        }
      } else if (!target_recipient) {
        throw new Error("Recipient Error: Could not resolve Project Investigator.");
      }
    }

    if (!target_recipient) {
      throw new Error("Recipient Error: No target identified for this transmission.");
    }

    const { error } = await supabase
      .from('eois')
      .insert([{ 
        project_id: validProjectId, 
        user_name: finalUserName, 
        message,
        read: false,
        sender_id: sender_id,
        recipient_id: target_recipient,
        status: 'pending'
      }]);
    
    if (error) {
      console.error("StorageService.submitEOI Failure:", error);
      throw new Error(error.message || "Database Error: Transmission failed.");
    }

    // Increment specified metric if validProjectId is present
    if (validProjectId) {
      StorageService.incrementProjectMetric(validProjectId, metric);
    }
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    if (!userId) return 0;
    const { count, error } = await supabase
      .from('eois')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);
    
    if (error) return 0;
    return count || 0;
  },

  searchUsers: async (query: string): Promise<User[]> => {
    if (!query || query.length < 2) return [];
    
    // Ensure the user searching is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, avatar_url, company, department')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5);
    
    if (error) {
      console.warn("error searching users: ", error);
      return [];
    }
    return (data || []) as User[];
  },

  getConversations: async (userId: string) => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('eois')
      .select('*, projects(title, image_url)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];

    // Map profiles to replace any admin's user_name with 'UG Industry Hub Admin'
    const userIds = Array.from(new Set(data.flatMap(msg => [msg.sender_id, msg.recipient_id])));
    const adminUserIds = new Set<string>();

    if (userIds.length > 0) {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', userIds);
      
      if (!pError && profiles) {
        profiles.forEach(p => {
          if (p.role === 'Admin') {
            adminUserIds.add(p.id);
          }
        });
      }
    }

    const threads: Record<string, any[]> = {};
    for (const msg of data) {
      if (adminUserIds.has(msg.sender_id)) {
        msg.user_name = 'UG Industry Hub Admin';
      }
      msg.raw_message = msg.message; // preserve encrypted envelope for crypto audit
      msg.message = await decryptMessage(msg.message);
      
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      const threadKey = `${msg.project_id || 'direct'}-${partnerId}`;
      if (!threads[threadKey]) threads[threadKey] = [];
      threads[threadKey].push(msg);
    }
    
    return Object.values(threads);
  },

  markAsRead: async (userId: string, threadId: string | null, partnerId: string) => {
    if (!userId) return;
    const query = supabase
      .from('eois')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false)
      .eq('sender_id', partnerId);
    
    if (threadId) {
      query.eq('project_id', threadId);
    } else {
      query.is('project_id', null);
    }

    await query;
  },

  getEOIsForPI: async (userId: string) => {
    if (!userId) return [];
    try {
      const { data: myProjects } = await supabase.from('projects').select('id').eq('owner_id', userId);
      const projectIds = myProjects?.map(p => p.id) || [];
      let query = supabase.from('eois').select('*, projects(title, image_url)').order('created_at', { ascending: false });
      if (projectIds.length > 0) {
        const projectList = projectIds.join(',');
        query = query.or(`project_id.in.(${projectList}),recipient_id.eq.${userId}`);
      } else {
        query = query.eq('recipient_id', userId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("Error fetching EOIs with projects join, falling back to basic query:", error);
        let fallbackQuery = supabase.from('eois').select('*').order('created_at', { ascending: false });
        if (projectIds.length > 0) {
          fallbackQuery = fallbackQuery.or(`project_id.in.(${projectIds.join(',')}),recipient_id.eq.${userId}`);
        } else {
          fallbackQuery = fallbackQuery.eq('recipient_id', userId);
        }
        const { data: fbData } = await fallbackQuery;
        if (!fbData) return [];
        return fbData;
      }
      if (!data) return [];

    const userIds = Array.from(new Set(data.flatMap(msg => [msg.sender_id, msg.recipient_id])));
    const adminUserIds = new Set<string>();

    if (userIds.length > 0) {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', userIds);
      
      if (!pError && profiles) {
        profiles.forEach(p => {
          if (p.role === 'Admin') {
            adminUserIds.add(p.id);
          }
        });
      }
    }

    for (const msg of data) {
      if (adminUserIds.has(msg.sender_id)) {
        msg.user_name = 'UG Industry Hub Admin';
      }
      msg.raw_message = msg.message;
      msg.message = await decryptMessage(msg.message);
    }

    return data;
    } catch (e) {
      console.error("Error in getEOIsForPI:", e);
      return [];
    }
  },

  markEOIRead: async (id: string) => {
    const { error } = await supabase.from('eois').update({ read: true }).eq('id', id);
    if (error) throw error;
  },

  updateEOIStatus: async (id: string, status: string) => {
    const { error } = await supabase.from('eois').update({ status }).eq('id', id);
    if (error) throw error;
  },

  checkRevealApproved: async (userId: string, projectId: string): Promise<boolean> => {
    if (!userId || !projectId) return false;
    const { data, error } = await supabase
      .from('eois')
      .select('status')
      .eq('sender_id', userId)
      .eq('project_id', projectId);
    
    if (error || !data || data.length === 0) return false;
    
    return data.some(row => {
      if (row.status === 'released') return true;
      if (row.status && row.status.startsWith('released:')) {
        const approvedAt = parseInt(row.status.split(':')[1], 10);
        const oneHourMs = 60 * 60 * 1000;
        return Date.now() - approvedAt < oneHourMs;
      }
      return false;
    });
  },

  getRevealApprovalDetails: async (userId: string, projectId: string) => {
    if (!userId || !projectId) return { approved: false, remainingMinutes: 0 };
    const { data, error } = await supabase
      .from('eois')
      .select('status')
      .eq('sender_id', userId)
      .eq('project_id', projectId);
    
    if (error || !data || data.length === 0) return { approved: false, remainingMinutes: 0 };
    
    let approved = false;
    let remainingMinutes = 0;
    
    data.forEach(row => {
      if (row.status === 'released') {
        approved = true;
        remainingMinutes = 60; // legacy default
      } else if (row.status && row.status.startsWith('released:')) {
        const approvedAt = parseInt(row.status.split(':')[1], 10);
        const oneHourMs = 60 * 60 * 1000;
        const elapsed = Date.now() - approvedAt;
        if (elapsed < oneHourMs) {
          approved = true;
          remainingMinutes = Math.ceil((oneHourMs - elapsed) / (60 * 1000));
        }
      }
    });
    
    return { approved, remainingMinutes };
  },

  // Profiles
  getProfile: async (userId: string) => {
    if (!userId) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!profile) return null;

    try {
      if (profile.role === 'Student') {
        const { data: student } = await supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (student) {
          Object.assign(profile, {
            education_level: student.education_level,
            availability: student.availability,
            looking_for: student.looking_for,
            program: student.program
          });
        }
      } else if (profile.role === 'Researcher') {
        const { data: researcher } = await supabase.from('researcher_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (researcher) {
          Object.assign(profile, {
            research_stage: researcher.research_stage,
            funding_needed: researcher.funding_needed,
            needs_students: researcher.needs_students
          });
        }
      } else if (profile.role === 'Investor') {
        const { data: investor } = await supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (investor) {
          Object.assign(profile, {
            funding_range: investor.funding_range,
            investment_focus: investor.investment_focus
          });
        }
      } else if (profile.role === 'Industry/Partner' || profile.role === 'IndustryPartner') {
        const { data: industry } = await supabase.from('industry_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (industry) {
          Object.assign(profile, {
            sector: industry.sector,
            collaboration_type: industry.collaboration_type
          });
        }
      }
    } catch (err) {
      console.warn("Error fetching role-specific profile data:", err);
    }

    return profile;
  },

  testConnection: async () => {
    try {
      const { error } = await supabase.from('news').select('id').limit(1);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase Connection Test Failed:', error);
      return false;
    }
  },

  updateProfile: async (profile: Partial<User & { embedding?: number[], semantic_summary?: string, answers?: any }>) => {
    if (!profile.id) throw new Error("Profile ID is required for update.");
    
    // Security check: Ensure current user possesses ownership over this record, or holds an Administrative role
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    if (!currentUserId) throw new Error("Authentication required.");

    // Retrieve active profile structure
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile.id)
      .maybeSingle();

    let isAdmin = false;
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .maybeSingle();
    if (currentUserProfile?.role === 'Admin') {
      isAdmin = true;
    }

    if (profile.id !== currentUserId && !isAdmin) {
      throw new Error("Unauthorized: Profile mutation request is invalid.");
    }

    let result;
    const { answers, ...mainProfile } = profile as any;
    
    // Safety check: Ensure embedding is exactly 768 dimensions using central helper
    if (mainProfile.embedding && Array.isArray(mainProfile.embedding)) {
      mainProfile.embedding = EmbeddingService.ensureDimension(mainProfile.embedding, 768);
    }

    try {
      if (existing) {
        result = await supabase
          .from('profiles')
          .update(mainProfile)
          .eq('id', profile.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert([mainProfile]);
      }

      if (result.error) {
        throw result.error;
      }
    } catch (err: any) {
      // If it's a schema/cache column error, fall back to core columns only
      const errorStr = (err?.message || "").toLowerCase();
      const isColumnError = err?.code === 'PGRST204' || errorStr.includes('column') || errorStr.includes('cache');
      
      if (isColumnError) {
        console.warn("Schema mismatch detected, falling back to core profiles columns:", err);
        const coreProfile = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role
        };
        
        if (existing) {
          result = await supabase
            .from('profiles')
            .update(coreProfile)
            .eq('id', profile.id);
        } else {
          result = await supabase
            .from('profiles')
            .insert([coreProfile]);
        }
        
        if (result.error) {
          console.error("Supabase Profile Fallback Update Error:", result.error);
          throw result.error;
        }
      } else {
        console.error("Supabase Profile Update Error:", err);
        throw err;
      }
    }

    // Sync to Role Specific Tables
    if (answers && profile.role) {
      if (profile.role === UserRole.Student) {
        await supabase.from('student_profiles').upsert({
          user_id: profile.id,
          education_level: answers.edu_level,
          availability: answers.availability,
          looking_for: Array.isArray(answers.looking_for) ? answers.looking_for.join(', ') : answers.looking_for,
          program: answers.program
        });
      } else if (profile.role === UserRole.Researcher) {
        await supabase.from('researcher_profiles').upsert({
          user_id: profile.id,
          research_stage: answers.research_stage,
          funding_needed: answers.funding_needed,
          needs_students: answers.needs_students
        });
      } else if (profile.role === UserRole.Investor) {
        await supabase.from('investor_profiles').upsert({
          user_id: profile.id,
          funding_range: answers.funding_range,
          investment_focus: answers.investment_focus
        });
      } else if (profile.role === UserRole.IndustryPartner) {
        await supabase.from('industry_profiles').upsert({
          user_id: profile.id,
          sector: answers.sector,
          collaboration_type: answers.collab_type
        });
      }
    }
  },

  getMatches: async (userId: string, embedding: number[]) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
    if (!userId || !isUuid || !embedding) return { profiles: [], projects: [] };

    const validEmbedding = EmbeddingService.ensureDimension(embedding, 768);

    try {
      const [{ data: profiles, error: profErr }, { data: projects, error: projErr }] = await Promise.all([
        supabase.rpc('match_profiles', {
          query_embedding: validEmbedding,
          match_threshold: 0.0,
          match_count: 20,
          excluded_id: userId
        }),
        supabase.rpc('match_projects', {
          query_embedding: validEmbedding,
          match_threshold: 0.0,
          match_count: 20
        })
      ]);

      if (profErr) console.warn("match_profiles RPC warning/error:", profErr);
      if (projErr) console.warn("match_projects RPC warning/error:", projErr);

      let finalProfiles = profiles || [];
      let finalProjects = projects || [];

      // Fallback 1: If no vector-matched profiles are returned (e.g. similarity is NULL due to zero-vectors or NULL embeddings), fetch other users directly.
      if (finalProfiles.length === 0) {
        console.log("No vector-matched profiles found. Fetching other active researchers from DB directly for fallback.");
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, name, role, ai_profile, semantic_summary, avatar_url')
          .neq('id', userId)
          .limit(10);

        if (fallbackProfiles && fallbackProfiles.length > 0) {
          finalProfiles = fallbackProfiles.map(p => ({
            id: p.id,
            name: p.name,
            role: p.role || 'Researcher',
            ai_profile: p.ai_profile,
            semantic_summary: p.semantic_summary || 'Digital identity registered in University of Ghana Ecosystem.',
            similarity: 0.82, // Warm baseline similarity for fallback matching
            avatar_url: p.avatar_url
          }));
        }
      }

      // Fallback 2: If no vector-matched projects are returned, fetch the latest projects directly.
      if (finalProjects.length === 0) {
        console.log("No vector-matched projects found. Fetching active disclosures from DB directly for fallback.");
        const { data: fallbackProjects } = await supabase
          .from('projects')
          .select('id, title, description, image_url, research_area')
          .limit(10);

        if (fallbackProjects && fallbackProjects.length > 0) {
          finalProjects = fallbackProjects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image_url: p.image_url,
            research_area: p.research_area || 'General Research',
            similarity: 0.80 // Warm baseline similarity for fallback projects
          }));
        }
      }

      // Enrich profiles with avatar_url
      if (finalProfiles.length > 0) {
        try {
          const profileIds = finalProfiles.map((p: any) => p.id);
          const { data: enrichedData, error: enrichError } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', profileIds);
          
          if (!enrichError && enrichedData && enrichedData.length > 0) {
            const avatarMap = new Map(enrichedData.map(row => [row.id, row.avatar_url]));
            finalProfiles = finalProfiles.map((p: any) => ({
              ...p,
              avatar_url: avatarMap.get(p.id) || p.avatar_url || null
            }));
          }
        } catch (e) {
          console.warn("Could not enrich matched profiles with avatar_urls:", e);
        }
      }

      // Enrich matched projects with owner_id/visibility/disclosure_status.
      // Visibility is enforced server-side by match_projects (SECURITY DEFINER), so no client filtering here.
      if (finalProjects.length > 0) {
        try {
          const projectIds = finalProjects.map((p: any) => p.id);
          const { data: visData } = await supabase
            .from('projects')
            .select('id, visibility, owner_id, disclosure_status')
            .in('id', projectIds);

          if (visData) {
            const visMap = new Map(visData.map(row => [row.id, row]));
            finalProjects = finalProjects.filter((p: any) => {
              const row = visMap.get(p.id);
              if (!row) return false;

              // Enrich matched project object with its owner_id, visibility, and status
              p.owner_id = row.owner_id;
              p.visibility = row.visibility;
              p.disclosure_status = row.disclosure_status;
              return true;
            });
          }
        } catch (visErr) {
          console.warn("Could not enrich match_projects results:", visErr);
          finalProjects = [];
        }
      }

      const signedProjects = await StorageService.signProjectUrls(finalProjects);
      return {
        profiles: finalProfiles,
        projects: signedProjects
      };
    } catch (error) {
      console.error("Matching engine error:", error);
      // Ultimate absolute fallback from catches
      try {
        const [{ data: fallbackProfiles }, { data: fallbackProjects }] = await Promise.all([
          supabase.from('profiles').select('id, name, role, ai_profile, semantic_summary, avatar_url').neq('id', userId).limit(10),
          supabase.from('projects').select('id, title, description, image_url, research_area, visibility, owner_id, disclosure_status').limit(20)
        ]);

        let isAdmin = false;
        if (userId) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
          if (profile?.role === 'Admin') {
            isAdmin = true;
          }
        }

        const secureFallbackProjects = (fallbackProjects || []).filter((p: any) => {
          if (isAdmin) return true;
          if (userId && p.owner_id === userId) return true;

          // A project MUST be Approved or Published by an admin before showing to other users or the public!
          const isApprovedOrPublished = p.disclosure_status === 'Approved' || p.disclosure_status === 'Published';
          if (!isApprovedOrPublished) return false;

          if (p.visibility === 'Public') return true;
          if (userId && p.visibility === 'Internal') return true;
          return false;
         }).slice(0, 10);

        const signedFallbackProjects = await StorageService.signProjectUrls(secureFallbackProjects as any);

        return {
          profiles: (fallbackProfiles || []).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role || 'Collaborator',
            ai_profile: p.ai_profile,
            semantic_summary: p.semantic_summary || 'Profile active in ecosystem.',
            similarity: 0.75,
            avatar_url: p.avatar_url
          })),
          projects: signedFallbackProjects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image_url: p.image_url,
            research_area: p.research_area || 'General Innovation',
            similarity: 0.75,
            owner_id: p.owner_id
          }))
        };
      } catch (dbError) {
        console.error("Critical fallback database query failed:", dbError);
        return { profiles: [], projects: [] };
      }
    }
  },

  logInteraction: async (userId: string, targetId: string, type: 'click' | 'accept' | 'ignore' | 'message') => {
    try {
      await supabase.from('interaction_logs').insert([{
        user_id: userId,
        target_id: targetId,
        interaction_type: type
      }]);
    } catch (err) {
      console.warn("Logging failed:", err);
    }
  },

  incrementProjectMetric: async (projectId: string, metric: 'views' | 'expressions_of_interest' | 'requests') => {
    try {
      // Fetch current value
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(metric)
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;

      const metricRow = data as Record<string, number> | null;
      const currentValue = metricRow?.[metric] || 0;

      // Update with incremented value
      const { error: updateError } = await supabase
        .from('projects')
        .update({ [metric]: currentValue + 1 })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error(`Error incrementing ${metric}:`, error);
    }
  },

  // --- ADMINISTRATIVE PORTAL OPERATIONS ---
  verifyAdmin: async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      return profile?.role === 'Admin';
    } catch (e) {
      return false;
    }
  },

  adminGetAllProfiles: async (): Promise<User[]> => {
    try {
      const isAdmin = await StorageService.verifyAdmin();
      if (!isAdmin) throw new Error("Unauthorized access. Admin privileges required.");

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching admin profiles:', err);
      throw err;
    }
  },

  adminGetAllEOIs: async (): Promise<any[]> => {
    try {
      const isAdmin = await StorageService.verifyAdmin();
      if (!isAdmin) throw new Error("Unauthorized access. Admin privileges required.");

      const { data, error } = await supabase
        .from('eois')
        .select(`
          *,
          projects (
            title
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = data || [];
      for (const msg of list) {
        msg.raw_message = msg.message;
        msg.message = await decryptMessage(msg.message);
      }
      return list;
    } catch (err) {
      console.error('Error fetching admin EOIs:', err);
      throw err;
    }
  },

  adminUpdateProfileRole: async (userId: string, role: UserRole) => {
    try {
      const isAdmin = await StorageService.verifyAdmin();
      if (!isAdmin) throw new Error("Unauthorized access. Admin privileges required.");

      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating profile role:', err);
      throw err;
    }
  },

  adminSaveNewsItem: async (newsItem: Partial<NewsItem>) => {
    try {
      const isAdmin = await StorageService.verifyAdmin();
      if (!isAdmin) throw new Error("Unauthorized access. Admin privileges required.");

      const formattedDate = newsItem.published_at 
        ? (newsItem.published_at.includes('T') ? newsItem.published_at.split('T')[0] : newsItem.published_at) 
        : new Date().toISOString().split('T')[0];

      const payload: any = {
        title: newsItem.title,
        category: newsItem.category,
        summary: newsItem.summary,
        image_url: newsItem.image_url || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop',
        published_at: formattedDate,
        external_url: newsItem.external_url || '',
        is_ai_generated: newsItem.is_ai_generated || false,
        source_name: newsItem.source_name || 'UG ORID Directorates',
        status: newsItem.status || 'Published',
        reference_links: newsItem.reference_links || [],
        tags: newsItem.tags || [],
        relevance_score: newsItem.relevance_score || 0,
        source_verification_notes: newsItem.source_verification_notes || ''
      };

      if (newsItem.id) {
        const { data, error } = await supabase
          .from('news')
          .update(payload)
          .eq('id', newsItem.id)
          .select()
          .single();
        if (error) {
          console.warn("Update news item failed, retrying with core columns:", error.message);
          const corePayload = {
            title: payload.title,
            category: payload.category,
            summary: payload.summary,
            image_url: payload.image_url,
            published_at: payload.published_at,
            external_url: payload.external_url,
            status: payload.status,
            is_ai_generated: payload.is_ai_generated,
            source_name: payload.source_name
          };
          const { data: retryData, error: retryError } = await supabase
            .from('news')
            .update(corePayload)
            .eq('id', newsItem.id)
            .select()
            .single();
          if (retryError) throw retryError;
          return retryData;
        }
        return data;
      } else {
        const { data, error } = await supabase
          .from('news')
          .insert([payload])
          .select()
          .single();
        if (error) {
          console.warn("Insert news item failed, retrying with core columns:", error.message);
          const corePayload = {
            title: payload.title,
            category: payload.category,
            summary: payload.summary,
            image_url: payload.image_url,
            published_at: payload.published_at,
            external_url: payload.external_url,
            status: payload.status,
            is_ai_generated: payload.is_ai_generated,
            source_name: payload.source_name
          };
          const { data: retryData, error: retryError } = await supabase
            .from('news')
            .insert([corePayload])
            .select()
            .single();
          if (retryError) throw retryError;
          return retryData;
        }
        return data;
      }
    } catch (err) {
      console.error('Error saving news item:', err);
      throw err;
    }
  },

  adminDeleteNewsItem: async (newsId: string) => {
    try {
      const isAdmin = await StorageService.verifyAdmin();
      if (!isAdmin) throw new Error("Unauthorized access. Admin privileges required.");

      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting news item:', err);
      throw err;
    }
  },

  getStudentApplications: async (userId: string) => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('eois')
      .select('*, projects(*)')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching student applications:", error);
      return [];
    }
    const list = data || [];
    for (const msg of list) {
      msg.raw_message = msg.message;
      msg.message = await decryptMessage(msg.message);
    }
    return list;
  },

  updateStudentProfile: async (userId: string, data: { education_level: string; availability: string; looking_for: string; program: string }) => {
    const { error } = await supabase.from('student_profiles').upsert({
      user_id: userId,
      education_level: data.education_level,
      availability: data.availability,
      looking_for: data.looking_for,
      program: data.program
    });
    if (error) throw error;
  },

  // --- SAVED SEARCHES & ALERTS ---
  getSavedSearches: async (userId: string): Promise<SavedSearch[]> => {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`saved_searches_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading saved searches:", e);
    }
    return [];
  },

  getAllSavedSearches: async (): Promise<SavedSearch[]> => {
    try {
      const allSearches: SavedSearch[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('saved_searches_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: SavedSearch[] = JSON.parse(raw);
            allSearches.push(...list);
          }
        }
      }
      return allSearches;
    } catch (e) {
      return [];
    }
  },

  saveSearch: async (userId: string, searchData: { query: string; category?: string }): Promise<SavedSearch> => {
    if (!userId) throw new Error("User must be logged in to save search queries.");
    const searches = await StorageService.getSavedSearches(userId);
    
    // Check duplicate
    const existing = searches.find(s => s.query.toLowerCase().trim() === searchData.query.toLowerCase().trim() && (s.category || 'All') === (searchData.category || 'All'));
    if (existing) {
      return existing;
    }

    const newSearch: SavedSearch = {
      id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      query: searchData.query.trim(),
      category: searchData.category || 'All',
      notify_email: true,
      notify_in_app: true,
      created_at: new Date().toISOString()
    };

    const updated = [newSearch, ...searches];
    localStorage.setItem(`saved_searches_${userId}`, JSON.stringify(updated));
    return newSearch;
  },

  deleteSavedSearch: async (userId: string, searchId: string): Promise<void> => {
    if (!userId) return;
    const searches = await StorageService.getSavedSearches(userId);
    const updated = searches.filter(s => s.id !== searchId);
    localStorage.setItem(`saved_searches_${userId}`, JSON.stringify(updated));
  },

  getAlertNotifications: async (userId: string): Promise<AlertNotification[]> => {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`alerts_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading alert notifications:", e);
    }
    return [];
  },

  markAlertAsRead: async (userId: string, alertId: string): Promise<void> => {
    if (!userId) return;
    const alerts = await StorageService.getAlertNotifications(userId);
    const updated = alerts.map(a => a.id === alertId ? { ...a, read: true } : a);
    localStorage.setItem(`alerts_${userId}`, JSON.stringify(updated));
  },

  clearAllAlerts: async (userId: string): Promise<void> => {
    if (!userId) return;
    localStorage.setItem(`alerts_${userId}`, JSON.stringify([]));
  },

  triggerSavedSearchMatchAlerts: async (item: { id: string; title: string; description?: string; summary?: string; category?: string; type: 'project' | 'news' }) => {
    try {
      const allSearches = await StorageService.getAllSavedSearches();
      if (!allSearches.length) return;

      const fullText = `${item.title} ${item.description || ''} ${item.summary || ''} ${item.category || ''}`.toLowerCase();

      for (const s of allSearches) {
        if (!s.query || s.query.trim().length < 2) continue;
        const q = s.query.toLowerCase().trim();

        if (fullText.includes(q)) {
          const existingAlerts = await StorageService.getAlertNotifications(s.user_id);
          if (existingAlerts.some(a => a.item_id === item.id && a.query_matched === s.query)) continue;

          const alertObj: AlertNotification = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: s.user_id,
            title: `Match for Saved Search "${s.query}"`,
            message: `New ${item.type === 'project' ? 'Research Project' : 'Discovery / Grant'}: "${item.title}"`,
            type: 'saved_search_match',
            item_type: item.type,
            item_id: item.id,
            query_matched: s.query,
            read: false,
            created_at: new Date().toISOString()
          };

          const updated = [alertObj, ...existingAlerts];
          localStorage.setItem(`alerts_${s.user_id}`, JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error("Error triggering search match alerts:", e);
    }
  },

  // --- ACCOUNT DELETION LOGS & OFFBOARDING ---
  getAccountDeletions: async (): Promise<AccountDeletionRecord[]> => {
    try {
      const { data, error } = await supabase.from('account_deletions').select('*').order('deleted_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as AccountDeletionRecord[];
      }
    } catch (e) {
      // No client-side mirror: account deletions live in Supabase only (PII must not be cached in localStorage).
    }
    return [];
  },

  recordAccountDeletion: async (record: Omit<AccountDeletionRecord, 'id' | 'deleted_at'>): Promise<AccountDeletionRecord> => {
    const newRecord: AccountDeletionRecord = {
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...record,
      deleted_at: new Date().toISOString()
    };

    try {
      await supabase.from('account_deletions').insert([newRecord]);
    } catch (e) {
      console.warn("Could not insert to Supabase account_deletions table:", e);
    }

    return newRecord;
  },

  deleteAccount: async (userId: string): Promise<void> => {
    if (!userId) return;
    try {
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.from('student_profiles').delete().eq('user_id', userId);
      await supabase.from('researcher_profiles').delete().eq('user_id', userId);
      await supabase.from('investor_profiles').delete().eq('user_id', userId);
      await supabase.from('industry_profiles').delete().eq('user_id', userId);
    } catch (e) {
      console.error("Error removing profile records from Supabase:", e);
    }

    try {
      localStorage.removeItem(`saved_searches_${userId}`);
      localStorage.removeItem(`alerts_${userId}`);
      localStorage.removeItem(`onboarding_skipped_${userId}`);
    } catch (e) {
      // Ignore
    }

    await supabase.auth.signOut();
  }
};


