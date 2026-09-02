
import { Project, NewsItem, User, UserRole, SavedSearch, AlertNotification, AccountDeletionRecord, AiDecision } from '../types';
import { supabase } from '../lib/supabase';
import { EmbeddingService } from './embeddingService';
import { decryptMessage } from '../lib/cryptoService';
import { deleteJson, getJson, postJson, putJson } from '../lib/api';
import { getAuthUser } from '../lib/auth-client';
import { validateStorageUpload } from '../lib/uploadGuard';

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
      return getAuthUser();
    } catch (error) {
      console.error('Session initialization error:', error);
      return null;
    }
  },

  // --- FILE UPLOAD LOGIC ---
  uploadFile: async (file: File, bucket: string): Promise<string> => {
    const validation = validateStorageUpload({ name: file.name, mimeType: file.type, sizeBytes: file.size });
    if (!validation.ok) throw new Error(validation.error || 'File upload rejected.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const result = await postJson<{ path: string; url?: string | null }>('/api/storage/upload', {
      bucket: bucket.toLowerCase(),
      fileName: file.name,
      mimeType: file.type,
      contentBase64: btoa(binary),
    });
    return result.url || result.path;
  },

  signProjectUrls: async (projects: Project[], includeProtectedDocuments = true): Promise<Project[]> => {
    if (!projects || projects.length === 0) return [];

    try {
      const mutableProjects = JSON.parse(JSON.stringify(projects)) as Project[];
      const requests: { projectId: string; path: string; kind: 'image' | 'brief' | 'document'; projectIndex: number; docIndex?: number }[] = [];
      mutableProjects.forEach((project, projectIndex) => {
        project.image_url?.split('|').forEach((part, partIndex) => {
          if (isStorageUrl(part, 'projects') && !part.includes('/object/public/projects/')) {
            const path = getStorageFilePath(part, 'projects');
            if (path) requests.push({ projectId: project.id, path, kind: 'image', projectIndex, docIndex: partIndex });
          }
        });
        if (project.technical_details_url && includeProtectedDocuments) {
          const path = getStorageFilePath(project.technical_details_url);
          if (path) requests.push({ projectId: project.id, path, kind: 'brief', projectIndex });
        } else if (project.technical_details_url) {
          project.technical_details_url = 'locked';
        }
        if (includeProtectedDocuments && Array.isArray(project.requested_documents)) {
          project.requested_documents.forEach((doc, docIndex) => {
            const path = doc.url ? getStorageFilePath(doc.url) : '';
            if (path) requests.push({ projectId: project.id, path, kind: 'document', projectIndex, docIndex });
          });
        } else {
          project.requested_documents = undefined;
        }
      });
      const { signed } = await postJson<{ signed: { projectIndex: number; docIndex?: number; kind: string; url: string }[] }>('/api/storage/sign', { requests });
      signed.forEach(item => {
        const project = mutableProjects[item.projectIndex];
        if (!project) return;
        if (item.kind === 'brief') project.technical_details_url = item.url;
        if (item.kind === 'document' && item.docIndex !== undefined && project.requested_documents?.[item.docIndex]) project.requested_documents[item.docIndex].url = item.url;
        if (item.kind === 'image' && item.docIndex !== undefined) {
          const parts = project.image_url?.split('|') || [];
          parts[item.docIndex] = item.url;
          project.image_url = parts.join('|');
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
      const user = await getAuthUser();
      const userId = user?.id;

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

       return await StorageService.signProjectUrls(projectsWithOwners, false);
    } catch (e) {
      return [];
    }
  },

  // Fetch a single project by id (RLS enforces visibility server-side).
  // Sensitive fields are stripped for non-owners/non-admins, mirroring getProjects.
  getProjectById: async (projectId: string): Promise<Project | null> => {
    if (!projectId) return null;
    try {
      const user = await getAuthUser();
      const userId = user?.id || null;
      let isAdmin = false;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
        isAdmin = profile?.role === 'Admin';
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error || !data) return null;

      const p: Project = data as Project;
      const isOwnerOrAdmin = isAdmin || (userId && p.owner_id === userId);
      const sanitized: Project = isOwnerOrAdmin ? p : {
        ...p,
        internal_notes: undefined,
        requested_documents: undefined,
        disclosure_timeline: undefined,
        ai_verification: undefined
      };

      let ownerMeta: any = null;
      if (p.owner_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, department, company')
          .eq('id', p.owner_id)
          .maybeSingle();
        ownerMeta = prof;
      }

      const withOwner: Project = ownerMeta ? {
        ...sanitized,
        owner_name: ownerMeta.name || 'University Researcher',
        owner_email: ownerMeta.email || '',
        owner_avatar: ownerMeta.avatar_url || '',
        owner_department: ownerMeta.department || sanitized.department || '',
        owner_company: ownerMeta.company || ''
      } : {
        ...sanitized,
        owner_name: (sanitized as any).owner_name || 'University Researcher'
      };

      const [signed] = await StorageService.signProjectUrls([withOwner]);
      return signed || withOwner;
    } catch (e) {
      return null;
    }
  },

  getMyProjects: async (userId: string): Promise<Project[]> => {
    if (!userId) return [];
    try {
      const { projects } = await getJson<{ projects: Project[] }>('/api/projects/mine');
      const data = projects || [];

      // Since these are already the user's projects (or the user is the owner),
      // we don't need to strip owner properties, but we DO need to generate
      // signed URLs for the technical brief & requested documents.
      return await StorageService.signProjectUrls(data, false);
    } catch (e) {
      return [];
    }
  },

  getSignedTechnicalBrief: async (projectId: string): Promise<string> => {
    const authorizedUrl = await getJson<{ url: string }>(`/api/projects/${encodeURIComponent(projectId)}/technical-brief`);
    return authorizedUrl.url;
  },

  getPublicResearcherProjects: async (researcherId: string): Promise<Project[]> => {
    if (!researcherId) return [];
    try {
      const user = await getAuthUser();
      const currentUserId = user?.id;

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
       return await StorageService.signProjectUrls(sanitized, false);
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
        // Deterministic secondary signal (recency) so ordering is stable across loads
        const ageDays = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
        const recencyBoost = Math.max(0, 30 - ageDays);
        return { ...p, trendScore: inquiryCount * 10 + recencyBoost };
      }).sort((a: any, b: any) => b.trendScore - a.trendScore).slice(0, 5);
    } catch (e) {
      return [];
    }
  },

  saveProject: async (project: Partial<Project>) => {
    const user = await getAuthUser();
    const currentUserId = user?.id;

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

    const saved = project.id
      ? await putJson<{ project: Project }>(`/api/projects/${encodeURIComponent(project.id)}`, { project: payload })
      : await postJson<{ project: Project }>('/api/projects', { project: payload });
    return saved.project;

  },

  deleteProject: async (projectId: string) => {
    await deleteJson(`/api/projects/${encodeURIComponent(projectId)}`);
    return true;
  },

  // Bookmarks
  toggleBookmark: async (userId: string, projectId: string): Promise<boolean> => {
    const { bookmarked } = await postJson<{ bookmarked: boolean }>('/api/bookmarks/toggle', { projectId });
    return bookmarked;
  },

  isBookmarked: async (userId: string, projectId: string): Promise<boolean> => {
    if (!userId) return false;
    const { bookmarked } = await getJson<{ bookmarked: boolean }>(`/api/bookmarks/${encodeURIComponent(projectId)}/check`);
    return bookmarked;
  },

  getBookmarks: async (userId: string): Promise<Project[]> => {
    if (!userId) return [];
    
    try {
      const { bookmarks } = await getJson<{ bookmarks: Project[] }>('/api/bookmarks');
      const projects = bookmarks || [];
      
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

       return await StorageService.signProjectUrls(sanitized, false);
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
          .eq('status', 'Published')
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
          .eq('status', 'Published')
          .limit(20);
        return await StorageService.signNewsUrls((data || []) as NewsItem[]);
      } catch (innerErr) {
        return [];
      }
    }
  },

  // Expression of Interest (EOI) / Messaging System (Full Duplex)
  submitEOI: async (project_id: string | null, user_name: string, message: string, recipient_id?: string, metric: 'expressions_of_interest' | 'requests' = 'expressions_of_interest') => {
    await postJson('/api/eois', { projectId: project_id, message, recipientId: recipient_id, metric });
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    if (!userId) return 0;
    try {
      const { count } = await getJson<{ count: number }>('/api/eois/unread-count');
      return count || 0;
    } catch {
      return 0;
    }
  },

  searchUsers: async (query: string): Promise<User[]> => {
    if (!query || query.length < 2) return [];
    
    // Ensure the user searching is authenticated
    const user = await getAuthUser();
    if (!user) return [];

    // Strip PostgREST-reserved syntax characters so the term cannot alter the filter shape
    const sanitized = query.replace(/[%(),*"']/g, '').trim().slice(0, 60);
    if (sanitized.length < 2) return [];

    // Directory discovery uses the sanitized view (no email / no CV data)
    const { data, error } = await supabase
      .from('public_directory')
      .select('id, name, role, avatar_url, company, department')
      .or(`name.ilike.%${sanitized}%`)
      .limit(5);
    
    if (error) {
      console.warn("error searching users: ", error);
      return [];
    }
    return (data || []) as User[];
  },

  getConversations: async (userId: string) => {
    if (!userId) return [];
    const { eois: data } = await getJson<{ eois: any[] }>('/api/eois/conversations');
    if (!data) return [];

    // Map profiles to replace any admin's user_name with 'UG Industry Hub Admin'
    const userIds = Array.from(new Set(data.flatMap(msg => [msg.sender_id, msg.recipient_id]).filter((id): id is string => Boolean(id))));
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
    await postJson('/api/eois/read-thread', { partnerId, projectId: threadId });
  },

  getEOIsForPI: async (userId: string) => {
    if (!userId) return [];
    try {
      const { eois: data } = await getJson<{ eois: any[] }>('/api/eois/received');
      if (!data) return [];

    const userIds = Array.from(new Set(data.flatMap(msg => [msg.sender_id, msg.recipient_id]).filter((id): id is string => Boolean(id))));
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
    await putJson(`/api/eois/${encodeURIComponent(id)}/read`, {});
  },

  updateEOIStatus: async (id: string, status: string) => {
    await putJson(`/api/eois/${encodeURIComponent(id)}/status`, { status });
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
  getCurrentProfile: async () => {
    try {
      const data = await getJson<{ profile?: any | null }>('/api/profile/me');
      return data?.profile || null;
    } catch (error) {
      console.warn('Current profile lookup failed:', error);
      return null;
    }
  },

  getProfile: async (userId: string) => {
    if (!userId) return null;
    try {
      const data = await getJson<{ profile?: any | null }>(`/api/profile/${encodeURIComponent(userId)}`);
      return data?.profile || null;
    } catch (error) {
      console.warn('Server profile lookup failed:', error);
      return null;
    }
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
    
    await postJson('/api/profile/update', { profile });
  },

  getMatches: async (userId: string, embedding: number[]) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
    if (!userId || !isUuid || !embedding) return { profiles: [], projects: [] };

    const validEmbedding = EmbeddingService.ensureDimension(embedding, 768);

    try {
      return await postJson<{ profiles: any[]; projects: any[] }>('/api/matches', {
        userId,
        embedding: validEmbedding,
      });
    } catch (error) {
      console.warn('Server match lookup failed:', error);
      return { profiles: [], projects: [] };
    }

    try {
      let finalProfiles: any[] = [];
      let finalProjects: any[] = [];

      if (validEmbedding.length > 0) {
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

        finalProfiles = profiles || [];
        finalProjects = projects || [];
      } else {
        console.warn("Vector matching skipped: no valid embedding available.");
      }

      // Fallback 1: If no vector-matched profiles are returned (e.g. similarity is NULL due to zero-vectors or NULL embeddings), fetch other users directly.
      if (finalProfiles.length === 0) {
        console.info("Match fallback: using directory profiles (no vector matches).");
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, name, role, ai_profile, semantic_summary, avatar_url')
          .neq('id', userId)
          .limit(10);

        const safeFallbackProfiles = fallbackProfiles || [];
        if (safeFallbackProfiles.length > 0) {
          finalProfiles = safeFallbackProfiles.map(p => ({
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
        console.info("Match fallback: using active disclosures (no vector matches).");
        const { data: fallbackProjects } = await supabase
          .from('projects')
          .select('id, title, description, image_url, research_area')
          .limit(10);

        const safeFallbackProjects = fallbackProjects || [];
        if (safeFallbackProjects.length > 0) {
          finalProjects = safeFallbackProjects.map(p => ({
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
          const profileIds = finalProfiles.map((p: any) => p.id).filter((id: any): id is string => Boolean(id));
          const { data: enrichedData, error: enrichError } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', profileIds);
          
          const safeEnrichedData = enrichedData || [];
          if (!enrichError && safeEnrichedData.length > 0) {
            const avatarMap = new Map(safeEnrichedData.map(row => [row.id, row.avatar_url]));
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

          const safeVisData = visData || [];
          if (safeVisData.length > 0) {
            const visMap = new Map(safeVisData.map(row => [row.id, row]));
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
      const user = await getAuthUser();
      if (!user?.id) return false;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
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
    const { eois: data } = await getJson<{ eois: any[] }>('/api/eois/sent');
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

  // --- AI Decision Provenance Ledger ---
  recordAiDecision: async (entry: Partial<AiDecision>): Promise<boolean> => {
    try {
      await postJson('/api/ai-decisions', entry);
      return true;
    } catch (e) {
      console.error("Failed to record AI decision to ledger:", e);
      return false;
    }
  },

  getAiDecisions: async (status?: string): Promise<AiDecision[]> => {
    try {
      const data = await getJson<{ decisions?: AiDecision[] }>(`/api/ai-decisions?status=${encodeURIComponent(status || 'all')}`);
      return data?.decisions || [];
    } catch (e) {
      console.error("Failed to load AI decision ledger:", e);
      return [];
    }
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

  }
};


