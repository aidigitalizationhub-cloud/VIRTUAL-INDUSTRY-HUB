import React from 'react';
import {
  ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, Filter, LayoutDashboard,
  Link2, Loader2, Newspaper, Plus, Radio, Search, Settings, Sparkles, Trash, Upload,
  X, Zap
} from 'lucide-react';
import { NewsItem } from '../../types';
import ImageWithFallback from '../ImageWithFallback';
import { ToastType } from '../../contexts/ToastContext';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export interface NewsCuratorWorkspaceProps {
  lastSync: Date | null;
  archiveSearch: string;
  setArchiveSearch: Setter<string>;
  navigate: (to: string) => void;
  showToast: (message: string, type?: ToastType) => void;
  handleClearWorkspace: () => void;
  filteredArchives: NewsItem[];
  paginatedArchives: NewsItem[];
  editingNews: NewsItem | null;
  handleEditNewsClick: (event: React.MouseEvent, item: NewsItem) => void;
  handleImageError: React.ReactEventHandler<HTMLImageElement>;
  archivePage: number;
  setArchivePage: Setter<number>;
  totalPages: number;
  selectedCategory: string;
  setSelectedCategory: Setter<string>;
  selectedStatusFilter: string;
  setSelectedStatusFilter: Setter<string>;
  archiveSort: string;
  setArchiveSort: Setter<string>;
  setCuratorMode: Setter<boolean>;
  tabs: { id: number; name: string }[];
  activeTab: number;
  setActiveTab: Setter<number>;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleDocumentExtract: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isExtractingDoc: boolean;
  newsTitle: string;
  setNewsTitle: Setter<string>;
  newsSummary: string;
  setNewsSummary: Setter<string>;
  newsCategory: string;
  setNewsCategory: Setter<string>;
  newsPublishedAt: string;
  setNewsPublishedAt: Setter<string>;
  newsImageUrl: string;
  setNewsImageUrl: Setter<string>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingImage: boolean;
  tagList: string[];
  handleRemoveTag: (tag: string) => void;
  handleAddTag: (tag: string) => void;
  newsExternalUrl: string;
  setNewsExternalUrl: Setter<string>;
  newsRelevanceScore: number;
  setNewsRelevanceScore: Setter<number>;
  newsSourceVerificationNotes: string;
  setNewsSourceVerificationNotes: Setter<string>;
  aiTopic: string;
  setAiTopic: Setter<string>;
  aiKeywords: string;
  setAiKeywords: Setter<string>;
  isGeneratingAI: boolean;
  handleGenerateAIPressRelease: (topic?: string, keywords?: string) => Promise<void>;
  newsReferenceLinks: string[];
  setNewsReferenceLinks: Setter<string[]>;
  handleDeleteNews: (event: React.MouseEvent | undefined, id: string) => Promise<void>;
  handleActionSave: (status: 'Draft' | 'Published') => Promise<void>;
  isSavingNews: boolean;
}

