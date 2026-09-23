import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { RefreshCw, Lock } from 'lucide-react';
import { User, NewsItem, UserRole, ProjectStatus, Visibility, ResearchArea } from '../types';
import { StorageService } from '../services/storageService';
import { useToast } from '../contexts/ToastContext';
import { AIScoutService } from '../services/aiScoutService';
import { getGeminiResponse } from '../services/geminiService';
import { DocumentExtractionService } from '../services/documentExtractionService';
import { inspectMessageEnvelope, isMessageEncrypted, computeSHA256 } from '../lib/cryptoService';
import { AdminMetricsSection } from './admin/AdminMetricsSection';
import { AdminReportModal } from './admin/AdminReportModal';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { AdminProjectsSection } from './admin/AdminProjectsSection';
import { AdminNewsSection } from './admin/AdminNewsSection';
import { AdminAuditSection } from './admin/AdminAuditSection';
import { useAdminData } from './admin/useAdminData';

interface AdminDashboardProps {
  user: User | null;
  onRefresh?: () => void;
  activeSubTab?: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions';
  setActiveSubTab?: (tab: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions') => void;
  overviewOnly?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  onRefresh,
  activeSubTab: externalActiveSubTab,
  setActiveSubTab: externalSetActiveSubTab,
  overviewOnly = false
}) => {
  const { showToast } = useToast();
  const [internalActiveSubTab] = useState<'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions'>('metrics');
  
  const activeSubTab = externalActiveSubTab !== undefined ? externalActiveSubTab : internalActiveSubTab;

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const {
    profiles,
    setProfiles,
    projects,
    setProjects,
    news,
    setNews,
    eois,
    accountDeletions,
    loading,
    loadAdminData,
  } = useAdminData({ overviewOnly, showToast });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const assignableRoles = [...Object.values(UserRole), 'TTO/IP'] as const;
  
  // Project Screener filter states
  const [projectSearch, setProjectSearch] = useState('');
  const [projectAreaFilter, setProjectAreaFilter] = useState<string>('all');
  const [projectVisibilityFilter, setProjectVisibilityFilter] = useState<string>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [projectSort, setProjectSort] = useState<string>('newest');
  
  // News Editor states
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Announcement');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsExternalUrl, setNewsExternalUrl] = useState('');
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [isScoutingNews, setIsScoutingNews] = useState(false);
  const [, setNewsStatus] = useState<'Draft' | 'Published'>('Published');
  const [newsReferenceLinks, setNewsReferenceLinks] = useState<string[]>(['', '', '', '']);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState<string>('Academic Press Release');
  const [, setShowAIWriteModal] = useState(false);
  const [newsTags, setNewsTags] = useState('');
  const [newsRelevanceScore, setNewsRelevanceScore] = useState<number>(0);
  const [newsSourceVerificationNotes, setNewsSourceVerificationNotes] = useState('');

  // Redesigned Administrative Hub states for news curator
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [tagList, setTagList] = useState<string[]>([]);
  const [archivePage, setArchivePage] = useState<number>(1);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [archiveSort, setArchiveSort] = useState<string>('newest');
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [newsPublishedAt, setNewsPublishedAt] = useState<string>(new Date().toISOString().substring(0, 16));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  // Users Directorate states & helpers
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

  const [inspectingEnvelopeMsg, setInspectingEnvelopeMsg] = useState<any | null>(null);
  const [envelopeAuditData, setEnvelopeAuditData] = useState<any | null>(null);

  const handleInspectMsg = async (msg: any) => {
    setInspectingEnvelopeMsg(msg);
    const auditInfo = await inspectMessageEnvelope(msg.raw_message || msg.message);
    setEnvelopeAuditData(auditInfo);
  };

  const handleExportSignedAuditCsv = async () => {
    if (!eois.length) {
      showToast("No audit records available to export.", "info");
      return;
    }
    const headers = ["Transmission ID", "Sender UID", "Sender Name", "Project Title", "Encrypted Payload Envelope", "SHA-256 Digest Signature", "Decrypted Excerpt", "Timestamp", "Status"];
    const rows = await Promise.all(eois.map(async (e) => {
      const hash = await computeSHA256(e.message || "");
      return [
        `"${e.id}"`,
        `"${e.sender_id || ''}"`,
        `"${(e.user_name || '').replace(/"/g, '""')}"`,
        `"${(e.projects?.title || 'Direct Outreach').replace(/"/g, '""')}"`,
        `"${(e.raw_message || e.message || '').replace(/"/g, '""')}"`,
        `"${hash}"`,
        `"${(e.message || '').replace(/"/g, '""')}"`,
        `"${e.created_at}"`,
        `"${e.status || 'pending'}"`
      ];
    }));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `UG_Governance_Signed_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Signed Governance Audit CSV exported with SHA-256 signatures!", "success");
  };

  const handleExportAccountDeletionsCsv = () => {
    if (accountDeletions.length === 0) {
      showToast("No account deletion records to export.", "info");
      return;
    }
    const csvRows = [
      ["Record ID", "User ID", "User Email", "User Name", "User Role", "Reason Category", "Details", "Date & Time"],
      ...accountDeletions.map(d => [d.id, d.user_id, `"${d.user_email}"`, `"${d.user_name}"`, `"${d.user_role}"`, `"${d.reason_category}"`, `"${(d.reason_details || '').replace(/"/g, '""')}"`, d.deleted_at])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(row => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `UG_Account_Deletions_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Account deletion records exported as CSV!", "success");
  };

  const handleExportUserCsv = () => {
    if (!filteredProfiles.length) {
      showToast("No user profiles available to export", "info");
      return;
    }
    const headers = ["ID", "Name", "Email", "Role", "Company or Dept", "AI Profile Configured"];
    const rows = filteredProfiles.map(p => [
      `"${p.id}"`,
      `"${(p.name || 'Anonymous User').replace(/"/g, '""')}"`,
      `"${p.email || ''}"`,
      `"${p.role || ''}"`,
      `"${(p.company || p.department || 'N/A').replace(/"/g, '""')}"`,
      `"${p.ai_profile ? 'Yes' : 'No'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ug_hub_user_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("User directory CSV exported successfully", "success");
  };

  const handleCopyEmails = () => {
    const emails = filteredProfiles.map(p => p.email).filter(Boolean).join(", ");
    if (!emails) {
      showToast("No email addresses found to copy", "info");
      return;
    }
    navigator.clipboard.writeText(emails);
    showToast(`Copied ${filteredProfiles.length} email addresses to clipboard`, "success");
  };

  // Auto sync tags list with newsTags state when newsTags is updated externally
  useEffect(() => {
    if (newsTags) {
      const parsed = newsTags.split(',').map(t => t.trim()).filter(Boolean);
      setTagList(parsed);
    } else {
      setTagList([]);
    }
  }, [newsTags]);

  // Handler for role changes
  const handleRoleChange = async (userId: string, newRole: UserRole | 'TTO/IP') => {
    try {
      await StorageService.adminUpdateProfileRole(userId, newRole);
      showToast(`User role elevated to ${newRole}`, "success");
       setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as UserRole } : p));
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast("Failed to transition role", "error");
    }
  };

  // Handler for project status updates
  const handleProjectStatusChange = async (projectId: string, field: 'status' | 'visibility', value: any) => {
    try {
      const proj = projects.find(p => p.id === projectId);
      if (!proj) return;
      
      const updatedProject = {
        ...proj,
        [field]: value
      };
      
      await StorageService.saveProject(updatedProject);
      showToast(`Project ${field} updated successfully`, "success");
      
      setProjects(prev => prev.map(p => p.id === projectId ? { 
        ...p, 
        [field]: value
      } : p));
    } catch (err) {
      showToast("Failed to modify project constraints", "error");
    }
  };

  // Handler for deleting project
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to permanently withdraw this research project from the platform? This cannot be undone.")) return;
    try {
      await StorageService.deleteProject(projectId);
      showToast("Project completely deleted", "success");
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      showToast("Failed to delete project", "error");
    }
  };

  const handleAIScoutSync = async () => {
    if (isScoutingNews) return;
    setIsScoutingNews(true);
    showToast("AI Scout: Initializing synchronization with external academic feeds...", "info");
    try {
      const updated = await AIScoutService.autoSyncNews(true);
      if (updated) {
        showToast("AI Scout: Successfully synchronized new relevant announcements!", "success");
        await loadAdminData();
      } else {
        showToast("AI Scout: Feeds are already up to date. No new announcements found.", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed running AI Scout sync", "error");
    } finally {
      setIsScoutingNews(false);
    }
  };

  const handleGenerateAIPressRelease = async (overrideTopic?: string, overrideKeywords?: string, overrideTone?: string) => {
    const topicToUse = (overrideTopic !== undefined ? overrideTopic : aiTopic) || newsTitle;
    const keywordsToUse = overrideKeywords !== undefined ? overrideKeywords : aiKeywords;
    const toneToUse = overrideTone !== undefined ? overrideTone : aiTone;

    if (!topicToUse || !topicToUse.trim()) {
      showToast("Please enter a core topic or title first to guide the Gemini Copywriter.", "error");
      return;
    }

    setIsGeneratingAI(true);
    showToast("Gemini Copywriter: Drafting announcement headline and brief...", "info");

    try {
      const prompt = `Act as an elite Academic Public Relations Officer and Senior Communications Specialist at the University of Ghana.
Write an authoritative, highly engaging public announcement/press release based on:
Topic: "${topicToUse.trim()}"
Keywords/Context: "${keywordsToUse.trim() || 'University of Ghana, Research Innovation, Academic Excellence'}"
Category: "${newsCategory}"
Tone & Copywriting Style: "${toneToUse}"

You MUST output strictly in the following valid JSON format:
{
  "title": "A highly professional, captivating academic headline (max 180 chars)",
  "summary": "An authoritative, well-written article summary (around 120-180 words) highlighting the research breakthrough, strategic ecosystem funding, impact, or institutional partnership."
}

Do NOT include any extra conversational text or markdown codeblock wrappers around your response. Return ONLY the raw JSON object.`;

      const responseText = await getGeminiResponse(prompt, []);
      let title = '';
      let summary = '';

      const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          if (result.title) title = result.title;
          if (result.summary) summary = result.summary;
        } catch (jsonErr) {
          console.warn("Gemini Copywriter JSON parse fallback:", jsonErr);
        }
      }

      if (title) setNewsTitle(title);
      if (summary) setNewsSummary(summary);

      if (!title && !summary) {
        setNewsTitle(topicToUse);
        setNewsSummary(cleanedText);
      }

      showToast("Gemini Copywriter: Draft generated successfully!", "success");
      setAiTopic('');
      setAiKeywords('');
      setShowAIWriteModal(false);
      
      // Switch back to Tab 1 so the admin immediately sees the populated fields
      setActiveTab(1);
    } catch (err: any) {
      console.error("Gemini Copywriter error:", err);
      showToast("Failed to draft with Gemini Copywriter", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Pre-populate news item for editing
  const handleEditNewsClick = (e: React.MouseEvent | undefined, item: NewsItem) => {
    if (e) e.stopPropagation();
    setEditingNews(item);
    setNewsTitle(item.title);
    setNewsCategory(item.category || 'Announcement');
    setNewsSummary(item.summary);
    setNewsImageUrl(item.image_url || '');
    setNewsExternalUrl(item.external_url || '');
    setNewsStatus(item.status || 'Published');
    setNewsReferenceLinks(item.reference_links && item.reference_links.length > 0 ? [...item.reference_links, '', '', '', ''].slice(0, 4) : ['', '', '', '']);
    setNewsTags(item.tags ? item.tags.join(', ') : '');
    setTagList(item.tags || []);
    setNewsRelevanceScore(item.relevance_score || 0);
    setNewsSourceVerificationNotes(item.source_verification_notes || '');
    setNewsPublishedAt(item.published_at ? new Date(item.published_at).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16));
    setActiveTab(1); // Return to Core Insight tab in Split Workspace
    setIsWorkspaceOpen(true);
  };

  // Setup form fields for a new announcement
  const handleCreateNewClick = () => {
    setEditingNews(null);
    setNewsTitle('');
    setNewsCategory('Announcement');
    setNewsSummary('');
    setNewsImageUrl('');
    setNewsExternalUrl('');
    setNewsStatus('Published');
    setNewsReferenceLinks(['', '', '', '']);
    setNewsTags('');
    setTagList([]);
    setNewsRelevanceScore(0);
    setNewsSourceVerificationNotes('');
    setNewsPublishedAt(new Date().toISOString().substring(0, 16));
    setActiveTab(1); // Return to Core Insight tab in Split Workspace
    setIsWorkspaceOpen(true);
    showToast("Workspace opened. Enter Core Insights to create a new announcement.", "info");
  };

  // Delete news item
  const handleDeleteNews = async (e: React.MouseEvent | undefined, newsId: string) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this announcement? This action is irreversible.")) return;
    try {
      await StorageService.adminDeleteNewsItem(newsId);
      showToast("Announcement deleted successfully", "success");
      setNews(prev => prev.filter(n => n.id !== newsId));
      if (editingNews?.id === newsId) {
        setEditingNews(null);
        setNewsTitle('');
        setNewsSummary('');
        setNewsImageUrl('');
        setNewsExternalUrl('');
        setNewsStatus('Published');
        setNewsReferenceLinks(['', '', '', '']);
        setNewsTags('');
        setTagList([]);
        setNewsRelevanceScore(0);
        setNewsSourceVerificationNotes('');
        setNewsPublishedAt(new Date().toISOString().substring(0, 16));
      }
    } catch (err) {
      showToast("Failed deleting announcement", "error");
    }
  };

  // Helper to clear Curator Workspace completely
  const handleClearWorkspace = () => {
    setEditingNews(null);
    setNewsTitle('');
    setNewsSummary('');
    setNewsImageUrl('');
    setNewsExternalUrl('');
    setNewsStatus('Published');
    setNewsReferenceLinks(['', '', '', '']);
    setNewsTags('');
    setTagList([]);
    setNewsRelevanceScore(0);
    setNewsSourceVerificationNotes('');
    setNewsPublishedAt(new Date().toISOString().substring(0, 16));
    setActiveTab(1);
    showToast("Curator Workspace cleared for new announcement", "info");
  };

  // Image Upload handler with manual validation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast("Invalid file type. Only JPG, PNG, or WEBP images are allowed.", "error");
      return;
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast("File is too large. Maximum allowed size is 5MB.", "error");
      return;
    }

    setIsUploadingImage(true);
    showToast("Uploading image...", "info");
    try {
      const url = await StorageService.uploadFile(file, 'avatars');
      setNewsImageUrl(url);
      showToast("Image uploaded successfully!", "success");
    } catch (err: any) {
      showToast(`Upload failed: ${err.message || err}`, "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Extract content from .txt, .doc, or .docx file and populate workspace
  const handleDocumentExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['txt', 'doc', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(ext)) {
      showToast("Invalid file type. Only .txt, .doc, and .docx files are supported.", "error");
      return;
    }

    setIsExtractingDoc(true);
    showToast("Reading document file...", "info");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        
        showToast("AI Agent: Analyzing draft with Gemini...", "info");
        const resData = await DocumentExtractionService.extractAndAnalyze(base64String, file.name, file.type);

        if (resData.success && resData.data) {
          const item = resData.data;
          if (item.title) setNewsTitle(item.title);
          if (item.summary) setNewsSummary(item.summary);
          if (item.category) setNewsCategory(item.category);
          if (item.tags) {
            setTagList(item.tags);
            setNewsTags(item.tags.join(', '));
          }
          if (item.source_verification_notes) {
            setNewsSourceVerificationNotes(item.source_verification_notes);
          }
          showToast("Document analyzed and fields auto-populated!", "success");
        } else {
          showToast("Failed to parse document content.", "error");
        }
      } catch (err: any) {
        console.error("Document extraction failed:", err);
        showToast(`Document analysis failed: ${err.message || err}`, "error");
      } finally {
        setIsExtractingDoc(false);
        // Clear input value so upload can be triggered again with the same file
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      showToast("Failed to read the local file.", "error");
      setIsExtractingDoc(false);
    };

    reader.readAsDataURL(file);
  };

  // Handle action-specific saving (Save Draft or Publish) to avoid state sync lag
  const handleActionSave = async (status: 'Draft' | 'Published') => {
    if (!newsTitle.trim() || !newsSummary.trim()) {
      showToast("Please provide a title and summary", "error");
      return;
    }

    if (status === 'Published' && (!newsImageUrl || newsImageUrl.trim() === '')) {
      showToast("An image is required before publishing. Please upload a JPG, PNG, or WEBP image first.", "error");
      return;
    }

    try {
      setIsSavingNews(true);
      
      // Clean image URL back to a public URL to save cleanly in the database
      const cleanImageUrl = newsImageUrl && newsImageUrl.includes('?token=') 
        ? newsImageUrl.split('?')[0].replace('/object/sign/', '/object/public/')
        : newsImageUrl;

      const payload: Partial<NewsItem> = {
        id: editingNews?.id,
        title: newsTitle,
        category: newsCategory,
        summary: newsSummary,
        image_url: cleanImageUrl,
        external_url: newsExternalUrl,
        published_at: new Date(newsPublishedAt).toISOString(),
        status: status,
        reference_links: newsReferenceLinks.map(link => link.trim()),
        tags: tagList,
        relevance_score: Number(newsRelevanceScore) || 0,
        source_verification_notes: newsSourceVerificationNotes
      };

      await StorageService.adminSaveNewsItem(payload);
      showToast(editingNews?.id ? "News item updated" : "News item created successfully", "success");
      
      // Reset state & reload list
      setEditingNews(null);
      setNewsTitle('');
      setNewsSummary('');
      setNewsImageUrl('');
      setNewsExternalUrl('');
      setNewsStatus('Published');
      setNewsReferenceLinks(['', '', '', '']);
      setNewsTags('');
      setTagList([]);
      setNewsRelevanceScore(0);
      setNewsSourceVerificationNotes('');
      setNewsPublishedAt(new Date().toISOString().substring(0, 16));
      setArchivePage(1);
      
      await loadAdminData();
    } catch (err) {
      showToast("Failed saving announcement", "error");
    } finally {
      setIsSavingNews(false);
    }
  };

  // Filter computations
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const screenerProjects = projects
    .filter(p => {
      const matchesSearch = !projectSearch || 
        p.title?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.department?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.research_area?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(projectSearch.toLowerCase());
      
      const matchesArea = projectAreaFilter === 'all' || p.research_area === projectAreaFilter;
      const matchesVisibility = projectVisibilityFilter === 'all' || p.visibility === projectVisibilityFilter;
      const matchesStatus = projectStatusFilter === 'all' || p.status === projectStatusFilter;

      return matchesSearch && matchesArea && matchesVisibility && matchesStatus;
    })
    .sort((a, b) => {
      if (projectSort === 'newest') return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      if (projectSort === 'oldest') return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      if (projectSort === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (projectSort === 'title_desc') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });

  // Filter and sort the archives list
  const filteredArchives = news.filter(item => {
    const matchesSearch = archiveSearch 
      ? item.title.toLowerCase().includes(archiveSearch.toLowerCase()) || 
        item.summary.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(archiveSearch.toLowerCase())))
      : true;
      
    const matchesCategory = selectedCategory && selectedCategory !== 'All'
      ? item.category === selectedCategory
      : true;
      
    const matchesStatus = selectedStatusFilter && selectedStatusFilter !== 'All'
      ? item.status === selectedStatusFilter
      : true;
      
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedArchives = [...filteredArchives].sort((a, b) => {
    const dateA = new Date(a.published_at || '').getTime();
    const dateB = new Date(b.published_at || '').getTime();
    return archiveSort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(sortedArchives.length / itemsPerPage));
  
  const paginatedArchives = sortedArchives.slice(
    (archivePage - 1) * itemsPerPage,
    archivePage * itemsPerPage
  );

  // Compute stats metrics
  const totalResearchers = profiles.filter(p => p.role === UserRole.Researcher).length;
  const totalInvestors = profiles.filter(p => p.role === UserRole.Investor).length;

  const publicProjectsCount = projects.filter(p => p.visibility === Visibility.Public).length;
  const encryptedMessageCount = eois.filter(e => isMessageEncrypted(e.raw_message || e.message)).length;
  const integrityStatus = eois.length > 0 ? 'Not recorded' : 'No records';

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 dark:text-gray-100">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-ug-teal mb-2">
            <Lock size={14} className="animate-pulse" />
            <span className="text-[11px] font-bold tracking-wide">Platform Core Governance System</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ug-navy dark:text-white tracking-tight">Administrative Hub</h1>
          <p className="text-xs text-gray-400 font-medium tracking-wide mt-1">
            Integrate university registries, examine match metrics, curate institutional announcements, and moderate innovation projects.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 h-12 bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 text-[11px] text-ug-navy dark:text-gray-200 tracking-wide rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Re-Syncing...' : 'Force System Re-Sync'}
          </button>
        </div>
      </div>

      {/* Sub-tabs removed as they are driven by the modern left sidebar navigation menu */}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <RefreshCw className="animate-spin text-ug-teal" size={48} />
          <p className="text-[11px] font-bold tracking-wide text-gray-400 animate-pulse">Syncing platform ledgers & secure metrics...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* 1. METRICS SUBTAB */}
          {activeSubTab === 'metrics' && (
            <AdminMetricsSection
              profiles={profiles}
              projects={projects}
              eois={eois}
              publicProjectsCount={publicProjectsCount}
              totalResearchers={totalResearchers}
              totalInvestors={totalInvestors}
              onOpenReport={() => setIsReportModalOpen(true)}
              showToast={showToast}
            />
          )}

          {/* 2. USER PORTAL DIRECTORY TAB */}
          {activeSubTab === 'users' && (
            <AdminUsersSection
              profiles={profiles}
              projects={projects}
              searchQuery={searchQuery}
              roleFilter={roleFilter}
              filteredProfiles={filteredProfiles}
              assignableRoles={assignableRoles}
              inspectingUser={inspectingUser}
              onSearchChange={setSearchQuery}
              onRoleFilterChange={setRoleFilter}
              onCopyEmails={handleCopyEmails}
              onExportUserCsv={handleExportUserCsv}
              onInspectUser={setInspectingUser}
              onCloseInspection={() => setInspectingUser(null)}
              onRoleChange={handleRoleChange}
              onInspectionRoleChange={(userId, newRole) => {
                handleRoleChange(userId, newRole);
                setInspectingUser(prev => prev ? { ...prev, role: newRole as UserRole } : null);
              }}
            />
          )}


          {/* 3. PROJECT SCREENER & MODERATION TAB */}
          {activeSubTab === 'projects' && (
            <AdminProjectsSection
              projects={projects}
              screenerProjects={screenerProjects}
              projectSearch={projectSearch}
              projectAreaFilter={projectAreaFilter}
              projectVisibilityFilter={projectVisibilityFilter}
              projectStatusFilter={projectStatusFilter}
              projectSort={projectSort}
              researchAreas={Object.values(ResearchArea)}
              visibilityOptions={Object.values(Visibility)}
              statusOptions={Object.values(ProjectStatus)}
              onProjectSearchChange={setProjectSearch}
              onProjectAreaFilterChange={setProjectAreaFilter}
              onProjectVisibilityFilterChange={setProjectVisibilityFilter}
              onProjectStatusFilterChange={setProjectStatusFilter}
              onProjectSortChange={setProjectSort}
              onClearProjectFilters={() => {
                setProjectSearch('');
                setProjectAreaFilter('all');
                setProjectVisibilityFilter('all');
                setProjectStatusFilter('all');
                setProjectSort('newest');
              }}
              onProjectStatusChange={handleProjectStatusChange}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {/* 3. NEWS CURATOR SUBTAB */}
          {activeSubTab === 'news' && (
            <AdminNewsSection
              news={news}
              sortedArchives={sortedArchives}
              paginatedArchives={paginatedArchives}
              totalPages={totalPages}
              archivePage={archivePage}
              archiveSearch={archiveSearch}
              selectedCategory={selectedCategory}
              selectedStatusFilter={selectedStatusFilter}
              archiveSort={archiveSort}
              isWorkspaceOpen={isWorkspaceOpen}
              activeTab={activeTab}
              editingNews={editingNews}
              newsTitle={newsTitle}
              newsCategory={newsCategory}
              newsSummary={newsSummary}
              newsImageUrl={newsImageUrl}
              newsExternalUrl={newsExternalUrl}
              newsReferenceLinks={newsReferenceLinks}
              newsPublishedAt={newsPublishedAt}
              aiTopic={aiTopic}
              aiKeywords={aiKeywords}
              aiTone={aiTone}
              isSavingNews={isSavingNews}
              isGeneratingAI={isGeneratingAI}
              isExtractingDoc={isExtractingDoc}
              isUploadingImage={isUploadingImage}
              isScoutingNews={isScoutingNews}
              newsTags={newsTags}
              newsRelevanceScore={newsRelevanceScore}
              newsSourceVerificationNotes={newsSourceVerificationNotes}
              imageInputRef={imageInputRef}
              docInputRef={docInputRef}
              onArchivePageChange={setArchivePage}
              onArchiveSearchChange={setArchiveSearch}
              onCategoryChange={setSelectedCategory}
              onStatusFilterChange={setSelectedStatusFilter}
              onArchiveSortChange={setArchiveSort}
              onWorkspaceOpenChange={setIsWorkspaceOpen}
              onActiveTabChange={setActiveTab}
              onTitleChange={setNewsTitle}
              onCategoryEditorChange={setNewsCategory}
              onSummaryChange={setNewsSummary}
              onImageUrlChange={setNewsImageUrl}
              onExternalUrlChange={setNewsExternalUrl}
              onReferenceLinksChange={setNewsReferenceLinks}
              onPublishedAtChange={setNewsPublishedAt}
              onAiTopicChange={setAiTopic}
              onAiKeywordsChange={setAiKeywords}
              onAiToneChange={setAiTone}
              onEditNews={handleEditNewsClick}
              onDeleteNews={handleDeleteNews}
              onCreateNew={handleCreateNewClick}
              onClearWorkspace={handleClearWorkspace}
              onScoutNews={handleAIScoutSync}
              onDocumentExtract={handleDocumentExtract}
              onImageUpload={handleImageUpload}
              onGenerateAI={handleGenerateAIPressRelease}
              onSave={handleActionSave}
            />
          )}
          {activeSubTab === 'logs' && (
            <AdminAuditSection
              eois={eois}
              accountDeletions={accountDeletions}
              encryptedMessageCount={encryptedMessageCount}
              integrityStatus={integrityStatus}
              inspectingEnvelopeMsg={inspectingEnvelopeMsg}
              envelopeAuditData={envelopeAuditData}
              onExportSignedAuditCsv={handleExportSignedAuditCsv}
              onExportAccountDeletionsCsv={handleExportAccountDeletionsCsv}
              onInspectMsg={handleInspectMsg}
              onCloseEnvelopeInspector={() => {
                setInspectingEnvelopeMsg(null);
                setEnvelopeAuditData(null);
              }}
              isMessageEncrypted={isMessageEncrypted}
            />
          )}
        </AnimatePresence>
      )}

      <AdminReportModal
        open={isReportModalOpen}
        user={user}
        profiles={profiles}
        projects={projects}
        news={news}
        eois={eois}
        accountDeletions={accountDeletions}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
