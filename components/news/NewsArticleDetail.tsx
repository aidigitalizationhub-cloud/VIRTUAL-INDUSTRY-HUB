import React from 'react';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Globe,
  Link2,
  Tag,
  Zap,
} from 'lucide-react';
import { NewsItem } from '../../types';
import { Tr } from '../Tr';
import ImageWithFallback from '../ImageWithFallback';
import { safeExternalUrl } from '../../lib/urlSafety';

interface NewsArticleDetailProps {
  article: NewsItem;
  formatNewsDate: (date?: string) => string;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onBack: () => void;
}

const NewsArticleDetail: React.FC<NewsArticleDetailProps> = ({
  article,
  formatNewsDate,
  handleImageError,
  onBack,
}) => (
  <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-ug-navy font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200 shadow-xs transition-all duration-200 cursor-pointer mb-6 group"
      >
        <ArrowLeft size={14} className="transform group-hover:-translate-x-1 transition-transform" />
        <span><Tr text="Back to News" /></span>
      </button>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden p-5 sm:p-8 mb-8 w-full">
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className={`flex items-center gap-1.5 text-[11px] font-bold tracking-wider px-3 py-1 rounded-full ${article.is_ai_generated ? 'bg-ug-teal text-white' : 'bg-ug-navy text-white'}`}>
            {article.is_ai_generated ? <Zap size={11} className="fill-white" /> : <Tag size={11} />}
            <Tr text={article.category} />
          </span>
          <span className="text-gray-300 text-xs">•</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <Calendar size={12} /> {formatNewsDate(article.published_at)}
          </span>
          {article.source_name && (
            <>
              <span className="text-gray-300 text-xs">•</span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-ug-teal bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                <Globe size={12} /> <Tr text={article.source_name} />
              </span>
            </>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ug-navy mb-6 leading-tight tracking-tight text-left">
          <Tr text={article.title} />
        </h1>

        {article.image_url && (
          <div className="w-full aspect-[21/9] max-h-[380px] min-h-[180px] rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative mb-6 shadow-xs">
            <ImageWithFallback src={article.image_url} alt="" onError={handleImageError} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="text-slate-700 font-normal text-sm sm:text-base leading-relaxed space-y-4 mb-6 whitespace-pre-line border-b border-gray-100 pb-6 text-left">
          <Tr text={article.summary} />
        </div>

        <div className="space-y-4 text-left">
          <h3 className="text-xs font-bold uppercase text-ug-navy tracking-wider flex items-center gap-2">
            <Globe size={14} className="text-ug-teal" /> <Tr text="Verified Institutional Source" />
          </h3>
          <div className="flex flex-col gap-2.5">
            {article.external_url && (
              <a href={safeExternalUrl(article.external_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between p-3.5 bg-ug-teal/5 hover:bg-ug-teal hover:text-white border border-ug-teal/20 hover:border-ug-teal rounded-xl text-xs font-bold text-ug-teal transition duration-200 group w-full">
                <span className="flex items-center gap-2"><Globe size={14} /><span>Official Source / External Citation Link</span></span>
                <ExternalLink size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
              </a>
            )}
            {article.reference_links && Array.isArray(article.reference_links) && article.reference_links.filter(Boolean).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                {article.reference_links.filter(Boolean).slice(0, 6).map((link, idx) => (
                  <a key={idx} href={safeExternalUrl(link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-xl text-xs font-medium text-slate-700 transition group">
                    <span className="flex items-center gap-2 truncate"><Link2 size={13} className="text-gray-400 group-hover:text-ug-teal shrink-0" /><span className="truncate">{link}</span></span>
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

export default NewsArticleDetail;