const NewsCuratorWorkspace: React.FC<NewsCuratorWorkspaceProps> = (props) => {
  const {
    lastSync, archiveSearch, setArchiveSearch, navigate, showToast, handleClearWorkspace,
    filteredArchives, paginatedArchives, editingNews, handleEditNewsClick, handleImageError,
    archivePage, setArchivePage, totalPages, selectedCategory, setSelectedCategory,
    selectedStatusFilter, setSelectedStatusFilter, archiveSort, setArchiveSort, setCuratorMode,
    tabs, activeTab, setActiveTab, docInputRef, handleDocumentExtract, isExtractingDoc,
    newsTitle, setNewsTitle, newsSummary, setNewsSummary, newsCategory, setNewsCategory,
    newsPublishedAt, setNewsPublishedAt, newsImageUrl, setNewsImageUrl, imageInputRef,
    handleImageUpload, isUploadingImage, tagList, handleRemoveTag, handleAddTag,
    newsExternalUrl, setNewsExternalUrl, newsRelevanceScore, setNewsRelevanceScore,
    newsSourceVerificationNotes, setNewsSourceVerificationNotes, aiTopic, setAiTopic,
    aiKeywords, setAiKeywords, isGeneratingAI, handleGenerateAIPressRelease, newsReferenceLinks,
    setNewsReferenceLinks, handleDeleteNews, handleActionSave, isSavingNews
  } = props;

    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f6] text-slate-800 font-sans select-none">
        {/* HIDDEN FILE INPUT FOR MANUAL UPLOADS */}
        <input
          type="file"
          ref={imageInputRef}
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
                <h3 className="text-xs font-bold tracking-[0.2em] text-white leading-none">VIRTUAL HUB</h3>
                <p className="text-[11px] font-semibold tracking-wide text-purple-400 mt-1">CORE GOVERNANCE</p>
              </div>
            </div>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] font-semibold tracking-wide text-[#4e5072] px-3 mb-3">SYSTEM MODULES</div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#151735] hover:text-white transition duration-150 text-left"
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
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

            {/* ACTIVE ITEM */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600/20 to-indigo-600/10 text-white border-l-4 border-purple-500 shadow-inner text-left"
            >
              <div className="flex items-center gap-3.5">
                <Radio size={16} className="text-purple-400" />
                <span className="font-extrabold">News Curator</span>
              </div>
              <span className="bg-purple-500/20 text-purple-300 text-[11px] font-semibold px-1.5 py-0.5 rounded-full tracking-wider">Active</span>
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
                <h4 className="text-[11px] font-semibold text-white tracking-wider">AI Scout Sync</h4>
              </div>
              <p className="text-[11px] text-[#717393] font-semibold">
                Last sync: {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '5 mins ago'}
              </p>

              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-emerald-400 tracking-wide bg-emerald-500/5 py-1.5 px-2.5 rounded-lg border border-emerald-500/20">
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
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Platform Admin</span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold text-slate-800 tracking-wider">News curation dashboard</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative max-w-xs hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search news, keywords, tags... ΓîÿK"
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  className="w-64 pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 focus:border-purple-500 rounded-xl text-[11px] font-bold outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 border-l border-gray-100 pl-6">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-gray-900 leading-tight">Welcome, ABDULYAH</p>
                  <p className="text-[11px] font-semibold text-purple-600 tracking-wide mt-0.5">Administrator</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/20">
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
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Broadcast Archives</h2>
                  <p className="text-[11px] text-gray-400 font-bold tracking-wider mt-1">Curated Research & Listings</p>
                </div>

                <button
                  type="button"
                  onClick={handleClearWorkspace}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-semibold tracking-wide transition duration-150 shadow-md shadow-purple-600/10 hover:scale-[1.02]"
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
                      className="w-full bg-white border border-gray-200 focus:border-purple-500 p-2.5 rounded-xl text-[11px] font-semibold text-gray-700 tracking-wider outline-none cursor-pointer appearance-none"
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
                      className="w-full bg-white border border-gray-200 focus:border-purple-500 p-2.5 rounded-xl text-[11px] font-semibold text-gray-700 tracking-wider outline-none cursor-pointer appearance-none"
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
                  <span className="text-[11px] font-semibold text-gray-400 tracking-wider">
                    Total {filteredArchives.length} archives found
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 tracking-wider">
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
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-white p-6">
                    <Newspaper className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-xs font-bold text-gray-500 uppercase">No matching archives found</p>
                    <p className="text-[11px] text-gray-400 mt-1">Refine filters or compose a new announcement.</p>
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
                             <ImageWithFallback
                            src={item.image_url}
                            alt=""
                            onError={handleImageError}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[11px] font-semibold text-purple-600 tracking-wider">
                                {item.category}
                              </span>
                              <span className="text-gray-300 text-[11px]">ΓÇó</span>
                              <span className="text-gray-400 text-[11px] font-bold">
                                {new Date(item.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              {item.status === 'Draft' ? (
                                <span className="bg-amber-100 text-amber-700 font-extrabold text-[10px] uppercase px-1 rounded">DRAFT</span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 font-extrabold text-[10px] uppercase px-1 rounded">PUBLISHED</span>
                              )}
                              {(item.is_ai_generated || (item.relevance_score && item.relevance_score > 80)) && (
                                <span className="bg-purple-100 text-purple-700 font-extrabold text-[10px] uppercase px-1 rounded flex items-center gap-0.5">
                                  <Sparkles size={6} /> AI Scout
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-gray-900 leading-snug group-hover:text-purple-600 transition-colors line-clamp-2">
                              {item.title}
                            </h4>
                          </div>

                          <p className="text-[11px] text-gray-400 font-medium line-clamp-1 mt-1 leading-relaxed">
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
                           <span className="type-label text-gray-300 font-bold">
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
                        className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition duration-150 ${
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
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Curator Workspace</h2>
                  <p className="text-[11px] text-gray-400 font-bold tracking-wider mt-1">Compose, Edit, and Audit listings</p>
                </div>

                <button
                  type="button"
                  onClick={() => setCuratorMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-xl text-[11px] font-semibold tracking-wide transition duration-150 cursor-pointer"
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
                      className={`py-4 px-4 border-b-2 font-semibold text-[11px] tracking-wider flex items-center gap-2.5 transition duration-150 relative cursor-pointer ${
                        isActive
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-400 hover:text-slate-700'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full text-[11px] flex items-center justify-center font-semibold ${
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
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Document Extractor</h3>
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

                        {/* Title */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[11px] font-semibold text-gray-500 tracking-wider">Title *</label>
                            <span className="text-[11px] font-bold text-gray-400">{newsTitle.length}/200 characters</span>
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
                            <label className="text-[11px] font-semibold text-gray-500 tracking-wider">Short Summary *</label>
                            <span className="text-[11px] font-bold text-gray-400">{newsSummary.length}/1000 characters</span>
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
                            <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Category *</label>
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
                            <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Published At</label>
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
                          <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Featured / Visual Asset *</label>
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
                                   onClick={() => imageInputRef.current?.click()}
                                  className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-[11px] font-semibold tracking-wider transition"
                                >
                                  Replace Image
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewsImageUrl('')}
                                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold tracking-wider transition"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => imageInputRef.current?.click()}
                              className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50/5 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[162px] bg-white"
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="animate-spin text-purple-600 mb-2" size={24} />
                                  <span className="text-[11px] font-semibold text-purple-600">Uploading visual asset...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="text-gray-300 mb-2.5 animate-none" size={28} />
                                  <span className="text-xs font-extrabold text-slate-700 leading-none">Upload Featured Image</span>
                                  <span className="text-[11px] text-gray-400 font-semibold mt-1.5">JPG, PNG, or WEBP. Max 5MB.</span>
                                </>
                              )}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400 font-bold mt-2 tracking-wide">
                            Note: Image upload is manual. AI image generators are strictly bypassed.
                          </p>
                        </div>

                        {/* INTERACTIVE TAGS WITH ENTER TO APPEND */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Announcement Tags</label>
                          <div className="border border-gray-200 rounded-xl p-3 bg-white flex flex-wrap gap-1.5 focus-within:border-purple-500 transition duration-150">
                            {tagList.map(tag => (
                              <span
                                key={tag}
                                className="bg-purple-50 text-purple-700 font-bold text-[11px] pl-2.5 pr-1.5 py-1 rounded-lg border border-purple-100 flex items-center gap-1 shrink-0"
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
                          <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Source / External Link</label>
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
                          <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Scout Relevance Score ({newsRelevanceScore}%)</label>
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
                              className="w-16 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-xs font-bold text-gray-800 outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        {/* Source Verification notes */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Source Verification Notes</label>
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
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Gemini AI Assistant</h3>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-5">
                            Auto-draft professional, highly engaging headlines and press summaries instantly. Uses Google's modern Gemini models to craft authorized content outlines.
                          </p>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1">Core Topic / Headline Concept</label>
                              <input
                                type="text"
                                placeholder="e.g. Malaria Vaccine Trial Success at UG"
                                value={aiTopic}
                                onChange={e => setAiTopic(e.target.value)}
                                className="w-full bg-white border border-gray-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1">Context Keywords (Optional)</label>
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
                          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold text-[11px] tracking-wide transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/15"
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
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5">Academic & Media Citations</h3>
                      <p className="text-[11px] text-gray-400 font-bold mb-4 tracking-wider leading-relaxed">
                        Add up to 4 citation links. These display as interactive reference lists in the published news brief.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {newsReferenceLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                           <span className="w-6 type-label text-purple-600">#{idx + 1}</span>
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
                      className="flex items-center gap-1.5 px-4.5 py-3 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-600 rounded-xl transition-all font-semibold text-[11px] tracking-wide cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Delete / Archive</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-gray-400 font-extrabold tracking-wide pl-2">
                      New Announcement Composition Mode
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleActionSave('Draft')}
                    disabled={isSavingNews}
                    className="flex items-center gap-1.5 px-5 py-3 border border-purple-200 hover:border-purple-400 text-purple-700 bg-purple-50/20 hover:bg-purple-50/50 rounded-xl transition duration-150 font-semibold text-[11px] tracking-wide cursor-pointer"
                  >
                    <FileText size={12} />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActionSave('Published')}
                    disabled={isSavingNews}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#1e145c] hover:bg-[#281b7a] text-white rounded-xl transition duration-150 font-semibold text-[11px] tracking-wide shadow-md shadow-purple-950/15 cursor-pointer"
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
};

export default NewsCuratorWorkspace;
