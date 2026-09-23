import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check, ChevronLeft, ChevronRight, Clock, Edit, ExternalLink, Globe, Loader2,
  Plus, Search, Sparkles, Trash2, Upload, X
} from 'lucide-react';
import { NewsItem } from '../../types';

interface AdminNewsSectionProps {
  news: NewsItem[];
  sortedArchives: NewsItem[];
  paginatedArchives: NewsItem[];
  totalPages: number;
  archivePage: number;
  archiveSearch: string;
  selectedCategory: string;
  selectedStatusFilter: string;
  archiveSort: string;
  isWorkspaceOpen: boolean;
  activeTab: number;
  editingNews: Partial<NewsItem> | null;
  newsTitle: string;
  newsCategory: string;
  newsSummary: string;
  newsImageUrl: string;
  newsExternalUrl: string;
  newsReferenceLinks: string[];
  newsPublishedAt: string;
  aiTopic: string;
  aiKeywords: string;
  aiTone: string;
  isSavingNews: boolean;
  isGeneratingAI: boolean;
  isExtractingDoc: boolean;
  isUploadingImage: boolean;
  isScoutingNews: boolean;
  newsTags: string;
  newsRelevanceScore: number;
  newsSourceVerificationNotes: string;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  onArchivePageChange: (page: number | ((page: number) => number)) => void;
  onArchiveSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onArchiveSortChange: (value: string) => void;
  onWorkspaceOpenChange: (open: boolean) => void;
  onActiveTabChange: (tab: number) => void;
  onTitleChange: (value: string) => void;
  onCategoryEditorChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onExternalUrlChange: (value: string) => void;
  onReferenceLinksChange: (links: string[]) => void;
  onPublishedAtChange: (value: string) => void;
  onAiTopicChange: (value: string) => void;
  onAiKeywordsChange: (value: string) => void;
  onAiToneChange: (value: string) => void;
  onEditNews: (event: React.MouseEvent | undefined, item: NewsItem) => void;
  onDeleteNews: (event: React.MouseEvent | undefined, id: string) => void;
  onCreateNew: () => void;
  onClearWorkspace: () => void;
  onScoutNews: () => void;
  onDocumentExtract: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateAI: (topic?: string, keywords?: string, tone?: string) => Promise<void>;
  onSave: (status: 'Draft' | 'Published') => void;
}

