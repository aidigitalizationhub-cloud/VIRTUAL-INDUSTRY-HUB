import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AIScoutService } from '../services/aiScoutService';
import { DocumentExtractionService } from '../services/documentExtractionService';
import { NewsItem } from '../types';
import { getAuthUser } from '../lib/auth-client';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { getGeminiResponse } from '../services/geminiService';
import { useTranslatedText } from '../services/translationService';
import { formatDateMedium } from '../lib/format';
import NewsCuratorWorkspace from '../components/news/NewsCuratorWorkspace';
import NewsArticleDetail from '../components/news/NewsArticleDetail';
import NewsFeed from '../components/news/NewsFeed';

const News: React.FC = () => {
  const navigate = useNavigate();
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

  const [, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getAuthUser().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    });
  }, []);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Administrative / Curation states (verified against the user's profile)
  const [isAdmin, setIsAdmin] = useState(false);
  const [curatorMode, setCuratorMode] = useState(false);

  useEffect(() => {
    StorageService.verifyAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  // News editing / creation form states
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Announcement');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsExternalUrl, setNewsExternalUrl] = useState('');
  const [, setNewsStatus] = useState<'Draft' | 'Published'>('Published');
  const [newsReferenceLinks, setNewsReferenceLinks] = useState<string[]>(['', '', '', '']);
  const [newsTags, setNewsTags] = useState('');
  const [newsRelevanceScore, setNewsRelevanceScore] = useState<number>(0);
  const [newsSourceVerificationNotes, setNewsSourceVerificationNotes] = useState('');
  const [extractionNeedsReview, setExtractionNeedsReview] = useState(false);

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
  const [, setShowAIWriteModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');

  // Delegates to the shared formatter so every page renders dates consistently
  const formatNewsDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    return formatDateMedium(dateStr) || dateStr;
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

    if (status === 'Published' && extractionNeedsReview) {
      setExtractionNeedsReview(false);
      showToast("This extracted draft needs human review: verify the headline, summary, category, and source evidence, then publish again.", "error");
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
      setExtractionNeedsReview(false);
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
          if ((resData as any).needs_review) {
            setExtractionNeedsReview(true);
            showToast("Document analyzed with degraded extraction — verify all fields and source evidence before publishing.", "warning");
          } else {
            setExtractionNeedsReview(false);
            showToast("Document analyzed and fields auto-populated!", "success");
          }
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
  const imageInputRef = React.useRef<HTMLInputElement>(null);
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
      <NewsCuratorWorkspace
        lastSync={lastSync}
        archiveSearch={archiveSearch}
        setArchiveSearch={setArchiveSearch}
        navigate={navigate}
        showToast={showToast}
        handleClearWorkspace={handleClearWorkspace}
        filteredArchives={filteredArchives}
        paginatedArchives={paginatedArchives}
        editingNews={editingNews}
        handleEditNewsClick={handleEditNewsClick}
        handleImageError={handleImageError}
        archivePage={archivePage}
        setArchivePage={setArchivePage}
        totalPages={totalPages}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
         selectedStatusFilter={selectedStatusFilter}
         setSelectedStatusFilter={setSelectedStatusFilter}
         archiveSort={archiveSort}
         setArchiveSort={setArchiveSort}
         setCuratorMode={setCuratorMode}
         tabs={tabs}
         activeTab={activeTab}
         setActiveTab={setActiveTab}
         docInputRef={docInputRef}
         handleDocumentExtract={handleDocumentExtract}
         isExtractingDoc={isExtractingDoc}
         newsTitle={newsTitle}
         setNewsTitle={setNewsTitle}
         newsSummary={newsSummary}
         setNewsSummary={setNewsSummary}
         newsCategory={newsCategory}
         setNewsCategory={setNewsCategory}
         newsPublishedAt={newsPublishedAt}
         setNewsPublishedAt={setNewsPublishedAt}
         newsImageUrl={newsImageUrl}
         setNewsImageUrl={setNewsImageUrl}
         imageInputRef={imageInputRef}
         handleImageUpload={handleImageUpload}
         isUploadingImage={isUploadingImage}
         tagList={tagList}
         handleRemoveTag={handleRemoveTag}
         handleAddTag={handleAddTag}
         newsExternalUrl={newsExternalUrl}
         setNewsExternalUrl={setNewsExternalUrl}
         newsRelevanceScore={newsRelevanceScore}
         setNewsRelevanceScore={setNewsRelevanceScore}
         newsSourceVerificationNotes={newsSourceVerificationNotes}
         setNewsSourceVerificationNotes={setNewsSourceVerificationNotes}
         aiTopic={aiTopic}
         setAiTopic={setAiTopic}
         aiKeywords={aiKeywords}
         setAiKeywords={setAiKeywords}
         isGeneratingAI={isGeneratingAI}
         handleGenerateAIPressRelease={handleGenerateAIPressRelease}
         newsReferenceLinks={newsReferenceLinks}
         setNewsReferenceLinks={setNewsReferenceLinks}
         handleDeleteNews={handleDeleteNews}
         handleActionSave={handleActionSave}
         isSavingNews={isSavingNews}
       />
     );
   }

  if (selectedDetailedNews) {
    return (
      <NewsArticleDetail
        article={selectedDetailedNews}
        formatNewsDate={formatNewsDate}
        handleImageError={handleImageError}
        onBack={() => {
          setSelectedDetailedNews(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <NewsFeed
      filteredNews={filteredNews}
      loading={loading}
      hasMore={hasMore}
      lastSync={lastSync}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      viewMode={viewMode}
      setViewMode={setViewMode}
      searchNewsPlaceholder={searchNewsPlaceholder}
      filterAllLabel={filterAllLabel}
      filterAnnouncementLabel={filterAnnouncementLabel}
      filterGrantLabel={filterGrantLabel}
      filterPartnershipLabel={filterPartnershipLabel}
      filterReleaseLabel={filterReleaseLabel}
      filterEcosystemLabel={filterEcosystemLabel}
      isAdmin={isAdmin}
      setCuratorMode={setCuratorMode}
      handleNewsClick={handleNewsClick}
      handleImageError={handleImageError}
      formatNewsDate={formatNewsDate}
      setPage={setPage}
    />
  );
};

export default News;
