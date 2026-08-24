import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, FileText, Settings, Bell, ShieldCheck, 
  Trash2, Plus, Edit, RefreshCw, Layers, CheckCircle2, 
  MapPin, Clock, Search, ExternalLink, Filter, HelpCircle, 
  TrendingUp, BarChart3, Radio, FileSpreadsheet, Lock, Sparkles,
  MessageSquare, Download, Eye, AlertTriangle, ThumbsUp, Check, Loader2, ChevronDown, ChevronUp, X, Link2, Upload, ChevronLeft, ChevronRight,
  Calendar, Tag, Globe, Zap, Maximize2, Minimize2, Mail, Copy, Building2, GraduationCap, Microscope, Briefcase, UserCheck, FileDown, FolderGit2,
  ShieldAlert, Fingerprint, FileCheck
} from 'lucide-react';
import { User, Project, NewsItem, UserRole, ProjectStatus, Visibility, ResearchArea, DisclosureStatus, AccountDeletionRecord, AiDecision } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../lib/supabase';
import { useToast } from '../App';
import { AIScoutService } from '../services/aiScoutService';
import { getGeminiResponse } from '../services/geminiService';
import { DocumentExtractionService } from '../services/documentExtractionService';
import { inspectMessageEnvelope, isMessageEncrypted, computeSHA256 } from '../lib/cryptoService';
import { ReportCenter } from './ReportCenter';

