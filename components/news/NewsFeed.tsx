import React from 'react';
import { Calendar, ChevronDown, ChevronRight, Clock, ExternalLink, Filter, Globe, LayoutGrid, List, Loader2, Microscope, Search, X } from 'lucide-react';
import { NewsItem } from '../../types';
import { Tr } from '../Tr';
import ImageWithFallback from '../ImageWithFallback';
import { safeExternalUrl } from '../../lib/urlSafety';

interface NewsFeedProps {
  filteredNews: NewsItem[];
  loading: boolean;
  hasMore: boolean;
  lastSync: Date | null;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  viewMode: 'grid' | 'list';
  setViewMode: React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
  searchNewsPlaceholder: string;
  filterAllLabel: string;
  filterAnnouncementLabel: string;
  filterGrantLabel: string;
  filterPartnershipLabel: string;
  filterReleaseLabel: string;
  filterEcosystemLabel: string;
  isAdmin: boolean;
  setCuratorMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleNewsClick: (item: NewsItem) => void;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  formatNewsDate: (date?: string) => string;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}

const NewsFeed: React.FC<NewsFeedProps> = ({
  filteredNews, loading, hasMore, lastSync, searchTerm, setSearchTerm, selectedCategory,
  setSelectedCategory, viewMode, setViewMode, searchNewsPlaceholder, filterAllLabel,
  filterAnnouncementLabel, filterGrantLabel, filterPartnershipLabel, filterReleaseLabel,
  filterEcosystemLabel, isAdmin, setCuratorMode, handleNewsClick, handleImageError,
  formatNewsDate, setPage,
}) => (
  <div className="min-h-screen bg-white py-3 sm:py-6">
    <div id="news-curator-workspace-anchor" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-100 pb-3 gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-1"><div className="p-2 bg-ug-navy rounded-xl text-white shadow-xs shrink-0"><Microscope size={18} /></div><div><h1 className="text-lg sm:text-xl md:text-2xl font-bold text-ug-navy tracking-tight"><Tr text="Discovery & Industry News" /></h1><p className="text-ug-teal font-extrabold text-[11px] sm:text-[11px] tracking-[0.2em]"><Tr text="University of Ghana • Virtual Industry Hub" /></p></div></div>
          <p className="text-gray-500 font-medium text-xs max-w-2xl leading-relaxed"><Tr text="Monitoring research outputs, commercial spin-offs, partnerships, and global innovation trends." /></p>
        </div>
        {isAdmin && <button type="button" onClick={() => setCuratorMode(true)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-ug-navy hover:bg-ug-teal px-3 py-2 rounded-lg border border-gray-100 transition self-start md:self-auto shrink-0 cursor-pointer">Curator Workspace</button>}
        {lastSync && <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 self-start md:self-auto shrink-0"><Clock size={11} className="text-ug-teal" /><span><Tr text="Synced:" /> {lastSync.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>}
      </div>

      <div className="bg-slate-50/80 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 mb-5"><div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between"><div className="flex items-center gap-2 flex-1 max-w-lg w-full"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} /><input type="text" placeholder={searchNewsPlaceholder} className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ug-teal/50 focus:border-ug-teal transition-all text-xs font-semibold text-slate-800 placeholder:text-gray-400 shadow-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />{searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5" title="Clear search"><X size={13} /></button>}</div></div><div className="flex items-center gap-2 justify-between sm:justify-end"><div className="relative flex-1 sm:flex-none min-w-[150px]"><Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ug-navy pointer-events-none" size={13} /><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="appearance-none w-full bg-white border border-gray-200 text-slate-800 py-2 pl-8 pr-7 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-ug-teal/50 focus:border-ug-teal cursor-pointer shadow-xs truncate"><option value="All">{filterAllLabel}</option><option value="Announcement">{filterAnnouncementLabel}</option><option value="Grant Opportunity">{filterGrantLabel}</option><option value="Strategic Partnership">{filterPartnershipLabel}</option><option value="Research Release">{filterReleaseLabel}</option><option value="Ecosystem Updates">{filterEcosystemLabel}</option></select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} /></div><div className="flex items-center bg-white p-0.5 rounded-xl border border-gray-200 shadow-xs shrink-0"><button type="button" onClick={() => setViewMode('grid')} className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${viewMode === 'grid' ? 'bg-ug-navy text-white shadow-xs' : 'text-gray-500 hover:text-slate-900'}`} title="Grid View"><LayoutGrid size={13} /><span className="hidden sm:inline">Grid</span></button><button type="button" onClick={() => setViewMode('list')} className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${viewMode === 'list' ? 'bg-ug-navy text-white shadow-xs' : 'text-gray-500 hover:text-slate-900'}`} title="List View"><List size={13} /><span className="hidden sm:inline">List</span></button></div></div></div></div>

      {loading && filteredNews.length === 0 && <div className="flex flex-col items-center justify-center py-12"><Loader2 className="animate-spin text-ug-teal mb-4" size={40} /><p className="text-gray-400 font-bold text-[11px] tracking-wide"><Tr text="Loading Intelligence..." /></p></div>}
      {filteredNews.length === 0 && !loading && <div className="text-center py-12 border-2 border-dashed border-gray-200/80 rounded-2xl bg-slate-50/50"><Globe className="text-gray-300 mx-auto mb-4" size={48} /><h3 className="text-lg font-bold text-ug-navy"><Tr text="No news items found" /></h3><p className="text-gray-500 font-medium mt-1 text-sm"><Tr text="Try clearing your search words or category filter." /></p><button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }} className="mt-4 px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-bold hover:bg-ug-navy/90 transition-colors cursor-pointer"><Tr text="Reset Filters" /></button></div>}

      <div className={`transition-opacity duration-300 ${loading && filteredNews.length > 0 ? 'opacity-50' : 'opacity-100'} ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6' : 'space-y-4'}`}>{filteredNews.map((item) => <article key={item.id} onClick={() => handleNewsClick(item)} className={`group bg-white rounded-2xl overflow-hidden border border-gray-200/90 hover:border-ug-teal/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row'}`}><div className={`overflow-hidden relative bg-gray-100 shrink-0 ${viewMode === 'grid' ? 'aspect-[16/10] w-full' : 'w-full sm:w-52 lg:w-60 h-44 sm:h-auto'}`}><ImageWithFallback src={item.image_url} alt="" onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /><div className="absolute top-2.5 left-2.5 flex items-center gap-1.5"><span className={`text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs ${item.is_ai_generated ? 'bg-ug-teal text-white' : 'bg-ug-navy text-white'}`}><Tr text={item.category} /></span></div></div><div className="p-4 sm:p-5 flex-1 flex flex-col justify-between"><div><div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 mb-2"><span className="flex items-center gap-1"><Calendar size={11} /><span>{formatNewsDate(item.published_at)}</span></span>{item.source_name && <><span>•</span><span className="flex items-center gap-1 text-ug-teal font-bold truncate max-w-[140px]"><Globe size={11} /><span className="truncate"><Tr text={item.source_name} /></span></span></>}</div><h2 className="text-sm sm:text-base font-bold text-ug-navy mb-2 leading-snug group-hover:text-ug-teal transition-colors line-clamp-2"><Tr text={item.title} /></h2><p className="text-slate-600 text-xs leading-relaxed line-clamp-2 font-normal mb-3"><Tr text={item.summary} /></p></div><div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs"><span className="text-ug-navy font-bold text-[11px] group-hover:text-ug-teal transition-colors flex items-center gap-1"><span><Tr text="Read Briefing" /></span><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>{item.external_url && safeExternalUrl(item.external_url) && <a href={safeExternalUrl(item.external_url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={safeExternalUrl(item.external_url)} className="text-[11px] text-gray-400 hover:text-ug-teal flex items-center gap-1"><ExternalLink size={10} /><span><Tr text="Source" /></span></a>}</div></div></article>)}</div>
      {hasMore && <div className="mt-12 flex justify-center"><button onClick={() => setPage(prev => prev + 1)} disabled={loading} className="px-6 py-3 bg-white border border-ug-navy hover:bg-ug-navy hover:text-white text-ug-navy rounded-xl font-bold text-xs uppercase tracking-wider transition duration-200 shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{loading ? <><Loader2 className="animate-spin text-ug-teal" size={14} /><span>Loading Discoveries...</span></> : <><span>Load More News</span><ChevronRight size={14} /></>}</button></div>}
    </div>
  </div>
);

export default NewsFeed;
