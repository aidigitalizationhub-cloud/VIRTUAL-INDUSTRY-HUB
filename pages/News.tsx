import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Tag, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft,
  Newspaper, 
  Sparkles, 
  Loader2, 
  ExternalLink, 
  Globe, 
  Zap, 
  RefreshCw, 
  Microscope, 
  Clock, 
  Search, 
  Filter, 
  Settings,
  Bell,
  ChevronDown,
  Link2,
  LayoutGrid,
  List,
  Edit,
  Trash2,
  Trash,
  Upload,
  X,
  Eye,
  LayoutDashboard,
  FileText,
  Radio,
  MoreVertical,
  Plus,
  Users,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StorageService } from '../services/storageService';
import { AIScoutService } from '../services/aiScoutService';
import { DocumentExtractionService } from '../services/documentExtractionService';
import { NewsItem } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../App';
import { getGeminiResponse } from '../services/geminiService';
import { Tr } from '../components/Tr';
import { useTranslatedText } from '../services/translationService';

const News: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedDetailedNews, setSelectedDetailedNews] = useState<NewsItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Top-level translated strings for inputs and dropdowns (must be called unconditionally before early returns)
  const searchNewsPlaceholder = useTranslatedText("Search news, grants, breakthroughs...");
  const filterAllLabel = useTranslatedText("Filter: All Discovery");
  const filterAnnouncementLabel = useTranslatedText("Announcements");
  const filterGrantLabel = useTranslatedText("Grants & Funding");
  const filterPartnershipLabel = useTranslatedText("Partnerships");
  const filterReleaseLabel = useTranslatedText("Research Releases");
  const filterEcosystemLabel = useTranslatedText("Ecosystem Updates");

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
    });
  }, []);

  const handleSaveNewsSearchAlert = async () => {
    if (!currentUser) {
      showToast("Authentication Required. Please log in to subscribe to search alerts.", "error");
      return;
    }
    const queryToSave = searchTerm.trim() || (selectedCategory !== 'All' ? selectedCategory : '');
    if (!queryToSave) {
      showToast("Please enter a keyword or choose a category first to subscribe to alerts.", "info");
      return;
    }
    try {
      await StorageService.saveSearch(currentUser.id, { query: queryToSave, category: selectedCategory });
      showToast(`Search alert saved for "${queryToSave}"! You will be notified of new matching news and grants.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save search alert.", "error");
    }
  };

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Administrative / Curation states
  const isAdmin = false;
  const curatorMode = false;
  const setCuratorMode = (val: boolean) => {};

  // News editing / creation form states
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Announcement');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsExternalUrl, setNewsExternalUrl] = useState('');
  const [newsStatus, setNewsStatus] = useState<'Draft' | 'Published'>('Published');
  const [newsReferenceLinks, setNewsReferenceLinks] = useState<string[]>(['', '', '', '']);
  const [newsTags, setNewsTags] = useState('');
  const [newsRelevanceScore, setNewsRelevanceScore] = useState<number>(0);
  const [newsSourceVerificationNotes, setNewsSourceVerificationNotes] = useState('');

  // Redesigned Administrative Hub states
  const [activeTab, setActiveTab] = useState<number>(1);
  const [tagList, setTagList] = useState<string[]>([]);
  const [archivePage, setArchivePage] = useState<number>(1);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [archiveSort, setArchiveSort] = useState<string>('newest');
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [newsPublishedAt, setNewsPublishedAt] = useState<string>(new Date().toISOString().substring(0, 16));

  // UI state managers
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [showAIWriteModal, setShowAIWriteModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');

  const formatNewsDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString([], { dateStyle: 'medium' });
    } catch (e) {
      return dateStr;
    }
  };

  // Debounce search term input changes before querying
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset page back to 1 on new search term
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Debounce archive search changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedArchiveSearch(archiveSearch);
      setArchivePage(1);
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [archiveSearch]);

  // Reset page number on category changes to start viewing from the beginning
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  const fetchNews = async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    try {
      const adminStatus = await StorageService.verifyAdmin();

      const limit = curatorMode ? 150 : 20;
      const data = await StorageService.getNews(adminStatus, {
        page: pageNum,
        limit,
        search: curatorMode ? debouncedArchiveSearch : debouncedSearchTerm,
        category: selectedCategory
      });

      if (append) {
        setNews(prev => {
          // Avoid duplicate items by checking IDs
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewData = data.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewData];
        });
      } else {
        setNews(data);
      }

      setHasMore(data.length === limit);

      const syncTime = await AIScoutService.getLastSyncTime();
      setLastSync(syncTime);
    } catch (err) {
      console.error("Error loading news feed:", err);
      showToast("Could not load news discovery feed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger paginated data loading reactively when search term, category, page, curatorMode, or debouncedArchiveSearch changes
  useEffect(() => {
    if (curatorMode) {
      fetchNews(1, false);
    } else {
      fetchNews(page, page > 1);
    }
  }, [debouncedSearchTerm, selectedCategory, page, curatorMode, debouncedArchiveSearch]);

  // Handle seamless background sync on mount if list is empty or news is stale (>2 hours)
  useEffect(() => {
    const handleBackgroundSync = async () => {
      try {
        const syncTime = await AIScoutService.getLastSyncTime();
        const isStale = !syncTime || (new Date().getTime() - syncTime.getTime() > 2 * 60 * 60 * 1000);
        
        // Check database count or content
        const adminStatus = await StorageService.verifyAdmin();
        const checkData = await StorageService.getNews(adminStatus, { page: 1, limit: 1 });
        
        if (checkData.length === 0 || isStale) {
          console.log("Discovery Feed: Initiating seamless background news sync...");
          const didSync = await AIScoutService.autoSyncNews(false);
          if (didSync) {
            setPage(1);
            fetchNews(1, false);
          }
        }
      } catch (err) {
        console.warn("Background auto-sync gracefully bypassed:", err);
      }
    };
    handleBackgroundSync();
  }, []);

  const handleNewsClick = (item: NewsItem) => {
    setSelectedDetailedNews(item);
  };

  // Fallback for broken images
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null; // Prevent infinite loop
    target.src = 'https://images.unsplash.com/photo-1532187875605-1ef638272ee4?auto=format&fit=crop&w=800&q=80';
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
      
      if (page === 1) {
        fetchNews(1, false);
      } else {
        setPage(1);
      }
    } catch (err) {
      showToast("Failed saving announcement", "error");
    } finally {
      setIsSavingNews(false);
    }
  };

  // Pre-populate news item for editing
  const handleEditNewsClick = (e: React.MouseEvent, item: NewsItem) => {
    e.stopPropagation(); // Avoid triggering standard card opening/external link click
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
    
    // Scroll to curation workspace smoothly
    const element = document.getElementById("news-curator-workspace-anchor");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Delete news item
  const handleDeleteNews = async (e: React.MouseEvent | undefined, newsId: string) => {
    if (e) e.stopPropagation(); // Avoid triggering standard card opening
    if (!window.confirm("Are you sure you want to permanently delete this announcement? This action is irreversible.")) return;
    try {
      await StorageService.adminDeleteNewsItem(newsId);
      showToast("Announcement deleted successfully", "success");
      setNews(prev => prev.filter(n => n.id !== newsId));
      if (editingNews?.id === newsId) {
        // Clear editor if the deleted item was currently loaded
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

  // Image Upload handler with manual validation (JPG, PNG, WEBP, 5MB max size)
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

  // Write announcement draft with Gemini assistance
  const handleGenerateAIPressRelease = async (overrideTopic?: string, overrideKeywords?: string) => {
    const topicToUse = (overrideTopic !== undefined ? overrideTopic : aiTopic) || newsTitle;
    const keywordsToUse = overrideKeywords !== undefined ? overrideKeywords : aiKeywords;

    if (!topicToUse || !topicToUse.trim()) {
      showToast("Please enter a core topic or title first to guide the Gemini Copywriter.", "error");
      return;
    }

    setIsGeneratingAI(true);
    showToast("Gemini Copywriter: Drafting announcement headline and brief...", "info");

    try {
      const prompt = `Act as an elite Academic Public Relations Officer at the University of Ghana.
Write an authoritative, highly engaging public announcement/press release based on:
Topic: "${topicToUse.trim()}"
Keywords/Context: "${keywordsToUse.trim() || 'University of Ghana, Research Innovation, Academic Excellence'}"
Category: "${newsCategory}"

You MUST output strictly in the following valid JSON format:
{
  "title": "A highly professional, captivating academic headline (max 180 chars)",
  "summary": "An authoritative, well-written article summary (around 120-180 words) highlighting the research breakthrough, strategic ecosystem funding, or institutional partnership."
}

Do NOT include any extra text or markdown codeblock wrappers. Just return the raw JSON object.`;

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
          console.warn("JSON parse fallback:", jsonErr);
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
      setActiveTab(1);
    } catch (err: any) {
      console.error("Gemini Copywriter error:", err);
      showToast("Failed to draft content with Gemini AI", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Since the database handles filtering, pagination, and full-text search, we utilize the news array directly
  const filteredNews = news;

  // Tabs for the curator workspace
  const tabs = [
    { id: 1, name: 'Core Insight' },
    { id: 2, name: 'Intelligence & Verification' },
    { id: 3, name: 'Citations & Links' }
  ];

  // Hidden input ref for image upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

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
  
  // Auto reset page if out of bounds
  useEffect(() => {
    if (archivePage > totalPages) {
      setArchivePage(1);
    }
  }, [totalPages, archivePage]);

  const paginatedArchives = sortedArchives.slice(
    (archivePage - 1) * itemsPerPage,
    archivePage * itemsPerPage
  );

  // Auto sync tags list with newsTags state when newsTags is updated externally
  useEffect(() => {
    if (newsTags) {
      const parsed = newsTags.split(',').map(t => t.trim()).filter(Boolean);
      setTagList(parsed);
    } else {
      setTagList([]);
    }
  }, [newsTags]);

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

  if (isAdmin && curatorMode) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f6] text-slate-800 font-sans select-none">
        {/* HIDDEN FILE INPUT FOR MANUAL UPLOADS */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          className="hidden" 
          accept="image/jpeg,image/jpg,image/png,image/webp" 
        />

        {/* LEFT BRANDED SIDEBAR */}
        <aside className="w-64 bg-[#0a0c24] text-[#a5a6c1] flex flex-col shrink-0 border-r border-[#151735] h-full z-20">
          {/* Logo & Branding */}
          <div className="p-6 border-b border-[#151735]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-purple-500/20">
                <Radio size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-[0.2em] text-white leading-none">VIRTUAL HUB</h3>
                <p className="text-[9px] font-black tracking-widest text-purple-400 mt-1 uppercase">CORE GOVERNANCE</p>
              </div>
            </div>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <div className="text-[10px] font-black tracking-widest text-[#4e5072] uppercase px-3 mb-3">SYSTEM MODULES</div>
            
            <button 
              type="button"
              onClick={() => showToast("Navigating to System Dashboard...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button 
              type="button"
              onClick={() => showToast("Loading User Directory...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <Users size={16} />
              <span>Users</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                handleClearWorkspace();
                showToast("Now viewing announcements feed", "success");
              }} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <Newspaper size={16} />
              <span>Announcements</span>
            </button>

            <button 
              type="button"
              onClick={() => showToast("Opening Regulatory Disclosures...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <ShieldCheck size={16} />
              <span>Disclosures</span>
            </button>

            {/* ACTIVE ITEM */}
            <button 
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600/20 to-indigo-600/10 text-white border-l-4 border-purple-500 shadow-inner text-left"
            >
              <div className="flex items-center gap-3.5">
                <Radio size={16} className="text-purple-400" />
                <span className="font-extrabold">News Curator</span>
              </div>
              <span className="bg-purple-500/20 text-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
            </button>

            <button 
              type="button"
              onClick={() => showToast("Initiating AI Scout Insights...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <Sparkles size={16} />
              <span>AI Insights</span>
            </button>

            <button 
              type="button"
              onClick={() => showToast("Compiling Analytical Reports...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <FileText size={16} />
              <span>Reports</span>
            </button>

            <button 
              type="button"
              onClick={() => showToast("Accessing Hub Settings...", "info")} 
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>

          {/* AI Scout Sync Card at Bottom */}
          <div className="p-4 border-t border-[#151735] bg-[#07081a]/50">
            <div className="bg-gradient-to-b from-[#12143a] to-[#0d0f30] p-3.5 rounded-2xl border border-[#1f224f] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl" />
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-purple-400 animate-pulse" />
                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">AI Scout Sync</h4>
              </div>
              <p className="text-[9px] text-[#717393] font-semibold">
                Last sync: {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '5 mins ago'}
              </p>
              
              <div className="flex items-center gap-1.5 mt-3 text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 py-1.5 px-2.5 rounded-lg border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>All Systems Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN BODY WINDOW */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f4f5f6] h-full overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm shadow-gray-100/40">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Platform Admin</span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-black text-slate-800 tracking-wider">News curation dashboard</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative max-w-xs hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search news, keywords, tags... ⌘K" 
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  className="w-64 pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 focus:border-purple-500 rounded-xl text-[11px] font-bold outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 border-l border-gray-100 pl-6">
                <div className="text-right">
                  <p className="text-[11px] font-black text-gray-900 leading-tight">Welcome, ABDULYAH 👑</p>
                  <p className="text-[8px] font-black text-purple-600 uppercase tracking-widest mt-0.5">Primary Governance</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-purple-500/20">
                  A
                </div>
              </div>
            </div>
          </header>

          {/* SPLIT DASHBOARD LAYOUT */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* LEFT PANEL: BROADCAST ARCHIVES */}
            <section className="w-full lg:w-1/2 xl:w-5/12 flex flex-col h-full bg-white border-r border-gray-200/80 overflow-hidden">
              {/* Archives Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-gray-900 leading-none">Broadcast Archives</h2>
                  <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1 uppercase">Curated Research & Listings</p>
                </div>
                
                <button 
                  type="button"
                  onClick={handleClearWorkspace}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition duration-150 shadow-md shadow-purple-600/10 hover:scale-[1.02]"
                >
                  <Plus size={12} />
                  <span>Create New</span>
                </button>
              </div>

              {/* Filter controls */}
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <select 
                      value={selectedCategory} 
                      onChange={e => {
                        setSelectedCategory(e.target.value);
                        setArchivePage(1);
                      }}
                      className="w-full bg-white border border-gray-200 focus:border-purple-500 p-2.5 rounded-xl text-[10px] font-black text-gray-700 uppercase tracking-wider outline-none cursor-pointer appearance-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Announcement">Announcements</option>
                      <option value="Grant Opportunity">Grants</option>
                      <option value="Strategic Partnership">Partnerships</option>
                      <option value="Research Release">Research Releases</option>
                      <option value="Ecosystem Updates">Ecosystem Updates</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <Filter size={10} />
                    </div>
                  </div>

                  <div className="relative">
                    <select 
                      value={selectedStatusFilter} 
                      onChange={e => {
                        setSelectedStatusFilter(e.target.value);
                        setArchivePage(1);
                      }}
                      className="w-full bg-white border border-gray-200 focus:border-purple-500 p-2.5 rounded-xl text-[10px] font-black text-gray-700 uppercase tracking-wider outline-none cursor-pointer appearance-none"
                    >
                      <option value="All">All Status</option>
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <Filter size={10} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Total {filteredArchives.length} archives found
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <span>Sort:</span>
                    <select 
                      value={archiveSort} 
                      onChange={e => setArchiveSort(e.target.value)}
                      className="bg-transparent font-extrabold text-purple-600 cursor-pointer focus:outline-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* INDEPENDENTLY SCROLLING ARCHIVE CARDS LIST */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                {paginatedArchives.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-white p-6">
                    <Newspaper className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-xs font-black text-gray-500 uppercase">No matching archives found</p>
                    <p className="text-[10px] text-gray-400 mt-1">Refine filters or compose a new announcement.</p>
                  </div>
                ) : (
                  paginatedArchives.map(item => {
                    const isSelected = editingNews?.id === item.id;
                    return (
                      <div 
                        key={item.id}
                        onClick={(e) => handleEditNewsClick(e, item)}
                        className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-4 bg-white relative ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50/10 shadow-lg shadow-purple-500/5 ring-2 ring-purple-500/20' 
                            : 'border-gray-100 hover:border-purple-200 hover:shadow-md'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100 relative">
                          <img 
                            src={item.image_url} 
                            alt="" 
                            onError={handleImageError}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[8px] font-black uppercase text-purple-600 tracking-wider">
                                {item.category}
                              </span>
                              <span className="text-gray-300 text-[8px]">•</span>
                              <span className="text-gray-400 text-[8px] font-bold">
                                {new Date(item.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              {item.status === 'Draft' ? (
                                <span className="bg-amber-100 text-amber-700 font-extrabold text-[7px] uppercase px-1 rounded">DRAFT</span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 font-extrabold text-[7px] uppercase px-1 rounded">PUBLISHED</span>
                              )}
                              {(item.is_ai_generated || (item.relevance_score && item.relevance_score > 80)) && (
                                <span className="bg-purple-100 text-purple-700 font-extrabold text-[7px] uppercase px-1 rounded flex items-center gap-0.5">
                                  <Sparkles size={6} /> AI Scout
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-black text-gray-900 leading-snug group-hover:text-purple-600 transition-colors line-clamp-2">
                              {item.title}
                            </h4>
                          </div>

                          <p className="text-[10px] text-gray-400 font-medium line-clamp-1 mt-1 leading-relaxed">
                            {item.summary}
                          </p>
                        </div>

                        <div className="flex flex-col justify-between items-end shrink-0 pl-1">
                          <button 
                            type="button" 
                            onClick={(e) => handleEditNewsClick(e, item)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition animate-none"
                          >
                            <Eye size={12} />
                          </button>
                          <span className="text-[9px] font-mono text-gray-300 font-bold">
                            {item.relevance_score || 0}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* INDEPENDENT ARCHIVE PAGINATION */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
                <button 
                  type="button"
                  onClick={() => setArchivePage(prev => Math.max(1, prev - 1))}
                  disabled={archivePage === 1}
                  className="p-2 border border-gray-100 hover:border-purple-200 text-gray-500 hover:text-purple-600 rounded-xl disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-100 transition duration-150"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isPageActive = archivePage === pageNum;
                    return (
                      <button 
                        key={pageNum}
                        type="button"
                        onClick={() => setArchivePage(pageNum)}
                        className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center transition duration-150 ${
                          isPageActive 
                            ? 'bg-[#1e145c] text-white shadow-sm' 
                            : 'border border-gray-100 text-gray-500 hover:border-purple-200 hover:text-purple-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button 
                  type="button"
                  onClick={() => setArchivePage(prev => Math.min(totalPages, prev + 1))}
                  disabled={archivePage === totalPages}
                  className="p-2 border border-gray-100 hover:border-purple-200 text-gray-500 hover:text-purple-600 rounded-xl disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-100 transition duration-150"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </section>

            {/* RIGHT PANEL: CURATOR WORKSPACE */}
            <section className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
              {/* Workspace Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-gray-900 leading-none">Curator Workspace</h2>
                  <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1 uppercase">Compose, Edit, and Audit listings</p>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setCuratorMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition duration-150 cursor-pointer"
                >
                  <X size={12} />
                  <span>Close Workspace</span>
                </button>
              </div>

              {/* THREE NAVIGATION TABS */}
              <div className="px-6 border-b border-gray-100 flex shrink-0">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-4 border-b-2 font-black text-[10px] uppercase tracking-wider flex items-center gap-2.5 transition duration-150 relative cursor-pointer ${
                        isActive 
                          ? 'border-purple-600 text-purple-600' 
                          : 'border-transparent text-gray-400 hover:text-slate-700'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-black ${
                        isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {tab.id}
                      </span>
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* INDEPENDENTLY SCROLLING WORKSPACE FORM PANEL */}
              <div className="flex-1 overflow-y-auto p-6 pb-28 bg-slate-50/20">
                
                {/* TAB 1: CORE INSIGHT */}
                {activeTab === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* Left Column Fields */}
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
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">AI Document Extractor</h3>
                                <span className="bg-purple-100 text-purple-700 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">PRO</span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                                Upload a news summary draft or article (<span className="font-bold">.txt, .doc, .docx</span>) and the Gemini system will instantly extract the headline, full briefing, category, tags, and verification details to populate this form.
                              </p>
                              
                              <div className="mt-4 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => docInputRef.current?.click()}
                                  disabled={isExtractingDoc}
                                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition duration-150 flex items-center gap-2 shadow-md shadow-purple-600/15 cursor-pointer"
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
                                  <span className="text-[9px] text-purple-600 font-bold uppercase tracking-widest animate-pulse">
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

                        {/* Title */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Title *</label>
                            <span className="text-[9px] font-bold text-gray-400">{newsTitle.length}/200 characters</span>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Provide a professional, captivating broadcast title..."
                            value={newsTitle}
                            onChange={e => setNewsTitle(e.target.value.slice(0, 200))}
                            className="w-full bg-white border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl p-3.5 text-xs font-bold text-gray-800 outline-none transition"
                          />
                        </div>

                        {/* Short Summary */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Short Summary *</label>
                            <span className="text-[9px] font-bold text-gray-400">{newsSummary.length}/1000 characters</span>
                          </div>
                          <textarea 
                            placeholder="Write an authoritative, detailed briefing of around 120-150 words..."
                            value={newsSummary}
                            onChange={e => setNewsSummary(e.target.value.slice(0, 1000))}
                            className="w-full bg-white border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl p-3.5 text-xs font-bold text-gray-800 outline-none transition h-36 resize-none"
                          />
                        </div>

                        {/* Category and Status Group */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Category *</label>
                            <select 
                              value={newsCategory}
                              onChange={e => setNewsCategory(e.target.value)}
                              className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl p-3.5 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                            >
                              <option value="Announcement">Announcement</option>
                              <option value="Grant Opportunity">Grant Opportunity</option>
                              <option value="Strategic Partnership">Strategic Partnership</option>
                              <option value="Research Release">Research Release</option>
                              <option value="Ecosystem Updates">Ecosystem Updates</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Published At</label>
                            <input 
                              type="datetime-local" 
                              value={newsPublishedAt}
                              onChange={e => setNewsPublishedAt(e.target.value)}
                              className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl p-3 text-xs font-bold text-gray-800 outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column Fields */}
                      <div className="space-y-5">
                        
                        {/* FEATURED IMAGE UPLOAD AREA */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Featured / Visual Asset *</label>
                          {newsImageUrl ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video group">
                              <img 
                                src={newsImageUrl} 
                                alt="Featured asset preview" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-3">
                                <button 
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider transition"
                                >
                                  Replace Image
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setNewsImageUrl('')}
                                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50/5 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[162px] bg-white"
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="animate-spin text-purple-600 mb-2" size={24} />
                                  <span className="text-[10px] font-black text-purple-600 uppercase">Uploading visual asset...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="text-gray-300 mb-2.5 animate-none" size={28} />
                                  <span className="text-xs font-extrabold text-slate-700 leading-none">Upload Featured Image</span>
                                  <span className="text-[9px] text-gray-400 font-semibold mt-1.5">JPG, PNG, or WEBP. Max 5MB.</span>
                                </>
                              )}
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                            Note: Image upload is manual. AI image generators are strictly bypassed.
                          </p>
                        </div>

                        {/* INTERACTIVE TAGS WITH ENTER TO APPEND */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Announcement Tags</label>
                          <div className="border border-gray-200 rounded-xl p-3 bg-white flex flex-wrap gap-1.5 focus-within:border-purple-500 transition duration-150">
                            {tagList.map(tag => (
                              <span 
                                key={tag} 
                                className="bg-purple-50 text-purple-700 font-bold text-[10px] pl-2.5 pr-1.5 py-1 rounded-lg border border-purple-100 flex items-center gap-1 shrink-0"
                              >
                                <span>{tag}</span>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="p-0.5 text-purple-400 hover:text-purple-700 rounded transition"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                            <input 
                              type="text" 
                              placeholder="Add a tag and press Enter..."
                              className="border-0 p-0.5 text-xs font-bold text-gray-800 focus:ring-0 outline-none flex-1 min-w-[140px] bg-transparent"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  handleAddTag(target.value);
                                  target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Source / External URL */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Source / External Link</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="https://example.com/original-article-or-grant"
                              value={newsExternalUrl}
                              onChange={e => setNewsExternalUrl(e.target.value)}
                              className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl p-3.5 pr-10 text-xs font-bold text-gray-800 outline-none transition"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                              <ExternalLink size={12} />
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 2: INTELLIGENCE & VERIFICATION */}
                {activeTab === 2 && (
                  <div className="space-y-6">
                    {/* Relevance & Verification Cards */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      <div className="space-y-5">
                        {/* Scout Relevance Score */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Scout Relevance Score ({newsRelevanceScore}%)</label>
                          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={newsRelevanceScore}
                              onChange={e => setNewsRelevanceScore(Number(e.target.value))}
                              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                            <input 
                              type="number" 
                              min="0" 
                              max="100" 
                              value={newsRelevanceScore}
                              onChange={e => setNewsRelevanceScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                              className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-xs font-black text-gray-800 outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        {/* Source Verification notes */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Source Verification Notes</label>
                          <textarea 
                            placeholder="Add administrative peer review records, source credibility audits, or credibility score logs..."
                            value={newsSourceVerificationNotes}
                            onChange={e => setNewsSourceVerificationNotes(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl p-3.5 text-xs font-bold text-gray-800 outline-none transition h-36 resize-none"
                          />
                        </div>
                      </div>

                      {/* GEMINI AI ASSISTANT COPYWRITER */}
                      <div className="bg-gradient-to-b from-[#1c184c]/5 to-[#1c184c]/10 border border-purple-200/50 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg text-white">
                              <Sparkles size={14} className="animate-pulse" />
                            </div>
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Gemini AI Assistant</h3>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-5">
                            Auto-draft professional, highly engaging headlines and press summaries instantly. Uses Google's modern Gemini models to craft authorized content outlines.
                          </p>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-1">Core Topic / Headline Concept</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Malaria Vaccine Trial Success at UG"
                                value={aiTopic}
                                onChange={e => setAiTopic(e.target.value)}
                                className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block mb-1">Context Keywords (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. WHO, phase 3, 75% efficacy"
                                value={aiKeywords}
                                onChange={e => setAiKeywords(e.target.value)}
                                className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={async () => {
                            const topicToUse = aiTopic.trim() || newsTitle.trim();
                            if (!topicToUse) {
                              showToast("Please enter a core topic or title for the AI generator.", "error");
                              return;
                            }
                            await handleGenerateAIPressRelease(topicToUse, aiKeywords);
                          }}
                          disabled={isGeneratingAI}
                          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-black text-[10px] uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/15"
                        >
                          {isGeneratingAI ? (
                            <>
                              <Loader2 className="animate-spin" size={12} />
                              <span>Drafting Content...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              <span>Generate AI Draft</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 3: CITATIONS & LINKS */}
                {activeTab === 3 && (
                  <div className="space-y-5 max-w-2xl">
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1.5">Academic & Media Citations</h3>
                      <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-wider leading-relaxed">
                        Add up to 4 citation links. These display as interactive reference lists in the published news brief.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {newsReferenceLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-6 text-[10px] font-black text-purple-600 font-mono">#{idx + 1}</span>
                          <div className="relative flex-1">
                            <input 
                              type="text" 
                              placeholder="e.g. pubmed.ncbi.nlm.nih.gov/3491295"
                              value={link}
                              onChange={e => {
                                const updated = [...newsReferenceLinks];
                                updated[idx] = e.target.value;
                                setNewsReferenceLinks(updated);
                              }}
                              className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl p-3 pl-10 text-xs font-bold text-slate-800 outline-none transition"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                              <Link2 size={12} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* STICKY BOTTOM ACTION BAR WITH OVERLAYS */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex justify-between items-center z-10 shadow-lg shadow-slate-900/5">
                <div>
                  {editingNews?.id ? (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteNews(undefined, editingNews.id)}
                      className="flex items-center gap-1.5 px-4.5 py-3 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Delete / Archive</span>
                    </button>
                  ) : (
                    <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest pl-2">
                      New Announcement Composition Mode
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => handleActionSave('Draft')}
                    disabled={isSavingNews}
                    className="flex items-center gap-1.5 px-5 py-3 border border-purple-200 hover:border-purple-400 text-purple-700 bg-purple-50/20 hover:bg-purple-50/50 rounded-xl transition duration-150 font-black text-[10px] uppercase tracking-widest cursor-pointer"
                  >
                    <FileText size={12} />
                    <span>Save Draft</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleActionSave('Published')}
                    disabled={isSavingNews}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#1e145c] hover:bg-[#281b7a] text-white rounded-xl transition duration-150 font-black text-[10px] uppercase tracking-widest shadow-md shadow-purple-950/15 cursor-pointer"
                  >
                    {isSavingNews ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <Zap size={12} className="fill-white text-white" />
                    )}
                    <span>Publish Announcement</span>
                  </button>
                </div>
              </div>

            </section>

          </div>
        </div>
      </div>
    );
  }
  if (selectedDetailedNews) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedDetailedNews(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-ug-navy font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200 shadow-xs transition-all duration-200 cursor-pointer mb-6 group"
          >
            <ArrowLeft size={14} className="transform group-hover:-translate-x-1 transition-transform" />
            <span><Tr text="Back to News" /></span>
          </button>

          {/* Article Container */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden p-5 sm:p-8 mb-8 w-full">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${selectedDetailedNews.is_ai_generated ? 'bg-ug-teal text-white' : 'bg-ug-navy text-white'}`}>
                {selectedDetailedNews.is_ai_generated ? <Zap size={11} className="fill-white" /> : <Tag size={11} />} 
                <Tr text={selectedDetailedNews.category} />
              </span>
              <span className="text-gray-300 text-xs">•</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                <Calendar size={12} /> {formatNewsDate(selectedDetailedNews.published_at)}
              </span>
              {selectedDetailedNews.source_name && (
                <>
                  <span className="text-gray-300 text-xs">•</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-ug-teal bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                     <Globe size={12} /> <Tr text={selectedDetailedNews.source_name} />
                  </span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ug-navy mb-6 leading-tight tracking-tight text-left">
              <Tr text={selectedDetailedNews.title} />
            </h1>

            {/* Featured Image */}
            {selectedDetailedNews.image_url && (
              <div className="w-full aspect-[21/9] max-h-[380px] min-h-[180px] rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative mb-6 shadow-xs">
                <img
                  src={selectedDetailedNews.image_url}
                  alt=""
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content Summary (News Body) */}
            <div className="text-slate-700 font-normal text-sm sm:text-base leading-relaxed space-y-4 mb-6 whitespace-pre-line border-b border-gray-100 pb-6 text-left">
              <Tr text={selectedDetailedNews.summary} />
            </div>

            {/* Sources & Hyperlinks Section */}
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase text-ug-navy tracking-wider flex items-center gap-2">
                <Globe size={14} className="text-ug-teal" /> <Tr text="Verified Institutional Source" />
              </h3>

              <div className="flex flex-col gap-2.5">
                {/* Primary Citation Link */}
                {selectedDetailedNews.external_url && (
                  <a
                    href={selectedDetailedNews.external_url.startsWith('http') ? selectedDetailedNews.external_url : `https://${selectedDetailedNews.external_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between p-3.5 bg-ug-teal/5 hover:bg-ug-teal hover:text-white border border-ug-teal/20 hover:border-ug-teal rounded-xl text-xs font-bold text-ug-teal transition duration-200 group w-full"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={14} />
                      <span>Official Source / External Citation Link</span>
                    </span>
                    <ExternalLink size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}

                {/* Secondary reference links */}
                {selectedDetailedNews.reference_links && Array.isArray(selectedDetailedNews.reference_links) && selectedDetailedNews.reference_links.filter(Boolean).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                    {selectedDetailedNews.reference_links.filter(Boolean).slice(0, 6).map((link, idx) => (
                      <a
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-xl text-xs font-medium text-slate-700 transition group"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Link2 size={13} className="text-gray-400 group-hover:text-ug-teal shrink-0" />
                          <span className="truncate">{link}</span>
                        </span>
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-ug-navy shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-3 sm:py-6">
      <div id="news-curator-workspace-anchor" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-100 pb-3 gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-ug-navy rounded-xl text-white shadow-xs shrink-0">
                 <Microscope size={18} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-ug-navy tracking-tight">
                  <Tr text="Discovery & Industry News" />
                </h1>
                <p className="text-ug-teal font-extrabold text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">
                  <Tr text="University of Ghana • Virtual Industry Hub" />
                </p>
              </div>
            </div>
            <p className="text-gray-500 font-medium text-xs max-w-2xl leading-relaxed">
              <Tr text="Monitoring research outputs, commercial spin-offs, partnerships, and global innovation trends." />
            </p>
          </div>
          {lastSync && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 self-start md:self-auto shrink-0">
              <Clock size={11} className="text-ug-teal" />
              <span><Tr text="Synced:" /> {lastSync.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Search & Category Filter Control Bar */}
        <div className="bg-slate-50/80 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 mb-5">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            
            {/* Search Input Box (Compact) */}
            <div className="flex items-center gap-2 flex-1 max-w-lg w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input 
                  type="text" 
                  placeholder={searchNewsPlaceholder}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ug-teal/50 focus:border-ug-teal transition-all text-xs font-semibold text-slate-800 placeholder:text-gray-400 shadow-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

            </div>

            {/* Filter Dropdown & View Mode Controls */}
            <div className="flex items-center gap-2 justify-between sm:justify-end">
              {/* Category Select Dropdown with Funnel Filter Icon */}
              <div className="relative flex-1 sm:flex-none min-w-[150px]">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ug-navy pointer-events-none" size={13} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none w-full bg-white border border-gray-200 text-slate-800 py-2 pl-8 pr-7 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-ug-teal/50 focus:border-ug-teal cursor-pointer shadow-xs truncate"
                >
                  <option value="All">{filterAllLabel}</option>
                  <option value="Announcement">{filterAnnouncementLabel}</option>
                  <option value="Grant Opportunity">{filterGrantLabel}</option>
                  <option value="Strategic Partnership">{filterPartnershipLabel}</option>
                  <option value="Research Release">{filterReleaseLabel}</option>
                  <option value="Ecosystem Updates">{filterEcosystemLabel}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-gray-200 shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${viewMode === 'grid' ? 'bg-ug-navy text-white shadow-xs' : 'text-gray-500 hover:text-slate-900'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={13} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${viewMode === 'list' ? 'bg-ug-navy text-white shadow-xs' : 'text-gray-500 hover:text-slate-900'}`}
                  title="List View"
                >
                  <List size={13} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Loading State */}
        {loading && filteredNews.length === 0 && (
           <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="animate-spin text-ug-teal mb-4" size={40} />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest"><Tr text="Loading Intelligence..." /></p>
           </div>
        )}

        {/* News Items Display */}
        {filteredNews.length === 0 && !loading && (
          <div className="text-center py-24 border-2 border-dashed border-gray-200/80 rounded-2xl bg-slate-50/50">
             <Globe className="text-gray-300 mx-auto mb-4" size={48} />
             <h3 className="text-lg font-bold text-ug-navy"><Tr text="No news items found" /></h3>
             <p className="text-gray-500 font-medium mt-1 text-sm"><Tr text="Try clearing your search words or category filter." /></p>
             <button
               onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
               className="mt-4 px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-bold hover:bg-ug-navy/90 transition-colors cursor-pointer"
             >
               <Tr text="Reset Filters" />
             </button>
          </div>
        )}

        {/* News Grid / List Layout */}
        <div className={`transition-opacity duration-300 ${loading && filteredNews.length > 0 ? 'opacity-50' : 'opacity-100'} ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6' : 'space-y-4'}`}>
          {filteredNews.map((item) => (
            <article 
              key={item.id} 
              onClick={() => handleNewsClick(item)}
              className={`group bg-white rounded-2xl overflow-hidden border border-gray-200/90 hover:border-ug-teal/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row'}`}
            >
              {/* Image thumbnail */}
              <div className={`overflow-hidden relative bg-gray-100 shrink-0 ${viewMode === 'grid' ? 'aspect-[16/10] w-full' : 'w-full sm:w-52 lg:w-60 h-44 sm:h-auto'}`}>
                <img 
                  src={item.image_url} 
                  alt="" 
                  onError={handleImageError}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs ${item.is_ai_generated ? 'bg-ug-teal text-white' : 'bg-ug-navy text-white'}`}>
                    <Tr text={item.category} />
                  </span>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{formatNewsDate(item.published_at)}</span>
                    </span>
                    {item.source_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-ug-teal font-bold truncate max-w-[140px]">
                          <Globe size={11} />
                          <span className="truncate"><Tr text={item.source_name} /></span>
                        </span>
                      </>
                    )}
                  </div>
                  
                  <h2 className="text-sm sm:text-base font-bold text-ug-navy mb-2 leading-snug group-hover:text-ug-teal transition-colors line-clamp-2">
                    <Tr text={item.title} />
                  </h2>
                  
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 font-normal mb-3">
                    <Tr text={item.summary} />
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-ug-navy font-bold text-[11px] group-hover:text-ug-teal transition-colors flex items-center gap-1">
                    <span><Tr text="Read Briefing" /></span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  {item.external_url && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <ExternalLink size={10} />
                      <span><Tr text="Source" /></span>
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Paginated Feed Control */}
        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={loading}
              className="px-6 py-3 bg-white border border-ug-navy hover:bg-ug-navy hover:text-white text-ug-navy rounded-xl font-bold text-xs uppercase tracking-wider transition duration-200 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-ug-teal" size={14} />
                  <span>Loading Discoveries...</span>
                </>
              ) : (
                <>
                  <span>Load More News</span>
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default News;