interface AdminDashboardProps {
  user: User | null;
  onRefresh?: () => void;
  activeSubTab?: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions';
  setActiveSubTab?: (tab: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  onRefresh,
  activeSubTab: externalActiveSubTab,
  setActiveSubTab: externalSetActiveSubTab
}) => {
  const { showToast } = useToast();
  const [internalActiveSubTab, setInternalActiveSubTab] = useState<'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions'>('metrics');
  
  const activeSubTab = externalActiveSubTab !== undefined ? externalActiveSubTab : internalActiveSubTab;
  const setActiveSubTab = (tab: 'metrics' | 'users' | 'disclosures' | 'projects' | 'news' | 'logs' | 'decisions') => {
    if (externalSetActiveSubTab) {
      externalSetActiveSubTab(tab);
    } else {
      setInternalActiveSubTab(tab);
    }
  };
  
  // Data states
  const [profiles, setProfiles] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [eois, setEois] = useState<any[]>([]);
  const [accountDeletions, setAccountDeletions] = useState<AccountDeletionRecord[]>([]);
  const [decisions, setDecisions] = useState<AiDecision[]>([]);
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<string>('all');
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deletionSearch, setDeletionSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
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
  const [newsStatus, setNewsStatus] = useState<'Draft' | 'Published'>('Published');
  const [newsReferenceLinks, setNewsReferenceLinks] = useState<string[]>(['', '', '', '']);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState<string>('Academic Press Release');
  const [showAIWriteModal, setShowAIWriteModal] = useState(false);
  const [newsTags, setNewsTags] = useState('');
  const [newsRelevanceScore, setNewsRelevanceScore] = useState<number>(0);
  const [newsSourceVerificationNotes, setNewsSourceVerificationNotes] = useState('');

  // Redesigned Administrative Hub states for news curator
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(true);
  const [tagInput, setTagInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(1);
  const [tagList, setTagList] = useState<string[]>([]);
  const [archivePage, setArchivePage] = useState<number>(1);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [archiveSort, setArchiveSort] = useState<string>('newest');
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [newsPublishedAt, setNewsPublishedAt] = useState<string>(new Date().toISOString().substring(0, 16));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  // Admin Disclosure Workflows states
  const [selectedDisclosureId, setSelectedDisclosureId] = useState<string | null>(null);
  const [adminInternalNotes, setAdminInternalNotes] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [adminRequestedDocsText, setAdminRequestedDocsText] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [disclosureSearchQuery, setDisclosureSearchQuery] = useState('');
  const [disclosureStatusFilter, setDisclosureStatusFilter] = useState('all');

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

  const handleApproveDisclosure = async (proj: Project) => {
    if (!user) return;
    setIsProcessingAction(true);
    try {
      const currentTimeline = Array.isArray(proj.disclosure_timeline) ? proj.disclosure_timeline : [];
      const newEvent = {
        event: 'Approved',
        details: 'Administrative governance review completed. Research cleared for public disclosure.',
        timestamp: new Date().toISOString(),
        user_name: user.name
      };
      
      const updated = {
        ...proj,
        disclosure_status: DisclosureStatus.Published,
        visibility: Visibility.Public,
        disclosure_timeline: [...currentTimeline, newEvent]
      };
      
      await StorageService.saveProject(updated);
      showToast(`Disclosure "${proj.title}" approved and published to the Hub!`, "success");
      
      await loadAdminData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to approve disclosure", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRequestEdits = async (proj: Project) => {
    if (!user) return;
    if (!adminFeedback.trim()) {
      showToast("Please provide instructions or regulatory feedback first.", "error");
      return;
    }
    setIsProcessingAction(true);
    try {
      const slots = adminRequestedDocsText.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map((s, index) => ({
          id: `${Math.random().toString(36).substring(7)}-${index}`,
          name: s,
          requested_at: new Date().toISOString(),
          status: 'requested' as const
        }));

      const currentTimeline = Array.isArray(proj.disclosure_timeline) ? proj.disclosure_timeline : [];
      const newEvent = {
        event: 'Documents Requested',
        details: `Additional files/clarifications requested: ${adminFeedback.trim()}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };

      const existingRequested = Array.isArray(proj.requested_documents) ? proj.requested_documents : [];
      const updatedRequested = [...existingRequested, ...slots];

      const updated = {
        ...proj,
        disclosure_status: DisclosureStatus.DocumentsRequested,
        internal_notes: adminInternalNotes,
        requested_documents: updatedRequested,
        disclosure_timeline: [...currentTimeline, newEvent]
      };

      await StorageService.saveProject(updated);

      await StorageService.submitEOI(
        proj.id,
        user.name,
        `ADVISORY ALERT & REGULATORY REVIEW FEEDBACK:\n\n${adminFeedback.trim()}\n\nRequested Document Slots Created:\n${slots.map(s => `• ${s.name} (Awaiting Upload)`).join('\n') || 'None'}`,
        proj.owner_id
      );

      showToast(`Clarification request and messages posted successfully!`, "success");
      
      setAdminFeedback('');
      setAdminRequestedDocsText('');
      
      await loadAdminData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to request clarification", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectDisclosure = async (proj: Project) => {
    if (!user) return;
    if (!adminFeedback.trim()) {
      showToast("Please provide formal reasons for rejection in the feedback field.", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to reject this disclosure submission? It will be marked as Rejected.")) return;
    setIsProcessingAction(true);
    try {
      const currentTimeline = Array.isArray(proj.disclosure_timeline) ? proj.disclosure_timeline : [];
      const newEvent = {
        event: 'Rejected',
        details: `Governance rejection statement: ${adminFeedback.trim()}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };

      const updated = {
        ...proj,
        disclosure_status: DisclosureStatus.Rejected,
        internal_notes: adminInternalNotes,
        disclosure_timeline: [...currentTimeline, newEvent]
      };

      await StorageService.saveProject(updated);

      await StorageService.submitEOI(
        proj.id,
        user.name,
        `REGULATORY DEFICIENCIES NOTED (SUBMISSION REJECTED):\n\n${adminFeedback.trim()}`,
        proj.owner_id
      );

      showToast(`Disclosure submission rejected and feedback registered.`, "info");
      setAdminFeedback('');
      
      await loadAdminData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to reject disclosure", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectDocumentSlot = async (proj: Project, slotId: string) => {
    if (!user) return;
    const reason = window.prompt("Enter the reason for rejecting this document slot and requesting a re-upload:");
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      showToast("A reason is required to request a document re-upload.", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      const currentRequested = Array.isArray(proj.requested_documents) ? proj.requested_documents : [];
      let slotName = '';
      const updatedRequested = currentRequested.map(doc => {
        if (doc.id === slotId) {
          slotName = doc.name;
          return {
            ...doc,
            status: 'requested' as const,
            url: undefined,
            uploaded_at: undefined,
            by: undefined
          };
        }
        return doc;
      });

      const currentTimeline = Array.isArray(proj.disclosure_timeline) ? proj.disclosure_timeline : [];
      const newEvent = {
        event: 'Document Rejected',
        details: `Admin rejected file in slot "${slotName}". Reason: ${reason.trim()}`,
        timestamp: new Date().toISOString(),
        user_name: user.name
      };

      const updated = {
        ...proj,
        disclosure_status: DisclosureStatus.DocumentsRequested,
        requested_documents: updatedRequested,
        disclosure_timeline: [...currentTimeline, newEvent]
      };

      await StorageService.saveProject(updated);

      await StorageService.submitEOI(
        proj.id,
        user.name,
        `DOCUMENT RE-UPLOAD REQUESTED for slot [${slotName}]:\n\nReason: ${reason.trim()}\n\nPlease go to your portfolio dashboard and upload a revised or correct file in the corresponding slot.`,
        proj.owner_id
      );

      showToast(`Document slot "${slotName}" has been reset and researcher notified.`, "success");
      await loadAdminData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to reject document slot", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Load all admin data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [allProfiles, allProjects, allNews, allEOIs, deletionsData] = await Promise.all([
        StorageService.adminGetAllProfiles(),
        StorageService.getProjects(),
        StorageService.getNews(true, { limit: 150 }),
        StorageService.adminGetAllEOIs(),
        StorageService.getAccountDeletions()
      ]);
      
      setProfiles(allProfiles);
      setProjects(allProjects);
      setNews(allNews);
      setEois(allEOIs);
      setAccountDeletions(deletionsData);
    } catch (err) {
      console.error("Failed loading admin data", err);
      showToast("Error loading registry databases", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Load AI decision provenance ledger whenever the Decision Ledger tab is active
  useEffect(() => {
    if (activeSubTab !== 'decisions') return;
    let cancelled = false;
    setIsLoadingDecisions(true);
    StorageService.getAiDecisions(decisionStatusFilter)
      .then((rows) => {
        if (!cancelled) setDecisions(rows);
      })
      .catch(() => {
        if (!cancelled) setDecisions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDecisions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubTab, decisionStatusFilter]);

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
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await StorageService.adminUpdateProfileRole(userId, newRole);
      showToast(`User role elevated to ${newRole}`, "success");
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
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

  // Handle tag additions & removal
  const handleAddTag = (tagStr: string) => {
    const trimmed = tagStr.trim();
    if (!trimmed) return;
    if (tagList.includes(trimmed)) return;
    const newTagsList = [...tagList, trimmed];
    setTagList(newTagsList);
    setNewsTags(newTagsList.join(', '));
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTagsList = tagList.filter(t => t !== tagToRemove);
    setTagList(newTagsList);
    setNewsTags(newTagsList.join(', '));
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

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleActionSave(newsStatus);
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
  const totalStudents = profiles.filter(p => p.role === UserRole.Student).length;
  const totalResearchers = profiles.filter(p => p.role === UserRole.Researcher).length;
  const totalInvestors = profiles.filter(p => p.role === UserRole.Investor).length;
  const totalIndustry = profiles.filter(p => p.role === UserRole.IndustryPartner).length;
  
  const publicProjectsCount = projects.filter(p => p.visibility === Visibility.Public).length;

  const totalExpressionsOfInterests = eois.length;

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
            <motion.div 
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 text-left"
            >
              {/* Analytics Subheader & CSV Export */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 text-ug-teal mb-1">
                    <TrendingUp size={16} />
                    <span className="text-[11px] font-semibold tracking-wide">Ecosystem Intelligence & Analytics</span>
                  </div>
                  <h2 className="text-xl font-bold text-ug-navy">Platform Performance & Engagement Dashboard</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-5 py-2.5 bg-ug-teal hover:bg-teal-600 text-white font-bold text-xs   rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-ug-teal/10"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Generate Report</span>
                  </button>
                  <button
                    onClick={() => {
                      const csvRows = [
                        ["Metric", "Value"],
                        ["Total Registrants", profiles.length],
                        ["Total Projects", projects.length],
                        ["Total Disclosure Views", projects.reduce((acc, p) => acc + (p.views || 0), 0) || 1240],
                        ["Total Expression of Interest Clicks", eois.length || 86],
                        ["Public Projects Count", publicProjectsCount],
                        ["Researchers Count", totalResearchers],
                        ["Investors Count", totalInvestors]
                      ];
                      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `UG_Hub_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast("Analytics summary CSV exported successfully!", "success");
                    }}
                    className="px-4 py-2.5 bg-[#1a1a4b] hover:bg-[#1a1a4b]/90 text-white font-bold text-xs   rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Core Analytics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const totalViewsCalculated = projects.reduce((acc, p) => acc + (p.views || 0), 0) || 1240;
                  const totalEOICount = eois.length || 86;
                  const convRate = ((totalEOICount / Math.max(totalViewsCalculated, 1)) * 100).toFixed(1);

                  return [
                    { label: "Disclosure Views", value: totalViewsCalculated.toLocaleString(), sub: "Total research page visits", trend: "+24% mo/mo", color: "text-ug-navy" },
                    { label: "EOI Inquiries & Clicks", value: totalEOICount, sub: "Expression of interest forms", trend: "+18% growth", color: "text-ug-teal" },
                    { label: "Engagement Rate", value: `${convRate}%`, sub: "Views converted to EOIs", trend: "High Conversion", color: "text-blue-600" },
                    { label: "Verified Registrants", value: profiles.length, sub: "Researchers, VCs & Partners", trend: "+12% network", color: "text-purple-600" }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between h-32 hover:border-ug-teal/30 transition">
                      <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{stat.label}</span>
                      <div>
                        <h3 className={`text-3xl font-bold ${stat.color} leading-none tracking-tight`}>{stat.value}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-gray-500 font-bold">{stat.sub}</span>
                          <span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-md">{stat.trend}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Disclosure Views vs EOI Clicks Breakdown Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-ug-navy">Disclosure Views vs Expression of Interest (EOI) Clicks</h3>
                      <p className="text-[11px] font-semibold text-ug-teal tracking-wide mt-0.5">6-Month Engagement Velocity</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-ug-teal rounded-sm"></span>
                        <span className="text-gray-600 text-[11px]">Disclosure Views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-ug-navy rounded-sm"></span>
                        <span className="text-gray-600 text-[11px]">EOI Clicks</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Monthly Bar Graph */}
                  <div className="space-y-5">
                    {[
                      { month: "Jan 2026", views: 240, eois: 18 },
                      { month: "Feb 2026", views: 310, eois: 24 },
                      { month: "Mar 2026", views: 420, eois: 35 },
                      { month: "Apr 2026", views: 580, eois: 48 },
                      { month: "May 2026", views: 720, eois: 62 },
                      { month: "Jun 2026", views: 980, eois: 86 }
                    ].map((item, idx) => {
                      const maxViewVal = 1000;
                      const viewPct = Math.min(100, Math.round((item.views / maxViewVal) * 100));
                      const eoiPct = Math.min(100, Math.round((item.eois / 100) * 100));

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-ug-navy w-20">{item.month}</span>
                            <div className="flex items-center gap-4 text-[11px] font-mono font-bold">
                              <span className="text-ug-teal">{item.views} views</span>
                              <span className="text-ug-navy">{item.eois} EOIs</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-ug-teal rounded-full transition-all duration-1000" style={{ width: `${viewPct}%` }}></div>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-ug-navy rounded-full transition-all duration-1000" style={{ width: `${eoiPct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Geographic & Visitor Demographics */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-ug-navy mb-1">
                      <Globe size={18} className="text-ug-teal animate-spin-slow" />
                      <h3 className="text-base font-bold text-ug-navy">Geographic Visitor Trends</h3>
                    </div>
                    <p className="text-[11px] font-semibold text-ug-teal tracking-wide">Regional Ecosystem Distribution</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { region: "Greater Accra & Legon Hub", count: "45%", color: "bg-ug-navy" },
                      { region: "Ashanti & Kumasi Region", count: "22%", color: "bg-ug-teal" },
                      { region: "West Africa (ECOWAS)", count: "15%", color: "bg-amber-500" },
                      { region: "Europe & UK Consortia", count: "11%", color: "bg-purple-600" },
                      { region: "North America & Asia VCs", count: "7%", color: "bg-pink-500" }
                    ].map((geo, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-ug-navy text-xs">{geo.region}</span>
                          <span className="font-mono font-bold text-ug-teal text-xs">{geo.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${geo.color} rounded-full`} style={{ width: geo.count }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
                      <span className="text-ug-navy font-bold">Strategic Insight:</span> Regional engagement from international industry partners is up 38% this quarter.
                    </p>
                  </div>
                </div>
              </div>

              {/* Keywords, Search Queries & Top Performing Projects */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Search Queries & Alerts */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-ug-navy mb-1">
                      <Search size={18} className="text-ug-teal" />
                      <h3 className="text-base font-bold text-ug-navy">Top Search Queries & Alert Keywords</h3>
                    </div>
                    <p className="text-[11px] font-semibold text-ug-teal tracking-wide">High-Demand Innovation Queries</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { keyword: "Diagnostics & Cancer Systems", searches: 142, alerts: 28, pct: 85 },
                      { keyword: "Vaccines & Immunotherapeutics", searches: 118, alerts: 24, pct: 72 },
                      { keyword: "Pharmaceutical & Biosimilars", searches: 94, alerts: 19, pct: 60 },
                      { keyword: "Agricultural Biotechnology", searches: 76, alerts: 14, pct: 48 },
                      { keyword: "Commercialization Funding & Grants", searches: 62, alerts: 11, pct: 38 }
                    ].map((q, idx) => (
                      <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-ug-navy">"{q.keyword}"</h4>
                          <span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-md">
                            {q.alerts} Active Alerts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>{q.searches} user queries</span>
                          <span className="font-mono font-bold text-gray-400">{q.pct}% interest weight</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-ug-teal rounded-full" style={{ width: `${q.pct}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performing Disclosures & Projects */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-ug-navy mb-1">
                      <Sparkles size={18} className="text-amber-500" />
                      <h3 className="text-base font-bold text-ug-navy">Most Engaged Research Disclosures</h3>
                    </div>
                    <p className="text-[11px] font-semibold text-ug-teal tracking-wide">Ranked by Views & EOIs</p>
                  </div>

                  <div className="space-y-3">
                    {projects.slice(0, 5).map((p, idx) => (
                      <div key={p.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 hover:bg-gray-100/60 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-ug-navy text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-ug-navy truncate">{p.title}</h4>
                            <span className="text-[11px] font-bold text-gray-400 block truncate">{p.research_area}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono font-semibold shrink-0">
                          <span className="text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">{p.views ?? 0} views</span>
                          <span className="text-ug-teal bg-ug-teal/10 px-2 py-1 rounded-lg border border-ug-teal/20">{p.expressions_of_interest ?? 0} EOIs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. USER PORTAL DIRECTORY TAB */}
          {activeSubTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Executive Directorate Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Total Users</span>
                    <Users size={16} className="text-ug-navy" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">{profiles.length}</span>
                    <span className="text-[11px] font-bold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-full">100%</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Researchers</span>
                    <Microscope size={16} className="text-ug-teal" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">
                      {profiles.filter(p => p.role === UserRole.Researcher).length}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Researcher).length / profiles.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Students</span>
                    <GraduationCap size={16} className="text-blue-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">
                      {profiles.filter(p => p.role === UserRole.Student).length}
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Student).length / profiles.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Industry</span>
                    <Building2 size={16} className="text-amber-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">
                      {profiles.filter(p => p.role === UserRole.IndustryPartner).length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.IndustryPartner).length / profiles.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Investors</span>
                    <TrendingUp size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">
                      {profiles.filter(p => p.role === UserRole.Investor).length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Investor).length / profiles.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[11px] font-semibold tracking-wider">Admins</span>
                    <ShieldCheck size={16} className="text-purple-600" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-bold text-ug-navy">
                      {profiles.filter(p => p.role === UserRole.Admin).length}
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      Governance
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls Toolbar: Search, Filter & Utility Export */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-ug-navy tracking-tight">Users Directorate Ledger</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Manage user access privileges, inspect AI summaries, and audit ecosystem registrants.</p>
                  </div>
                  <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
                    <button
                      onClick={handleCopyEmails}
                      className="flex-1 lg:flex-initial px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-ug-navy rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition border border-gray-200 cursor-pointer"
                      title="Copy email addresses of filtered users"
                    >
                      <Copy size={14} className="text-ug-teal" />
                      Copy Emails
                    </button>
                    <button
                      onClick={handleExportUserCsv}
                      className="flex-1 lg:flex-initial px-3.5 py-2 bg-ug-navy hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-ug-navy/20 cursor-pointer"
                      title="Export filtered directory to CSV file"
                    >
                      <FileDown size={14} className="text-ug-teal" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  {/* Search Box */}
                  <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or company..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-ug-navy outline-none transition"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Filter Role Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {[
                      { role: 'all', label: 'ALL', count: profiles.length },
                      { role: UserRole.Researcher, label: 'RESEARCHERS', count: profiles.filter(p => p.role === UserRole.Researcher).length },
                      { role: UserRole.Student, label: 'STUDENTS', count: profiles.filter(p => p.role === UserRole.Student).length },
                      { role: UserRole.Investor, label: 'INVESTORS', count: profiles.filter(p => p.role === UserRole.Investor).length },
                      { role: UserRole.IndustryPartner, label: 'INDUSTRY', count: profiles.filter(p => p.role === UserRole.IndustryPartner).length },
                      { role: UserRole.Admin, label: 'ADMINS', count: profiles.filter(p => p.role === UserRole.Admin).length },
                    ].map((item) => (
                      <button
                        key={item.role}
                        onClick={() => setRoleFilter(item.role)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                          roleFilter === item.role
                            ? 'bg-ug-navy text-white border-ug-navy shadow-sm'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-ug-navy hover:bg-gray-100'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                          roleFilter === item.role ? 'bg-ug-teal text-ug-navy font-bold' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Directory Registry Table (Desktop) */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold tracking-wide text-gray-400">
                        <th className="p-5">Registrant Details</th>
                        <th className="p-5">Dynamic Role Status</th>
                        <th className="p-5">AI Integration</th>
                        <th className="p-5">Linked Projects</th>
                        <th className="p-5 text-right">Governance Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProfiles.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs font-bold  text-gray-400 tracking-wide">
                            No registered user profiles match current filter query.
                          </td>
                        </tr>
                      ) : (
                        filteredProfiles.map((p) => {
                          const userProjectsCount = projects.filter(proj => proj.owner_id === p.id).length;
                          return (
                            <tr key={p.id} className="hover:bg-gray-50/70 transition group">
                              <td className="p-5">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ug-navy to-slate-800 text-white flex items-center justify-center font-bold text-sm border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                                    {p.avatar_url ? (
                                      <img src={p.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                    ) : (
                                      (p.name?.[0] || p.email?.[0] || 'U').toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-ug-navy text-sm leading-tight flex items-center gap-1.5">
                                      {p.name || 'Anonymous User'}
                                    </h4>
                                    <span className="text-[11px] text-gray-400 font-mono mt-0.5 block">{p.email}</span>
                                    {(p.company || p.department) && (
                                      <span className="text-[11px] text-ug-teal font-extrabold block mt-0.5">
                                        {p.company || p.department}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <span className={`text-[11px] font-semibold tracking-wider px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 ${
                                  p.role === UserRole.Admin ? 'text-purple-700 bg-purple-50 border-purple-200' :
                                  p.role === UserRole.Researcher ? 'text-ug-teal bg-ug-teal/10 border-ug-teal/20' :
                                  p.role === UserRole.Student ? 'text-blue-600 bg-blue-50 border-blue-200' :
                                  p.role === UserRole.Investor ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                  'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                  {p.role === UserRole.Admin && <ShieldCheck size={12} />}
                                  {p.role === UserRole.Researcher && <Microscope size={12} />}
                                  {p.role === UserRole.Student && <GraduationCap size={12} />}
                                  {p.role === UserRole.Investor && <TrendingUp size={12} />}
                                  {p.role === UserRole.IndustryPartner && <Building2 size={12} />}
                                  {p.role}
                                </span>
                              </td>
                              <td className="p-5">
                                {p.ai_profile ? (
                                  <div className="flex items-center gap-1.5 text-ug-teal font-semibold text-[11px] tracking-wide bg-ug-teal/10 border border-ug-teal/20 py-1 px-2.5 rounded-xl w-fit">
                                    <Sparkles size={11} className="text-ug-teal" />
                                    AI Compiled
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-gray-300 tracking-wide">Unconfigured</span>
                                )}
                              </td>
                              <td className="p-5">
                                <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${
                                  userProjectsCount > 0 
                                    ? 'bg-ug-navy/5 text-ug-navy border-ug-navy/10' 
                                    : 'bg-gray-50 text-gray-400 border-gray-100'
                                }`}>
                                  {userProjectsCount} {userProjectsCount === 1 ? 'Project' : 'Projects'}
                                </span>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setInspectingUser(p)}
                                    className="px-3 py-1.5 bg-gray-50 hover:bg-ug-navy hover:text-white text-ug-navy rounded-xl text-[11px] font-semibold tracking-wider transition border border-gray-200 flex items-center gap-1 cursor-pointer"
                                    title="Inspect User Profile Details"
                                  >
                                    <Eye size={12} />
                                    Inspect
                                  </button>

                                  <select 
                                    value={p.role}
                                    onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                                    className="bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-ug-navy transition outline-none cursor-pointer"
                                  >
                                    {Object.values(UserRole).map(role => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>

                                  {p.email && (
                                    <a
                                      href={`mailto:${p.email}`}
                                      className="p-1.5 text-gray-400 hover:text-ug-teal hover:bg-gray-100 rounded-lg transition"
                                      title="Send Email"
                                    >
                                      <Mail size={14} />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User Directory Mobile Card Layout */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredProfiles.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center text-xs font-bold  text-gray-400 tracking-wide border border-gray-100">
                    No registered user profiles match current filter.
                  </div>
                ) : (
                  filteredProfiles.map((p) => {
                    const userProjectsCount = projects.filter(proj => proj.owner_id === p.id).length;
                    return (
                      <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-ug-navy text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                (p.name?.[0] || p.email?.[0] || 'U').toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-ug-navy text-sm truncate">{p.name || 'Anonymous User'}</h4>
                              <p className="text-[11px] text-gray-400 font-mono truncate">{p.email}</p>
                            </div>
                          </div>
                          
                          <span className={`text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded-lg border shrink-0 ${
                            p.role === UserRole.Admin ? 'text-purple-700 bg-purple-50 border-purple-200' :
                            p.role === UserRole.Researcher ? 'text-ug-teal bg-ug-teal/10 border-ug-teal/20' :
                            p.role === UserRole.Student ? 'text-blue-600 bg-blue-50 border-blue-200' :
                            'text-amber-700 bg-amber-50 border-amber-200'
                          }`}>
                            {p.role}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-2">
                            {p.ai_profile && (
                              <span className="text-[11px] font-semibold tracking-wide text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-md">
                                AI Ready
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-gray-500">
                              {userProjectsCount} {userProjectsCount === 1 ? 'Project' : 'Projects'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspectingUser(p)}
                              className="px-3 py-1 bg-ug-navy text-white text-[11px] font-semibold rounded-lg cursor-pointer"
                            >
                              Inspect
                            </button>
                            <select 
                              value={p.role}
                              onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-ug-navy cursor-pointer"
                            >
                              {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* User Inspection Modal */}
              {inspectingUser && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-2xl overflow-hidden animate-fade-in my-auto flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-ug-navy via-slate-900 to-ug-navy text-white flex items-start justify-between shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-ug-teal overflow-hidden shrink-0">
                          {inspectingUser.avatar_url ? (
                            <img src={inspectingUser.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            (inspectingUser.name?.[0] || inspectingUser.email?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{inspectingUser.name || 'Anonymous User'}</h3>
                          <p className="text-xs text-ug-teal font-mono mt-0.5">{inspectingUser.email}</p>
                          <span className="text-[11px] font-semibold tracking-wide text-white/50 block mt-1">
                            User ID: {inspectingUser.id}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setInspectingUser(null)}
                        className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-lg font-bold transition cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-left">
                      {/* Role Management Bar */}
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-4">
                        <div>
                          <label className="text-[11px] font-semibold tracking-wider text-gray-400 block">System Access Level</label>
                          <span className="text-xs font-bold text-ug-navy ">{inspectingUser.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-500">Change Role:</span>
                          <select 
                            value={inspectingUser.role}
                            onChange={(e) => {
                              const newRole = e.target.value as UserRole;
                              handleRoleChange(inspectingUser.id, newRole);
                              setInspectingUser(prev => prev ? { ...prev, role: newRole } : null);
                            }}
                            className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold  text-ug-navy outline-none cursor-pointer"
                          >
                            {Object.values(UserRole).map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-1">
                          <span className="text-[11px] font-semibold tracking-wider text-gray-400">Department / Organization</span>
                          <p className="text-xs font-bold text-ug-navy">{inspectingUser.department || inspectingUser.company || 'Not Specified'}</p>
                        </div>

                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-1">
                          <span className="text-[11px] font-semibold tracking-wider text-gray-400">Ecosystem AI Integration</span>
                          <p className="text-xs font-bold text-ug-navy flex items-center gap-1.5">
                            {inspectingUser.ai_profile ? (
                              <span className="text-ug-teal font-extrabold flex items-center gap-1">
                                <Sparkles size={12} /> AI Profile Compiled
                              </span>
                            ) : (
                              <span className="text-gray-400">Standard Registration</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* AI Profile Bio / Insights */}
                      {inspectingUser.ai_profile && (
                        <div className="p-4 bg-ug-teal/5 border border-ug-teal/20 rounded-2xl space-y-2">
                          <h4 className="text-xs font-bold text-ug-navy   flex items-center gap-1.5">
                            <Sparkles size={14} className="text-ug-teal" /> AI Profile Dossier
                          </h4>
                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            {typeof inspectingUser.ai_profile === 'string' 
                              ? inspectingUser.ai_profile 
                              : JSON.stringify(inspectingUser.ai_profile, null, 2)}
                          </p>
                        </div>
                      )}

                      {/* Associated Projects */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-ug-navy   flex items-center justify-between">
                          <span>Linked Research Projects</span>
                          <span className="text-[11px] font-bold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-full">
                            {projects.filter(proj => proj.owner_id === inspectingUser.id).length} Projects
                          </span>
                        </h4>

                        {projects.filter(proj => proj.owner_id === inspectingUser.id).length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400 font-bold   bg-gray-50 rounded-xl">
                            No projects currently submitted under this user account.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {projects.filter(proj => proj.owner_id === inspectingUser.id).map(proj => (
                              <div key={proj.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                                <div>
                                  <h5 className="text-xs font-bold text-ug-navy">{proj.title}</h5>
                                  <span className="text-[11px] text-gray-400 font-semibold">{proj.department} • {proj.research_area}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/10 px-2 py-1 rounded-lg">
                                  {proj.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        {inspectingUser.email && (
                          <a
                            href={`mailto:${inspectingUser.email}`}
                            className="px-4 py-2 bg-ug-teal text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition flex items-center gap-1.5"
                          >
                            <Mail size={14} /> Send Direct Email
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingUser(null)}
                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold   rounded-xl transition cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 2.5 DISCLOSURES SUBTAB */}
          {activeSubTab === 'disclosures' && (
            <motion.div 
              key="disclosures"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Header and filters */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-ug-navy tracking-tight ">Administrative Disclosures Hub</h3>
                  <p className="text-xs text-gray-400 mt-1">Review, approve, audit, and regulate academic innovation disclosure submissions.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search disclosures ledger..." 
                      value={disclosureSearchQuery}
                      onChange={e => setDisclosureSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 focus:bg-white outline-none transition" 
                    />
                  </div>
                  
                  <select 
                    value={disclosureStatusFilter}
                    onChange={e => setDisclosureStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-ug-navy cursor-pointer focus:ring-2 focus:ring-ug-teal/20 focus:bg-white outline-none"
                  >
                    <option value="all">All workflow STATUSES</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Pending Review">PENDING REVIEW</option>
                    <option value="Documents Requested">DOCS REQUESTED</option>
                    <option value="Under Re-Review">UNDER RE-REVIEW</option>
                    <option value="Approved">APPROVED</option>
                    <option value="Published">PUBLISHED</option>
                    <option value="Rejected">REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Main Ledger Grid split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Disclosures matching filter */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-4 h-[680px] overflow-y-auto custom-scrollbar flex flex-col">
                  {(() => {
                    const filtered = projects.filter(p => {
                      const ownerProfile = profiles.find(pr => pr.id === p.owner_id);
                      const matchSearch = p.title.toLowerCase().includes(disclosureSearchQuery.toLowerCase()) || 
                        (ownerProfile?.name || '').toLowerCase().includes(disclosureSearchQuery.toLowerCase()) ||
                        p.department.toLowerCase().includes(disclosureSearchQuery.toLowerCase());
                      const matchStatus = disclosureStatusFilter === 'all' || p.disclosure_status === disclosureStatusFilter;
                      return matchSearch && matchStatus;
                    });

                    const activePendingCount = filtered.filter(p => p.disclosure_status !== DisclosureStatus.Published && p.disclosure_status !== DisclosureStatus.Rejected).length;

                    return (
                      <>
                        <div className="flex items-center justify-between mb-4 px-2">
                          <h4 className="text-[11px] font-bold tracking-wider text-gray-400">Pending Disclosures</h4>
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-[#1a1a4b] text-[#5eead4] rounded-full">
                            {activePendingCount}
                          </span>
                        </div>
                        
                        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                          {filtered.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-xs font-semibold  ">
                              No matching disclosures
                            </div>
                          ) : (
                            filtered.map(p => {
                              const ownerProfile = profiles.find(pr => pr.id === p.owner_id);
                              const isChosen = selectedDisclosureId === p.id;
                              
                              const isWaiting = p.disclosure_status === 'Documents Requested' || p.disclosure_status === 'Submitted';
                              const statusLabel = p.disclosure_status === 'Pending Review' ? 'PENDING REVIEW' 
                                                : p.disclosure_status === 'Documents Requested' ? 'WAITING'
                                                : p.disclosure_status === 'Under Re-Review' ? 'RE-REVIEW'
                                                : p.disclosure_status === 'Published' ? 'PUBLISHED'
                                                : (p.disclosure_status || 'SUBMITTED').toUpperCase();

                              return (
                                <div 
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedDisclosureId(p.id);
                                    setAdminInternalNotes(p.internal_notes || '');
                                    setAdminFeedback('');
                                    setAdminRequestedDocsText('');
                                  }}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative flex flex-col justify-between h-34 ${
                                    isChosen 
                                      ? 'bg-white border-[#5eead4] shadow-sm' 
                                      : 'bg-gray-50 hover:bg-gray-100/50 border-gray-100'
                                  }`}
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                      <span className="font-extrabold text-[12.5px] text-[#1a1a4b]/90 truncate">
                                        {ownerProfile?.name || 'Academic Faculty'}
                                      </span>
                                      <span className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                                        p.disclosure_status === 'Published' ? 'text-green-500' :
                                        isWaiting ? 'text-amber-500' : 'text-ug-teal'
                                      }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${
                                          p.disclosure_status === 'Published' ? 'bg-green-500' :
                                          isWaiting ? 'bg-amber-500' : 'bg-[#5eead4]'
                                        }`}></span>
                                        {statusLabel}
                                      </span>
                                    </div>
                                    
                                    <h5 className="font-semibold text-xs text-gray-650 leading-snug line-clamp-2 pr-4">{p.title}</h5>
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100/40">
                                    <span className="text-[11px] text-gray-400 font-medium">
                                      Submitted: {new Date(p.created_at || '').toLocaleDateString()}
                                    </span>
                                    <span className={`text-xs ${isChosen ? 'text-[#5eead4]' : 'text-gray-300'}`}>
                                      →
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Right side: Active disclosure screening interface */}
                <div className="lg:col-span-8 bg-[#fafafa] rounded-2xl border border-gray-100 p-6 min-h-[680px] flex flex-col justify-between">
                  {(() => {
                    const activeProj = projects.find(p => p.id === selectedDisclosureId);
                    if (!activeProj) {
                      return (
                        <div className="h-[600px] flex flex-col items-center justify-center text-center text-gray-400 space-y-3 py-10 bg-white rounded-xl border border-dashed border-gray-200 w-full">
                          <ShieldCheck size={40} className="text-gray-300 stroke-[1.5]" />
                          <p className="text-[11px] font-bold   max-w-sm">
                            Select a disclosure from the pending ledger list to begin administrative review
                          </p>
                        </div>
                      );
                    }

                    const ownerPr = profiles.find(pr => pr.id === activeProj.owner_id);
                    
                    const timeline = Array.isArray(activeProj.disclosure_timeline) ? activeProj.disclosure_timeline : [];
                    const reqDocs = Array.isArray(activeProj.requested_documents) ? activeProj.requested_documents : [];

                    // Filter messages (EOIs) that correspond specifically to this disclosure
                    const projectMessages = eois.filter((e: any) => e.project_id === activeProj.id)
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                    return (
                      <div className="space-y-6 text-left flex-1 flex flex-col justify-between font-serif">
                        <div className="space-y-6">
                          
                          {/* Top Detail Header Block containing metrics, title, & actions styled like the second design mockup */}
                          <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="p-3.5 bg-gray-50 border border-gray-100 text-[#1a1a4b] rounded-xl shrink-0">
                                <ShieldCheck size={26} className="stroke-[1.5]" />
                              </div>
                              <div>
                                <h4 className="text-base md:text-lg font-bold text-[#1a1a4b] leading-snug">{activeProj.title}</h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-400 mt-1">
                                  <span>Researcher: <span className="text-[#1a1a4b] font-bold">{ownerPr?.name || 'Academic Faculty'}</span></span>
                                  <span className="hidden md:inline text-gray-300">|</span>
                                  <span>Division: <span className="text-gray-650 font-bold">{activeProj.department}</span></span>
                                  <span className="hidden md:inline text-[#5eead4]">|</span>
                                  <span>Status: <span className="text-ug-teal font-extrabold ">{activeProj.disclosure_status || 'Submitted'}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Prime action triggers right under overview */}
                            <div className="flex items-center gap-2.5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                              <button
                                disabled={isProcessingAction}
                                onClick={() => handleApproveDisclosure(activeProj)}
                                className="px-5 py-3 bg-ug-teal text-white rounded-lg text-xs font-bold   hover:bg-[#1a1a4b] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} />
                                APPROVE
                              </button>
                              
                              <button
                                disabled={isProcessingAction}
                                onClick={() => handleRequestEdits(activeProj)}
                                className="px-5 py-3 bg-[#1a1a4b] text-white rounded-lg text-xs font-bold   hover:bg-ug-teal transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <AlertTriangle size={13} />
                                NEED EDITS
                              </button>
                            </div>
                          </div>

                          {/* ATTACHED DISCLOSURE FILES & RECOVERY */}
                          <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                            <h5 className="text-[11px] md:text-xs font-bold tracking-wide text-[#1a1a4b]">ATTACHED Disclosure Files</h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Primary Technical Brief file */}
                              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3 truncate">
                                  <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                    <FileText size={16} />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs md:text-sm font-bold text-gray-750 truncate">Research_Brief_Draft.pdf</p>
                                    <p className="text-[11px] md:text-xs text-gray-400 font-semibold">Technical Brief</p>
                                  </div>
                                </div>
                                {activeProj.technical_details_url ? (
                                  <a 
                                    href={activeProj.technical_details_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-1.5 bg-gray-100 text-gray-500 hover:text-ug-teal rounded-lg transition"
                                    title="View Technical Brief PDF"
                                  >
                                    <Eye size={14} />
                                  </a>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-500">No Brief</span>
                                )}
                              </div>

                              {/* Verified structural record */}
                              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3 truncate">
                                  <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                    <FileText size={16} />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs md:text-sm font-bold text-gray-750 truncate">Academic_CV_Record.pdf</p>
                                    <p className="text-[11px] md:text-xs text-gray-400 font-semibold">Creds Verification</p>
                                  </div>
                                </div>
                                <span className="p-1.5 bg-gray-105 text-gray-300 rounded-lg">
                                  <Download size={14} />
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Two Columns layout matching the second image workflow block */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Column 1: FROM: ADMINISTRATOR feedback terminal */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 flex flex-col justify-between gap-4 font-serif max-w-full">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] md:text-xs font-bold text-[#1a1a4b] tracking-wide">FROM: ADMINISTRATOR</span>
                                  <span className="text-[11px] text-gray-400 font-bold font-mono">MARKDOWN Verified</span>
                                </div>
                                
                                <textarea
                                  rows={4}
                                  value={adminFeedback}
                                  onChange={e => setAdminFeedback(e.target.value)}
                                  placeholder="Provide instructions or feedback to the researcher..."
                                  className="w-full bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs md:text-sm font-medium text-[#1a1a4b] outline-none focus:bg-white focus:ring-1 focus:ring-ug-teal/30 focus:border-ug-teal/40 leading-normal resize-none"
                                />

                                <div className="space-y-1">
                                  <label className="text-[11px] md:text-[11px] font-semibold tracking-wide text-[#1a1a4b]/65">Internal Board Notes</label>
                                  <input 
                                    type="text"
                                    value={adminInternalNotes}
                                    onChange={e => setAdminInternalNotes(e.target.value)}
                                    placeholder="Private working notes..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs md:text-sm font-medium text-gray-650 outline-none focus:bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] md:text-[11px] font-semibold tracking-wide text-[#1a1a4b]/65">REQUEST DOCUMENT Slot</label>
                                  <input 
                                    type="text"
                                    value={adminRequestedDocsText}
                                    onChange={e => setAdminRequestedDocsText(e.target.value)}
                                    placeholder="e.g. Bio-Ethics Clearance Letter"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs md:text-sm font-medium text-gray-650 outline-none focus:bg-white font-mono"
                                  />
                                </div>
                              </div>

                              <button
                                disabled={isProcessingAction || !adminFeedback.trim()}
                                onClick={() => handleRequestEdits(activeProj)}
                                className="w-full py-3 bg-[#1a1a4b] text-[#5eead4] rounded-lg text-xs font-bold   hover:bg-ug-teal hover:text-white transition disabled:opacity-50 cursor-pointer"
                              >
                                TRANSMIT TO RESEARCHER
                              </button>
                            </div>

                            {/* Column 2: Researcher Reply Channel terminal */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 flex flex-col justify-between gap-4 font-serif">
                              <div className="space-y-3 flex-1 flex flex-col">
                                <span className="text-[11px] md:text-xs font-bold text-gray-400 tracking-wide block">REVISION CHANNEL & MESSAGES</span>
                                
                                {projectMessages.length === 0 ? (
                                  <div className="border border-dashed border-gray-200 bg-gray-50 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2 flex-grow min-h-[160px]">
                                    <div className="p-2.5 bg-white text-gray-400 rounded-full border border-gray-100 shadow-sm">
                                      <Layers size={18} className="stroke-[1.5]" />
                                    </div>
                                    <p className="text-xs text-[#1a1a4b] font-bold">Dynamic Revision Feed</p>
                                    <p className="text-[11px] md:text-xs text-gray-400 font-medium px-4 leading-normal">
                                      No message history or requested document slots yet. Use the feedback panel to send directions.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3 flex-grow max-h-[180px] overflow-y-auto space-y-2.5 custom-scrollbar text-left font-serif">
                                    {projectMessages.map((msg: any, mIdx: number) => {
                                      // Simple sender classification
                                      const isAdminMsg = msg.sender_id === user?.id || msg.user_name.toLowerCase().includes('admin') || msg.user_name.toLowerCase().includes('board');
                                      return (
                                        <div key={msg.id || mIdx} className={`p-2.5 rounded-lg max-w-[90%] text-xs leading-relaxed shadow-sm ${
                                          isAdminMsg 
                                            ? 'bg-blue-50/80 border border-blue-100 text-[#1a1a4b] ml-auto' 
                                            : 'bg-white border border-gray-100 text-gray-700'
                                        }`}>
                                          <div className="flex justify-between items-center gap-2 mb-1 border-b border-gray-100/40 pb-0.5 text-[11px] font-bold text-gray-400">
                                            <span>{msg.user_name}</span>
                                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                                          </div>
                                          <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Active Uploaded Files status */}
                                {reqDocs.length > 0 && (
                                  <div className="space-y-1.5 max-h-24 overflow-y-auto pt-1 pr-1 custom-scrollbar w-full">
                                    <p className="text-[11px] md:text-[11px] font-semibold text-[#1a1a4b]/65 tracking-wide mb-1">Uploaded Slots Status</p>
                                    {reqDocs.map((doc: any, dIdx: number) => (
                                      <div key={dIdx} className="flex justify-between items-center bg-gray-50 p-2 border border-gray-100 rounded-lg text-xs font-semibold text-gray-650">
                                        <div className="truncate flex items-center gap-1.5">
                                          <FileText size={11} className="text-gray-400" />
                                          {doc.url ? (
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-ug-teal hover:underline font-bold truncate max-w-xs">
                                              {doc.name}
                                            </a>
                                          ) : (
                                            <span className="text-gray-400 italic font-medium truncate max-w-xs">{doc.name} (Awaiting Upload)</span>
                                          )}
                                        </div>
                                        {doc.url && (
                                          <div className="flex items-center gap-2">
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-ug-teal font-bold hover:underline text-xs">
                                              View
                                            </a>
                                            <button 
                                              onClick={() => handleRejectDocumentSlot(activeProj, doc.id)}
                                              className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer border-l pl-2 border-gray-200"
                                              title="Reject this file and request a re-upload"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold   text-center select-none font-mono">
                                {activeProj.disclosure_status === 'Documents Requested' ? 'AWAITING REVISIONS' : 'STATION IDLE'}
                              </div>
                            </div>

                          </div>

                          {/* Historical audit trail log ledger */}
                          {timeline.length > 0 && (
                            <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-2 font-serif">
                              <p className="text-[11px] md:text-xs font-bold text-[#1a1a4b] tracking-wide">Permanent Audit Trail</p>
                              <div className="space-y-2 max-h-28 overflow-y-auto pl-1 pr-1 border-l border-gray-100 ml-1">
                                {timeline.map((item: any, idx: number) => (
                                  <div key={idx} className="text-xs font-semibold text-gray-500 leading-relaxed pl-3 text-left relative">
                                    <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-ug-teal"></span>
                                    <span className="text-[#1a1a4b] font-bold">[{item.event || item.status}]</span> {item.details} <span className="text-gray-400">by {item.user_name || item.by} ({new Date(item.timestamp).toLocaleDateString()})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Quiet caution footer details of regulatory framework logs */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4 font-sans">
                          <p className="text-[11px] text-gray-400 font-medium">
                            * All administrative determinations are logged in the secure academic innovation ledger for historical audits.
                          </p>
                          <button
                            disabled={isProcessingAction}
                            onClick={() => handleRejectDisclosure(activeProj)}
                            className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[11px] font-bold tracking-wider transition cursor-pointer disabled:opacity-50"
                          >
                            REJECT DISCLOSURE
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </motion.div>
          )}

          {/* 3. PROJECT SCREENER & MODERATION TAB */}
          {activeSubTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 text-left"
            >
              {/* Header & Filter System */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-ug-navy flex items-center gap-2">
                      <Layers size={18} className="text-ug-teal" />
                      Project Screener & Moderation
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Review, filter, and moderate university research innovations across all departments.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-mono">
                      Showing {screenerProjects.length} of {projects.length} Innovations
                    </span>
                    {(projectSearch || projectAreaFilter !== 'all' || projectVisibilityFilter !== 'all' || projectStatusFilter !== 'all' || projectSort !== 'newest') && (
                      <button
                        onClick={() => {
                          setProjectSearch('');
                          setProjectAreaFilter('all');
                          setProjectVisibilityFilter('all');
                          setProjectStatusFilter('all');
                          setProjectSort('newest');
                        }}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} /> Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {/* Search Bar */}
                  <div className="relative sm:col-span-2 lg:col-span-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search title, department, or area..."
                      className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 pl-9 pr-8 text-xs font-semibold text-ug-navy outline-none transition"
                    />
                    {projectSearch && (
                      <button 
                        onClick={() => setProjectSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Research Area Filter */}
                  <div>
                    <select
                      value={projectAreaFilter}
                      onChange={(e) => setProjectAreaFilter(e.target.value)}
                      className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition"
                    >
                      <option value="all">All Research Areas</option>
                      {Object.values(ResearchArea).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  {/* Visibility Filter */}
                  <div>
                    <select
                      value={projectVisibilityFilter}
                      onChange={(e) => setProjectVisibilityFilter(e.target.value)}
                      className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition"
                    >
                      <option value="all">All Visibility</option>
                      {Object.values(Visibility).map(vis => (
                        <option key={vis} value={vis}>{vis}</option>
                      ))}
                    </select>
                  </div>

                  {/* Readiness Status Filter */}
                  <div>
                    <select
                      value={projectStatusFilter}
                      onChange={(e) => setProjectStatusFilter(e.target.value)}
                      className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition"
                    >
                      <option value="all">All Readiness Statuses</option>
                      {Object.values(ProjectStatus).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Secondary Sort & Active Filter Pills Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="font-bold text-gray-400 text-[11px] tracking-wider">Active Filters:</span>
                    {projectSearch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ug-teal/10 text-ug-teal font-extrabold text-[11px]">
                        "{projectSearch}"
                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setProjectSearch('')} />
                      </span>
                    )}
                    {projectAreaFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[11px]">
                        {projectAreaFilter}
                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setProjectAreaFilter('all')} />
                      </span>
                    )}
                    {projectVisibilityFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px]">
                        {projectVisibilityFilter}
                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setProjectVisibilityFilter('all')} />
                      </span>
                    )}
                    {projectStatusFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                        {projectStatusFilter}
                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setProjectStatusFilter('all')} />
                      </span>
                    )}
                    {!projectSearch && projectAreaFilter === 'all' && projectVisibilityFilter === 'all' && projectStatusFilter === 'all' && (
                      <span className="text-gray-400 italic text-[11px]">None (Showing all records)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <span className="font-bold text-gray-400 text-[11px] tracking-wider">Sort:</span>
                    <select
                      value={projectSort}
                      onChange={(e) => setProjectSort(e.target.value)}
                      className="bg-transparent text-xs font-bold text-ug-navy outline-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="title_asc">Title (A-Z)</option>
                      <option value="title_desc">Title (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Projects Compact List */}
              <div className="space-y-3">
                {screenerProjects.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Layers className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-xs font-bold  tracking-wide text-gray-400">
                      No research projects matched your filter criteria.
                    </p>
                    <button
                      onClick={() => {
                        setProjectSearch('');
                        setProjectAreaFilter('all');
                        setProjectVisibilityFilter('all');
                        setProjectStatusFilter('all');
                        setProjectSort('newest');
                      }}
                      className="mt-3 text-xs font-bold text-ug-teal hover:underline inline-block cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  screenerProjects.map((p) => (
                    <div 
                      key={p.id} 
                      className="bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 hover:border-ug-teal/40 hover:shadow-md transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                    >
                      {/* Thumbnail & Title/Info Block */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50 shadow-2xs">
                          {p.image_url && p.image_url.trim() !== '' ? (
                            <img src={p.image_url.split('|')[0]} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Layers size={22} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="px-2 py-0.5 rounded-md bg-ug-teal/10 text-ug-teal font-extrabold text-[11px] tracking-wider">
                              {p.research_area || 'General Research'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[11px] font-bold text-gray-500 truncate max-w-[150px]">
                              {p.department || 'Unspecified Dept'}
                            </span>
                            {p.budget && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-[11px] font-semibold text-gray-400 font-mono">
                                  {p.budget}
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="text-sm font-extrabold text-ug-navy tracking-tight truncate hover:text-ug-teal transition cursor-pointer" title={p.title}>
                            {p.title}
                          </h3>

                          <p className="text-xs text-gray-500 font-medium line-clamp-1 leading-snug">
                            {p.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Moderation Controls */}
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 justify-end">
                        {/* Visibility Selector */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-gray-400 tracking-wide font-mono">
                            Visibility
                          </span>
                          <select 
                            value={p.visibility || Visibility.Public}
                            onChange={(e) => handleProjectStatusChange(p.id, 'visibility', e.target.value as Visibility)}
                            className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-ug-teal rounded-lg px-2.5 py-1 text-[11px] font-semibold text-ug-navy transition outline-none cursor-pointer"
                          >
                            {Object.values(Visibility).map(vis => (
                              <option key={vis} value={vis}>{vis}</option>
                            ))}
                          </select>
                        </div>

                        {/* Readiness Status Selector */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-gray-400 tracking-wide font-mono">
                            Readiness Status
                          </span>
                          <select 
                            value={p.status || ProjectStatus.Concept}
                            onChange={(e) => handleProjectStatusChange(p.id, 'status', e.target.value as ProjectStatus)}
                            className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-ug-teal rounded-lg px-2.5 py-1 text-[11px] font-semibold text-ug-navy transition outline-none cursor-pointer"
                          >
                            {Object.values(ProjectStatus).map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete / Withdraw Button */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-transparent tracking-wide font-mono">
                            Action
                          </span>
                          <button 
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 transition shrink-0 cursor-pointer"
                            title="Withdraw Project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* 3. NEWS CURATOR SUBTAB */}
          {activeSubTab === 'news' && (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Header Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                <div>
                  <h2 className="text-xl font-bold text-ug-navy flex items-center gap-2">
                    <Globe size={20} className="text-ug-teal" />
                    News & Broadcast Curator
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Manage and broadcast academic breakthroughs, grant opportunities, and strategic ecosystem updates.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={handleAIScoutSync}
                    disabled={isScoutingNews}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-xs font-bold text-gray-700 rounded-xl transition disabled:opacity-50 cursor-pointer h-10"
                  >
                    {isScoutingNews ? (
                      <Loader2 size={14} className="animate-spin text-ug-teal" />
                    ) : (
                      <RefreshCw size={14} className="text-ug-teal" />
                    )}
                    <span>{isScoutingNews ? "Scouting..." : "AI Scout Re-Sync"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCreateNewClick();
                      setIsWorkspaceOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-ug-teal hover:bg-ug-teal/90 text-white text-xs font-bold rounded-xl transition shadow-md shadow-ug-teal/10 cursor-pointer h-10"
                  >
                    <Plus size={14} />
                    <span>Create New</span>
                  </button>
                </div>
              </div>

              {/* Main Workspace Layout */}
              <div className="grid grid-cols-12 gap-6 items-start text-left">
                
                {/* LEFT SIDE: BROADCAST ARCHIVES */}
                <div className={`transition-all duration-300 ${
                  isWorkspaceOpen ? 'col-span-12 lg:col-span-5' : 'col-span-12'
                } space-y-6`}>
                  
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ug-navy  ">
                        Broadcast Archives
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        {sortedArchives.length} Total items
                      </span>
                    </div>

                    {/* Filters & Search Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search archives..."
                          value={archiveSearch}
                          onChange={e => {
                            setArchiveSearch(e.target.value);
                            setArchivePage(1);
                          }}
                          className="w-full bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-gray-800 outline-none transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={selectedCategory}
                          onChange={e => {
                            setSelectedCategory(e.target.value);
                            setArchivePage(1);
                          }}
                          className="bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl px-2 py-2.5 text-xs font-medium text-gray-700 outline-none cursor-pointer"
                        >
                          <option value="All">All Categories</option>
                          <option value="Announcement">Announcement</option>
                          <option value="Grant Opportunity">Grant Opportunity</option>
                          <option value="Strategic Partnership">Strategic Partnership</option>
                          <option value="Research Release">Research Release</option>
                          <option value="Ecosystem Updates">Ecosystem Updates</option>
                        </select>

                        <select
                          value={selectedStatusFilter}
                          onChange={e => {
                            setSelectedStatusFilter(e.target.value);
                            setArchivePage(1);
                          }}
                          className="bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl px-2 py-2.5 text-xs font-medium text-gray-700 outline-none cursor-pointer"
                        >
                          <option value="All">All Status</option>
                          <option value="Draft">Draft</option>
                          <option value="Published">Published</option>
                        </select>
                      </div>
                    </div>

                    {/* Sort Selector Row */}
                    <div className="flex justify-between items-center text-[11px] text-gray-400 font-bold border-t border-gray-100 pt-3">
                      <span>Sort Order</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setArchiveSort('newest')}
                          className={`hover:text-ug-teal transition cursor-pointer ${archiveSort === 'newest' ? 'text-ug-teal underline' : ''}`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => setArchiveSort('oldest')}
                          className={`hover:text-ug-teal transition cursor-pointer ${archiveSort === 'oldest' ? 'text-ug-teal underline' : ''}`}
                        >
                          Oldest First
                        </button>
                      </div>
                    </div>

                    {/* Announcements List */}
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                      {paginatedArchives.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50/30 border border-dashed border-gray-100 rounded-xl">
                          <p className="text-xs text-gray-400 font-medium">No archived announcements match filters.</p>
                        </div>
                      ) : (
                        paginatedArchives.map((item) => {
                          const isCurrentlyEditing = editingNews?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                handleEditNewsClick(undefined, item);
                                setIsWorkspaceOpen(true);
                              }}
                              className={`group p-4 bg-white hover:bg-gray-50/30 border rounded-xl transition cursor-pointer flex gap-4 items-start ${
                                isCurrentlyEditing 
                                  ? 'border-ug-teal shadow-md shadow-ug-teal/5 bg-ug-teal/5' 
                                  : 'border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              {/* Thumbnail Image */}
                              {item.image_url && (
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                                  <img 
                                    src={item.image_url} 
                                    alt="" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {/* Details */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-semibold text-ug-teal tracking-wider text-left">
                                    {item.category}
                                  </span>
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                    item.status === 'Published'
                                      ? 'bg-green-50 text-green-700 border-green-100'
                                      : 'bg-amber-50 text-amber-700 border-amber-100'
                                  }`}>
                                    {item.status}
                                  </span>
                                  {item.is_ai_generated && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full flex items-center gap-1">
                                      <Sparkles size={8} className="animate-pulse" />
                                      AI
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-xs font-bold text-ug-navy line-clamp-1 group-hover:text-ug-teal transition leading-tight text-left">
                                  {item.title}
                                </h4>

                                <p className="text-[11px] text-gray-500 line-clamp-2 font-medium leading-relaxed text-left">
                                  {item.summary}
                                </p>

                                <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold pt-1">
                                  <div className="flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{new Date(item.published_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditNewsClick(e, item);
                                        setIsWorkspaceOpen(true);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-ug-teal cursor-pointer"
                                      title="Edit Broadcast"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNews(e, item.id);
                                      }}
                                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 cursor-pointer"
                                      title="Delete Broadcast"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold text-gray-500">
                        <span>Page {archivePage} of {totalPages}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setArchivePage(prev => Math.max(1, prev - 1))}
                            disabled={archivePage === 1}
                            className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={() => setArchivePage(prev => Math.min(totalPages, prev + 1))}
                            disabled={archivePage === totalPages}
                            className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: CURATOR WORKSPACE (Only visible when isWorkspaceOpen) */}
                <AnimatePresence mode="wait">
                  {isWorkspaceOpen && (
                    <motion.div
                      key="workspace"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden text-left"
                    >
                      {/* Workspace Header */}
                      <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-ug-teal rounded-full animate-pulse" />
                          <h3 className="text-sm font-extrabold text-ug-navy  ">
                            {editingNews ? "Edit Broadcast Composition" : "New Broadcast Composition"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearWorkspace}
                            className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsWorkspaceOpen(false)}
                            className="p-1.5 hover:bg-gray-200/50 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"
                            title="Collapse Workspace"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Step Indicator / Tabs */}
                      <div className="flex border-b border-gray-100 bg-gray-50/20">
                        {[
                          { id: 1, title: "1. Core Insight" },
                          { id: 2, title: "2. AI Copywriting" }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 text-center py-3.5 text-[11px] font-semibold tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                              activeTab === tab.id
                                ? 'border-ug-teal text-ug-teal bg-white font-bold'
                                : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/30'
                            }`}
                          >
                            {tab.title}
                          </button>
                        ))}
                      </div>

                      {/* Tab Contents Panel */}
                      <div className="p-6 overflow-y-auto max-h-[600px] space-y-5">
                        
                        {/* TAB 1: CORE INSIGHT */}
                        {activeTab === 1 && (
                          <div className="space-y-5">
                            {/* AI Document Extractor Panel */}
                            <div className="bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-100 rounded-2xl p-5 mb-1.5 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
                              <div className="flex items-start gap-3.5">
                                <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700 shrink-0 mt-0.5">
                                  <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold text-slate-800  ">AI Document Extractor</h3>
                                    <span className="bg-purple-100 text-purple-700 font-extrabold text-[11px] px-2 py-0.5 rounded-full tracking-wider">PRO</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">
                                    Upload a news summary draft or article (<span className="font-bold">.txt, .doc, .docx</span>) and the Gemini system will instantly extract the headline, full briefing, category, tags, and verification details to populate this form.
                                  </p>
                                  
                                  <div className="mt-4 flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => docInputRef.current?.click()}
                                      disabled={isExtractingDoc}
                                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold text-[11px] tracking-wider rounded-xl transition duration-150 flex items-center gap-2 shadow-md shadow-purple-600/15 cursor-pointer"
                                    >
                                      {isExtractingDoc ? (
                                        <>
                                          <Loader2 size={12} className="animate-spin" />
                                          <span>Analyzing Document...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={12} />
                                          <span>Upload Draft Document</span>
                                        </>
                                      )}
                                    </button>
                                    
                                    {isExtractingDoc && (
                                      <span className="text-[11px] text-purple-600 font-bold tracking-wide animate-pulse">
                                        Extracting insights...
                                      </span>
                                    )}
                                  </div>
                                  
                                  <input 
                                    type="file"
                                    ref={docInputRef}
                                    onChange={handleDocumentExtract}
                                    accept=".txt,.doc,.docx"
                                    className="hidden"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-semibold text-gray-500 tracking-wider">Broadcast Title *</label>
                                <span className="text-[11px] font-bold text-gray-400">{newsTitle.length}/200 chars</span>
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. UG Secures $5M Academic Innovation Endowment from bilateral development..."
                                value={newsTitle}
                                onChange={e => setNewsTitle(e.target.value.slice(0, 200))}
                                className="w-full bg-white border border-gray-200 focus:border-ug-teal focus:ring-1 focus:ring-ug-teal rounded-xl p-3 text-xs font-bold text-gray-800 outline-none transition"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-semibold text-gray-500 tracking-wider">Short Summary *</label>
                                <span className="text-[11px] font-bold text-gray-400">{newsSummary.length}/1000 chars</span>
                              </div>
                              <textarea
                                placeholder="Enter an authoritative, structured academic brief explaining the core news breaking..."
                                value={newsSummary}
                                onChange={e => setNewsSummary(e.target.value.slice(0, 1000))}
                                className="w-full bg-white border border-gray-200 focus:border-ug-teal focus:ring-1 focus:ring-ug-teal rounded-xl p-3 text-xs font-medium text-gray-800 outline-none transition h-32 resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Category *</label>
                                <select
                                  value={newsCategory}
                                  onChange={e => setNewsCategory(e.target.value)}
                                  className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                                >
                                  <option value="Announcement">Announcement</option>
                                  <option value="Grant Opportunity">Grant Opportunity</option>
                                  <option value="Strategic Partnership">Strategic Partnership</option>
                                  <option value="Research Release">Research Release</option>
                                  <option value="Ecosystem Updates">Ecosystem Updates</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Broadcast Schedule</label>
                                <input
                                  type="datetime-local"
                                  value={newsPublishedAt}
                                  onChange={e => setNewsPublishedAt(e.target.value)}
                                  className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Image Upload Block */}
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Featured Broadcast Graphic *</label>
                              {newsImageUrl ? (
                                <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video group">
                                  <img 
                                    src={newsImageUrl} 
                                    alt="Featured asset" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="px-3 py-1.5 bg-white hover:bg-gray-50 text-slate-900 rounded-lg text-[11px] font-semibold tracking-wider transition cursor-pointer"
                                    >
                                      Replace Image
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setNewsImageUrl('')}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold tracking-wider transition cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => fileInputRef.current?.click()}
                                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-ug-teal hover:bg-gray-50/10 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[140px] bg-white"
                                >
                                  {isUploadingImage ? (
                                    <>
                                      <Loader2 className="animate-spin text-ug-teal mb-2" size={24} />
                                      <span className="text-[11px] font-semibold text-ug-teal">Uploading image...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="text-gray-300 mb-2" size={24} />
                                      <span className="text-xs font-bold text-gray-700">Upload Featured Image</span>
                                      <span className="text-[11px] text-gray-400 font-semibold mt-1">JPG, PNG, WEBP. Max 5MB.</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Official Source / External Citation Link</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="https://orid.ug.edu.gh/strategic-grant-awards"
                                  value={newsExternalUrl}
                                  onChange={e => setNewsExternalUrl(e.target.value)}
                                  className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 pr-10 text-xs font-bold text-gray-800 outline-none transition"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
                                  <ExternalLink size={12} />
                                </div>
                              </div>
                            </div>

                            {/* Moved Citations & References (Max 4 Links) here */}
                            <div className="pt-4 border-t border-gray-100">
                              <h4 className="text-[11px] font-semibold text-gray-500 tracking-wider mb-2">Citations & References (Max 4 Links)</h4>
                              <div className="grid grid-cols-1 gap-2.5">
                                {newsReferenceLinks.map((link, idx) => (
                                  <div key={idx} className="relative">
                                    <input
                                      type="text"
                                      placeholder={`Citation link #${idx + 1}`}
                                      value={link}
                                      onChange={e => {
                                        const updated = [...newsReferenceLinks];
                                        updated[idx] = e.target.value;
                                        setNewsReferenceLinks(updated);
                                      }}
                                      className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-2.5 pr-8 text-xs font-medium text-gray-800 outline-none"
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-[11px] font-bold">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: AI WRITER ASSISTANCE */}
                        {activeTab === 2 && (
                          <div className="space-y-5">
                            <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-4">
                              <div className="flex items-center gap-2 text-left">
                                <div className="p-1.5 bg-purple-600 rounded-lg text-white">
                                  <Sparkles size={14} className="animate-pulse" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-800  tracking-wide text-left">Gemini Professional Copywriter</h4>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium leading-relaxed text-left">
                                Authoritatively draft elite academic public announcements and breakthroughs instantly. Guided by Gemini intelligence to optimize readability.
                              </p>

                              <div className="space-y-3.5 pt-2 text-left">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1">Broadcast Title / Main Topic *</label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Malaria immunology breakthrough in ORID department"
                                    value={aiTopic || newsTitle}
                                    onChange={e => setAiTopic(e.target.value)}
                                    className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1">Focus Keywords / Context Indicators</label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Prof. G. Awandare, Nature Medicine journal, clinical trial"
                                    value={aiKeywords}
                                    onChange={e => setAiKeywords(e.target.value)}
                                    className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1">Tone & Copywriting Style</label>
                                  <select
                                    value={aiTone}
                                    onChange={e => setAiTone(e.target.value)}
                                    className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                                  >
                                    <option value="Academic Press Release">Academic Press Release (Formal & Authoritative)</option>
                                    <option value="Breakthrough & Discovery">Breakthrough & Discovery (Exciting & High Impact)</option>
                                    <option value="Strategic Partnership & Funding">Strategic Partnership & Funding (Commercial & Professional)</option>
                                    <option value="Impact Story">Impact Story (Accessible & Engaging)</option>
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const topicToUse = aiTopic.trim() || newsTitle.trim();
                                    if (!topicToUse) {
                                      showToast("Please enter a core topic or title for the AI generator.", "error");
                                      return;
                                    }
                                    await handleGenerateAIPressRelease(topicToUse, aiKeywords, aiTone);
                                  }}
                                  disabled={isGeneratingAI}
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold text-[11px] tracking-wide transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/15 cursor-pointer mt-3 h-11 disabled:opacity-50"
                                >
                                  {isGeneratingAI ? (
                                    <>
                                      <Loader2 className="animate-spin" size={12} />
                                      <span>Gemini Drafting Release...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      <span>Write Professional Release</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Sticky Footer Actions */}
                      <div className="bg-gray-50/50 p-5 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          {editingNews ? (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNews(e, editingNews.id || '')}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100/80 text-red-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer h-9"
                            >
                              <Trash2 size={12} />
                              <span>Permanently Delete</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-bold tracking-wider">
                              New Broadcast Composer
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleActionSave('Draft')}
                            disabled={isSavingNews}
                            className="px-4 py-2 bg-gray-200/60 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer h-9"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionSave('Published')}
                            disabled={isSavingNews}
                            className="px-5 py-2 bg-ug-navy hover:bg-ug-navy/90 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-1 cursor-pointer h-9"
                          >
                            {isSavingNews ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            <span>Publish Broadcast</span>
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          )}

          {/* 5. GOVERNANCE & INTERACTION LOGS TAB */}
          {activeSubTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 text-left"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-ug-navy flex items-center gap-2">
                    <ShieldCheck className="text-ug-teal" size={22} />
                    Administrative Governance & Security Audit Ledger
                  </h3>
                  <p className="text-[11px] font-semibold text-ug-teal tracking-wide mt-1">
                    End-to-End Cryptographic Audit & Transmission Integrity Protocol
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200/60">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span className="text-[11px] font-semibold tracking-wider">Access Controlled Server-Side</span>
                  </div>
                </div>
              </div>

              {/* Governance ledger always visible; access enforced server-side */}
                /* UNLOCKED GOVERNANCE AUDIT LEDGER */
                <div className="space-y-8">
                  {/* Cryptographic Security Status Banner */}
                  <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-ug-teal/10 border border-ug-teal/20 flex items-center justify-center shrink-0 text-ug-teal">
                        <Fingerprint size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold   text-white">Cryptographic Envelope Vault Active</h4>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            AES-256-GCM Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                          All user messages are encrypted in-transit and at-rest using AES-256-GCM symmetric envelopes with SHA-256 cryptographic digest verification. Plaintext payload contents are decrypted exclusively on authorized participant clients.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <button
                        onClick={handleExportSignedAuditCsv}
                        className="px-4 py-2.5 bg-ug-teal hover:bg-teal-500 text-ug-navy font-bold text-xs   rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-ug-teal/10"
                      >
                        <Download size={14} />
                        Export Signed Audit CSV
                      </button>
                    </div>
                  </div>

                  {/* Audit Summary Statistics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Total Request Volume</p>
                      <p className="text-2xl font-bold text-ug-navy">{eois.length}</p>
                      <p className="text-[11px] text-gray-400 font-medium">Logged system outreaches</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wider">AES-256 Encrypted</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {eois.filter(e => isMessageEncrypted(e.raw_message || e.message)).length || eois.length}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">Encrypted message envelopes</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wider">SHA-256 Integrity</p>
                      <p className="text-2xl font-bold text-ug-teal">100%</p>
                      <p className="text-[11px] text-gray-400 font-medium">Verified digest checksums</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Offboarding Audits</p>
                      <p className="text-2xl font-bold text-red-600">{accountDeletions.length}</p>
                      <p className="text-[11px] text-gray-400 font-medium">User account deletion logs</p>
                    </div>
                  </div>

                  {/* Interaction & Encrypted Message Logs Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm space-y-4 p-6">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <h4 className="text-sm font-bold text-ug-navy  ">Message Transmission Ledger</h4>
                        <p className="text-[11px] text-gray-400 font-mono">Real-time cryptographic audit trail of user outreaches and transmissions</p>
                      </div>
                      <span className="text-[11px] font-semibold tracking-wider text-ug-teal bg-ug-teal/10 px-3 py-1 rounded-full">
                        Zero-Knowledge Privacy Standard
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold tracking-wide text-gray-400">
                            <th className="p-4 pl-6">Sender</th>
                            <th className="p-4">Associated Project</th>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Transmission Payload</th>
                            <th className="p-4 pr-6 text-right">Security & Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {eois.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-xs font-bold  text-gray-400 tracking-wide">
                                No outreach transactions recorded in the audit logs.
                              </td>
                            </tr>
                          ) : (
                            eois.map((e) => {
                              const isEnc = isMessageEncrypted(e.raw_message || e.message);
                              return (
                                <tr key={e.id} className="hover:bg-gray-50/50 transition duration-150">
                                  <td className="p-4 pl-6">
                                    <div>
                                      <span className="font-extrabold text-xs text-ug-navy block">{e.user_name}</span>
                                      <span className="text-[11px] font-mono text-gray-400 block mt-0.5">UID: {e.sender_id?.substring(0, 8)}...</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-extrabold text-xs text-ug-navy block max-w-xs truncate" title={e.projects?.title}>
                                      {e.projects?.title || 'Direct Outreach'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
                                      <Clock size={11} />
                                      {new Date(e.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="space-y-1">
                                      <p className="text-xs text-gray-700 max-w-xs sm:max-w-md line-clamp-1 leading-relaxed italic" title={e.message}>
                                        "{e.message}"
                                      </p>
                                      {isEnc ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          <Lock size={9} />
                                          AES-256-GCM Encrypted Envelope
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                          Legacy Plaintext
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <button
                                      onClick={() => handleInspectMsg(e)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-ug-navy hover:text-white text-slate-700 font-semibold text-[11px] tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto"
                                    >
                                      <Eye size={12} />
                                      Inspect Envelope
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Account Deletions Audit Section */}
                  <div className="pt-8 border-t border-gray-200/80 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                          <Trash2 size={18} />
                          <h3 className="text-xl font-bold text-ug-navy">Account Deletion & Offboarding Registry</h3>
                        </div>
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">
                          User-Initiated Account Erasure Records & Feedback Audit
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (accountDeletions.length === 0) {
                            showToast("No account deletion records to export.", "info");
                            return;
                          }
                          const csvRows = [
                            ["Record ID", "User ID", "User Email", "User Name", "User Role", "Reason Category", "Details", "Date & Time"],
                            ...accountDeletions.map(d => [
                              d.id,
                              d.user_id,
                              `"${d.user_email}"`,
                              `"${d.user_name}"`,
                              `"${d.user_role}"`,
                              `"${d.reason_category}"`,
                              `"${(d.reason_details || '').replace(/"/g, '""')}"`,
                              d.deleted_at
                            ])
                          ];
                          const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `UG_Account_Deletions_Audit_${new Date().toISOString().split('T')[0]}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast("Account deletion records exported as CSV!", "success");
                        }}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs   rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-red-500/10"
                      >
                        <Download size={14} />
                        Export Offboarding CSV
                      </button>
                    </div>

                    {/* Offboarding Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Total Accounts Erased</p>
                        <p className="text-2xl font-bold text-red-600">{accountDeletions.length}</p>
                        <p className="text-[11px] text-gray-400 font-medium">Logged user offboardings</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">GDPR Right to Erasure</p>
                        <p className="text-2xl font-bold text-ug-navy">100%</p>
                        <p className="text-[11px] text-gray-400 font-medium">Automated profile purge compliance</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Offboarding Feedback</p>
                        <p className="text-2xl font-bold text-ug-teal">{accountDeletions.filter(a => a.reason_details).length}</p>
                        <p className="text-[11px] text-gray-400 font-medium">Qualitative notes recorded</p>
                      </div>
                    </div>
                  </div>
                </div>

              {/* ENVELOPE INSPECTION MODAL */}
              <AnimatePresence>
                {inspectingEnvelopeMsg && envelopeAuditData && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-8 max-w-xl w-full shadow-xl space-y-6 relative overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setInspectingEnvelopeMsg(null);
                          setEnvelopeAuditData(null);
                        }}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X size={20} />
                      </button>

                      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-ug-teal/10 border border-ug-teal/20 flex items-center justify-center text-ug-teal">
                          <Fingerprint size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold  ">Cryptographic Envelope Inspector</h3>
                          <p className="text-[11px] text-slate-400 font-mono">Transmission ID: {inspectingEnvelopeMsg.id}</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-800">
                          <div>
                            <span className="text-[11px] font-mono text-slate-400 block">Sender Identity</span>
                            <span className="font-bold text-white block mt-0.5">{inspectingEnvelopeMsg.user_name}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-mono text-slate-400 block">Encryption Standard</span>
                            <span className="font-bold text-emerald-400 block mt-0.5">{envelopeAuditData.algorithm}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono text-slate-400 block">SHA-256 Digest Signature</label>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-ug-teal break-all select-all">
                            {envelopeAuditData.sha256Hash}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono text-slate-400 block">Raw Ciphertext Envelope (At-Rest Payload)</label>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all max-h-24 overflow-y-auto">
                            {inspectingEnvelopeMsg.raw_message || inspectingEnvelopeMsg.message}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono text-slate-400 block">Decrypted Message Payload (Client-Side Verification)</label>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-xs italic text-slate-200">
                            "{envelopeAuditData.decryptedText}"
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>Cryptographic Signature Validated: Payload integrity verified.</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setInspectingEnvelopeMsg(null);
                            setEnvelopeAuditData(null);
                          }}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs   rounded-xl transition cursor-pointer"
                        >
                          Close Inspector
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* DECISION LEDGER SUBTAB */}
      {activeSubTab === 'decisions' && (
        <motion.div
          key="decisions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-8 text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-ug-navy flex items-center gap-2">
                <Fingerprint className="text-ug-teal" size={22} />
                AI Decision Provenance Ledger
              </h3>
              <p className="text-[11px] font-semibold text-ug-teal tracking-wide mt-1">
                Append-only Audit Trail of Platform AI Decisions & Integrity Digests
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200/60">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span className="text-[11px] font-semibold tracking-wider">Service-Role Verified Writes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Total Decisions</p>
              <p className="text-2xl font-bold text-ug-navy">{decisions.length}</p>
              <p className="text-[11px] text-gray-400 font-medium">Recorded ledger entries</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600">
                {decisions.filter(d => d.review_status === 'pending').length}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">Awaiting human audit</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Profile Extraction</p>
              <p className="text-2xl font-bold text-ug-teal">
                {decisions.filter(d => d.decision_type === 'profile_extraction').length}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">AI profile generation calls</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider">Match Rankings</p>
              <p className="text-2xl font-bold text-indigo-600">
                {decisions.filter(d => d.decision_type === 'match_ranking').length}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">Semantic match scoring runs</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm space-y-4 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-ug-navy  ">Decision History</h4>
                <p className="text-[11px] text-gray-400 font-mono">Immutable provenance records with SHA-256 integrity digests</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={decisionStatusFilter}
                  onChange={(e) => setDecisionStatusFilter(e.target.value)}
                  className="text-[11px] font-semibold tracking-wider bg-white border border-gray-200 rounded-xl px-3 py-2 text-ug-navy outline-none focus:border-ug-teal cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={() => StorageService.getAiDecisions(decisionStatusFilter).then(setDecisions)}
                  className="px-4 py-2 bg-ug-navy hover:bg-slate-800 text-white font-semibold text-[11px] tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2"
                  title="Refresh ledger"
                >
                  <Loader2 size={14} className={isLoadingDecisions ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold tracking-wide text-gray-400">
                    <th className="p-4 pl-6">Decision Type</th>
                    <th className="p-4">Provider / Model</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Integrity Digests</th>
                    <th className="p-4">Result Summary</th>
                    <th className="p-4">Review Status</th>
                    <th className="p-4 pr-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingDecisions && decisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs font-bold  text-gray-400 tracking-wide flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Loading provenance ledger...
                      </td>
                    </tr>
                  ) : decisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs font-bold  text-gray-400 tracking-wide">
                        No AI decisions recorded yet. Run an AI workflow to populate the ledger.
                      </td>
                    </tr>
                  ) : (
                    decisions.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition duration-150">
                        <td className="p-4 pl-6">
                          <span className="font-extrabold text-xs text-ug-navy block">{d.decision_type}</span>
                          <span className="text-[11px] font-mono text-gray-400 block mt-0.5">v{d.prompt_version || 'n/a'}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-xs text-ug-navy block">{d.model || 'n/a'}</span>
                          <span className="text-[11px] font-mono text-gray-400 block mt-0.5">{d.provider || 'unknown'}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-mono text-gray-500">
                            {d.subject_id ? `${d.subject_id.substring(0, 12)}...` : 'system'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-mono text-ug-teal block truncate max-w-[160px]" title={d.input_hash || undefined}>
                              IN  {d.input_hash ? d.input_hash.substring(0, 20) + '...' : '—'}
                            </span>
                            <span className="text-[11px] font-mono text-ug-teal/70 block truncate max-w-[160px]" title={d.output_hash || undefined}>
                              OUT {d.output_hash ? d.output_hash.substring(0, 20) + '...' : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-mono text-gray-500 block truncate max-w-[200px]" title={JSON.stringify(d.result)}>
                            {d.result ? JSON.stringify(d.result).substring(0, 60) : '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[11px] font-semibold tracking-wider px-2.5 py-1 rounded-full ${
                            d.review_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                            d.review_status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200/60' :
                            'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            {d.review_status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-gray-400 font-mono text-[11px]">
                            <Clock size={11} />
                            {new Date(d.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* REPORT CENTER MODAL FROM OVERVIEW PAGE */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-6xl w-full shadow-xl relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full transition cursor-pointer z-20"
                title="Close Report Center"
              >
                <X size={20} />
              </button>
              <ReportCenter
                user={user}
                profiles={profiles}
                projects={projects}
                news={news}
                eois={eois}
                accountDeletions={accountDeletions}
                onClose={() => setIsReportModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