export const AdminNewsSection: React.FC<AdminNewsSectionProps> = (props) => {
  const {
    sortedArchives, paginatedArchives, totalPages, archivePage, archiveSearch,
    selectedCategory, selectedStatusFilter, archiveSort, isWorkspaceOpen, activeTab,
    editingNews, newsTitle, newsCategory, newsSummary, newsImageUrl, newsExternalUrl,
    newsReferenceLinks, newsPublishedAt, aiTopic, aiKeywords, aiTone, isSavingNews,
    isGeneratingAI, isExtractingDoc, isUploadingImage, isScoutingNews, imageInputRef,
    docInputRef, onArchivePageChange, onArchiveSearchChange, onCategoryChange,
    onStatusFilterChange, onArchiveSortChange, onWorkspaceOpenChange, onActiveTabChange,
    onTitleChange, onCategoryEditorChange, onSummaryChange, onImageUrlChange,
    onExternalUrlChange, onReferenceLinksChange, onPublishedAtChange, onAiTopicChange,
    onAiKeywordsChange, onAiToneChange, onEditNews, onDeleteNews, onCreateNew,
    onClearWorkspace, onScoutNews, onDocumentExtract, onImageUpload, onGenerateAI, onSave
  } = props;

  return (
    <motion.div key="news" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
        <div><h2 className="text-xl font-bold text-ug-navy flex items-center gap-2"><Globe size={20} className="text-ug-teal" />News &amp; Broadcast Curator</h2><p className="text-xs text-gray-500 mt-1 font-medium">Manage and broadcast academic breakthroughs, grant opportunities, and strategic ecosystem updates.</p></div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button onClick={onScoutNews} disabled={isScoutingNews} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-xs font-bold text-gray-700 rounded-xl transition disabled:opacity-50 cursor-pointer h-10">{isScoutingNews ? <Loader2 size={14} className="animate-spin text-ug-teal" /> : <Sparkles size={14} className="text-ug-teal" />}<span>{isScoutingNews ? 'Scouting...' : 'AI Scout Re-Sync'}</span></button>
          <button onClick={() => { onCreateNew(); onWorkspaceOpenChange(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-ug-teal hover:bg-ug-teal/90 text-white text-xs font-bold rounded-xl transition shadow-md shadow-ug-teal/10 cursor-pointer h-10"><Plus size={14} /><span>Create New</span></button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start text-left">
        <div className={`${isWorkspaceOpen ? 'col-span-12 lg:col-span-5' : 'col-span-12'} space-y-6`}>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-ug-navy">Broadcast Archives</h3><span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{sortedArchives.length} Total items</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Search archives..." value={archiveSearch} onChange={e => { onArchiveSearchChange(e.target.value); onArchivePageChange(1); }} className="w-full bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-gray-800 outline-none transition" /></div><div className="grid grid-cols-2 gap-2"><select value={selectedCategory} onChange={e => { onCategoryChange(e.target.value); onArchivePageChange(1); }} className="bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl px-2 py-2.5 text-xs font-medium text-gray-700 outline-none cursor-pointer"><option value="All">All Categories</option><option value="Announcement">Announcement</option><option value="Grant Opportunity">Grant Opportunity</option><option value="Strategic Partnership">Strategic Partnership</option><option value="Research Release">Research Release</option><option value="Ecosystem Updates">Ecosystem Updates</option></select><select value={selectedStatusFilter} onChange={e => { onStatusFilterChange(e.target.value); onArchivePageChange(1); }} className="bg-gray-50/50 border border-gray-200 focus:border-ug-teal rounded-xl px-2 py-2.5 text-xs font-medium text-gray-700 outline-none cursor-pointer"><option value="All">All Status</option><option value="Draft">Draft</option><option value="Published">Published</option></select></div></div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 font-bold border-t border-gray-100 pt-3"><span>Sort Order</span><div className="flex gap-2"><button onClick={() => onArchiveSortChange('newest')} className={`hover:text-ug-teal transition cursor-pointer ${archiveSort === 'newest' ? 'text-ug-teal underline' : ''}`}>Newest First</button><button onClick={() => onArchiveSortChange('oldest')} className={`hover:text-ug-teal transition cursor-pointer ${archiveSort === 'oldest' ? 'text-ug-teal underline' : ''}`}>Oldest First</button></div></div>
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">{paginatedArchives.length === 0 ? <div className="text-center py-12 bg-gray-50/30 border border-dashed border-gray-100 rounded-xl"><p className="text-xs text-gray-400 font-medium">No archived announcements match filters.</p></div> : paginatedArchives.map(item => { const isCurrentlyEditing = editingNews?.id === item.id; return <div key={item.id} onClick={() => { onEditNews(undefined, item); onWorkspaceOpenChange(true); }} className={`group p-4 bg-white hover:bg-gray-50/30 border rounded-xl transition cursor-pointer flex gap-4 items-start ${isCurrentlyEditing ? 'border-ug-teal shadow-md shadow-ug-teal/5 bg-ug-teal/5' : 'border-gray-100 hover:border-gray-200'}`}>{item.image_url && <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100"><img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" /></div>}<div className="flex-1 min-w-0 space-y-1"><div className="flex items-center gap-1.5 flex-wrap"><span className="text-[11px] font-semibold text-ug-teal tracking-wider">{item.category}</span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${item.status === 'Published' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{item.status}</span>{item.is_ai_generated && <span className="text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full flex items-center gap-1"><Sparkles size={8} />AI</span>}</div><h4 className="text-xs font-bold text-ug-navy line-clamp-1 group-hover:text-ug-teal transition leading-tight">{item.title}</h4><p className="text-[11px] text-gray-500 line-clamp-2 font-medium leading-relaxed">{item.summary}</p><div className="flex items-center justify-between text-[11px] text-gray-400 font-bold pt-1"><div className="flex items-center gap-1"><Clock size={10} /><span>{new Date(item.published_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button type="button" onClick={e => { e.stopPropagation(); onEditNews(e, item); onWorkspaceOpenChange(true); }} className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-ug-teal cursor-pointer"><Edit size={12} /></button><button type="button" onClick={e => { e.stopPropagation(); onDeleteNews(e, item.id); }} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={12} /></button></div></div></div></div>; })}</div>
            {totalPages > 1 && <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold text-gray-500"><span>Page {archivePage} of {totalPages}</span><div className="flex gap-1"><button onClick={() => onArchivePageChange(page => Math.max(1, page - 1))} disabled={archivePage === 1} className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg transition disabled:opacity-40 cursor-pointer"><ChevronLeft size={14} /></button><button onClick={() => onArchivePageChange(page => Math.min(totalPages, page + 1))} disabled={archivePage === totalPages} className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg transition disabled:opacity-40 cursor-pointer"><ChevronRight size={14} /></button></div></div>}
          </div>
        </div>

        <AnimatePresence mode="wait">{isWorkspaceOpen && <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden text-left">
          <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-ug-teal rounded-full animate-pulse" /><h3 className="text-sm font-extrabold text-ug-navy">{editingNews ? 'Edit Broadcast Composition' : 'New Broadcast Composition'}</h3></div><div className="flex items-center gap-2"><button type="button" onClick={onClearWorkspace} className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer">Clear</button><button type="button" onClick={() => onWorkspaceOpenChange(false)} className="p-1.5 hover:bg-gray-200/50 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"><X size={16} /></button></div></div>
          <div className="flex border-b border-gray-100 bg-gray-50/20">{[{ id: 1, title: '1. Core Insight' }, { id: 2, title: '2. AI Copywriting' }].map(tab => <button key={tab.id} type="button" onClick={() => onActiveTabChange(tab.id)} className={`flex-1 text-center py-3.5 text-[11px] font-semibold tracking-wider border-b-2 transition duration-200 cursor-pointer ${activeTab === tab.id ? 'border-ug-teal text-ug-teal bg-white font-bold' : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50/30'}`}>{tab.title}</button>)}</div>
          <div className="p-6 overflow-y-auto max-h-[600px] space-y-5">{activeTab === 1 ? <div className="space-y-5"><div className="bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-100 rounded-2xl p-5"><div className="flex items-start gap-3.5"><div className="p-2.5 bg-purple-100 rounded-xl text-purple-700"><Sparkles size={18} /></div><div className="flex-1"><h3 className="text-xs font-bold text-slate-800">AI Document Extractor</h3><p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">Upload a news summary draft or article (.txt, .doc, .docx) and the Gemini system will extract the headline, briefing, category, tags, and verification details.</p><div className="mt-4 flex items-center gap-3"><button type="button" onClick={() => docInputRef.current?.click()} disabled={isExtractingDoc} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold text-[11px] rounded-xl transition flex items-center gap-2 cursor-pointer">{isExtractingDoc ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}<span>{isExtractingDoc ? 'Analyzing Document...' : 'Upload Draft Document'}</span></button></div><input type="file" ref={docInputRef} onChange={onDocumentExtract} accept=".txt,.doc,.docx" className="hidden" /></div></div></div><div><div className="flex justify-between items-center mb-1.5"><label className="text-[11px] font-semibold text-gray-500 tracking-wider">Broadcast Title *</label><span className="text-[11px] font-bold text-gray-400">{newsTitle.length}/200 chars</span></div><input type="text" value={newsTitle} onChange={e => onTitleChange(e.target.value.slice(0, 200))} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 text-xs font-bold text-gray-800 outline-none" /></div><div><div className="flex justify-between items-center mb-1.5"><label className="text-[11px] font-semibold text-gray-500 tracking-wider">Short Summary *</label><span className="text-[11px] font-bold text-gray-400">{newsSummary.length}/1000 chars</span></div><textarea value={newsSummary} onChange={e => onSummaryChange(e.target.value.slice(0, 1000))} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 text-xs font-medium text-gray-800 outline-none h-32 resize-none" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Category *</label><select value={newsCategory} onChange={e => onCategoryEditorChange(e.target.value)} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 text-xs font-bold text-gray-800 outline-none cursor-pointer"><option>Announcement</option><option>Grant Opportunity</option><option>Strategic Partnership</option><option>Research Release</option><option>Ecosystem Updates</option></select></div><div><label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Broadcast Schedule</label><input type="datetime-local" value={newsPublishedAt} onChange={e => onPublishedAtChange(e.target.value)} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-2.5 text-xs font-bold text-gray-800 outline-none" /></div></div><div><label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Featured Broadcast Graphic *</label>{newsImageUrl ? <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video group"><img src={newsImageUrl} alt="Featured asset" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3"><button type="button" onClick={() => imageInputRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-[11px] font-semibold cursor-pointer">Replace Image</button><button type="button" onClick={() => onImageUrlChange('')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-semibold cursor-pointer">Remove</button></div></div> : <div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-ug-teal transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[140px]">{isUploadingImage ? <Loader2 className="animate-spin text-ug-teal mb-2" size={24} /> : <><Upload className="text-gray-300 mb-2" size={24} /><span className="text-xs font-bold text-gray-700">Upload Featured Image</span><span className="text-[11px] text-gray-400 font-semibold mt-1">JPG, PNG, WEBP. Max 5MB.</span></>}</div>}<input type="file" ref={imageInputRef} onChange={onImageUpload} accept="image/*" className="hidden" /></div><div><label className="text-[11px] font-semibold text-gray-500 tracking-wider block mb-1.5">Official Source / External Citation Link</label><div className="relative"><input type="text" value={newsExternalUrl} onChange={e => onExternalUrlChange(e.target.value)} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-3 pr-10 text-xs font-bold text-gray-800 outline-none" /><ExternalLink size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /></div></div><div className="pt-4 border-t border-gray-100"><h4 className="text-[11px] font-semibold text-gray-500 tracking-wider mb-2">Citations &amp; References (Max 4 Links)</h4><div className="grid gap-2.5">{newsReferenceLinks.map((link, idx) => <div key={idx} className="relative"><input type="text" placeholder={`Citation link #${idx + 1}`} value={link} onChange={e => { const updated = [...newsReferenceLinks]; updated[idx] = e.target.value; onReferenceLinksChange(updated); }} className="w-full bg-white border border-gray-200 focus:border-ug-teal rounded-xl p-2.5 pr-8 text-xs font-medium text-gray-800 outline-none" /><span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-[11px] font-bold">#{idx + 1}</span></div>)}</div></div></div> : <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-4"><div className="flex items-center gap-2"><Sparkles size={14} className="text-purple-600" /><h4 className="text-xs font-bold text-slate-800">Gemini Professional Copywriter</h4></div><p className="text-[11px] text-gray-500 font-medium leading-relaxed">Authoritatively draft elite academic public announcements and breakthroughs instantly.</p><div className="space-y-3.5"><input placeholder="Broadcast Title / Main Topic" value={aiTopic || newsTitle} onChange={e => onAiTopicChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" /><input placeholder="Focus Keywords / Context Indicators" value={aiKeywords} onChange={e => onAiKeywordsChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" /><select value={aiTone} onChange={e => onAiToneChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"><option>Academic Press Release</option><option>Breakthrough &amp; Discovery</option><option>Strategic Partnership &amp; Funding</option><option>Impact Story</option></select><button type="button" onClick={() => onGenerateAI(aiTopic.trim() || newsTitle.trim(), aiKeywords, aiTone)} disabled={isGeneratingAI} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold text-[11px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">{isGeneratingAI ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}<span>{isGeneratingAI ? 'Gemini Drafting Release...' : 'Write Professional Release'}</span></button></div></div>}</div>
          <div className="bg-gray-50/50 p-5 border-t border-gray-100 flex items-center justify-between"><div>{editingNews ? <button type="button" onClick={e => onDeleteNews(e, editingNews.id || '')} className="px-4 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"><Trash2 size={12} />Permanently Delete</button> : <span className="text-[11px] text-gray-400 font-bold tracking-wider">New Broadcast Composer</span>}</div><div className="flex gap-2"><button type="button" onClick={() => onSave('Draft')} disabled={isSavingNews} className="px-4 py-2 bg-gray-200/60 text-gray-700 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">Save Draft</button><button type="button" onClick={() => onSave('Published')} disabled={isSavingNews} className="px-5 py-2 bg-ug-navy text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50">{isSavingNews ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Publish Broadcast</button></div></div>
        </motion.div>}</AnimatePresence>
      </div>
    </motion.div>
  );
};
