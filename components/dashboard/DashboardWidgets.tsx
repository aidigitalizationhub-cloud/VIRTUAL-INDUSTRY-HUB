import React, { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, Plus, ShieldCheck, User as UserIcon, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { SectionTitle } from './DashboardPrimitives';

const fallbackProjectImage = 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80';
const projectImage = (project: Project) => project.image_url?.trim()
  ? project.image_url.split('|')[0]
  : fallbackProjectImage;

export const HubStreamSidebar: React.FC = () => {
  const [trending, setTrending] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    StorageService.getTrendingProjects().then(setTrending).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-10 bg-slate-100" /><div className="h-40 bg-slate-50" /><div className="h-40 bg-slate-50" /></div>;
  return (
    <aside className="sticky top-6 z-10 border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><h3 className="text-base font-semibold text-ug-navy">Hub Stream</h3><p className="mt-1 text-xs text-slate-500">Trending innovations</p></div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ug-navy text-white"><Zap size={16} className="text-ug-teal" /></div>
      </div>
      <div className="space-y-6">
        {trending.map((project) => (
          <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="group w-full border-b border-slate-100 pb-4 text-left transition last:border-0 last:pb-0 hover:border-ug-teal/30">
            <div className="flex gap-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white shadow-sm"><img src={projectImage(project)} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackProjectImage; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" alt="" /></div>
              <div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="truncate text-xs font-medium text-ug-teal">{project.research_area}</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span className="text-xs font-medium text-emerald-600">{project.status}</span></div><h4 className="line-clamp-2 text-sm font-semibold leading-tight text-ug-navy transition group-hover:text-ug-teal">{project.title}</h4></div>
            </div>
            <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs text-slate-400"><Users size={11} /> Active engagement</span><ArrowRight size={14} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-ug-teal" /></div>
          </button>
        ))}
      </div>
    </aside>
  );
};

export const UnifiedDashboardProfile: React.FC<{ user: User | null; onAction: () => void; actionLabel: string }> = ({ user, onAction, actionLabel }) => (
  <div className="relative flex flex-col items-center gap-5 overflow-hidden border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:flex-row md:gap-6">
    <div className="absolute right-0 top-0 h-28 w-28 translate-x-1/3 -translate-y-1/3 rounded-full bg-teal-50" />
    <div className="relative shrink-0"><div className="h-16 w-16 overflow-hidden rounded-xl border-2 border-white bg-ug-navy shadow-md md:h-20 md:w-20">{user?.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" alt="" /> : <UserIcon className="h-full w-full p-4 text-white/20" />}</div><div className="absolute -bottom-1 -right-1 rounded-full border border-white bg-ug-teal p-1 text-white shadow-md"><ShieldCheck size={12} /></div></div>
    <div className="relative min-w-0 flex-1 text-center md:text-left"><p className="mb-1 text-xs font-medium text-ug-teal">Workspace overview</p><h2 className="truncate text-xl font-semibold tracking-tight text-ug-navy md:text-2xl">{user?.name}</h2><p className="mt-1 truncate text-sm text-slate-500">{user?.role} · {user?.department || 'University of Ghana'}</p><div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 md:mx-0"><Plus size={11} className="text-ug-teal" /> Identity verified</div></div>
    <button onClick={onAction} className="relative flex w-full items-center justify-center gap-2 bg-ug-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-ug-teal active:scale-[.98] md:w-auto"><Plus size={15} /> {actionLabel}</button>
  </div>
);

export const ActiveProjectHero: React.FC<{ project: Project }> = ({ project }) => {
  const statuses = Object.values(ProjectStatus);
  const progress = statuses.indexOf(project.status) / (statuses.length - 1) * 100;
  return (
    <div className="group overflow-hidden border border-slate-200/80 bg-white shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] animate-fade-in">
      <div className="relative h-40 overflow-hidden md:h-48"><img src={projectImage(project)} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackProjectImage; }} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-ug-navy via-ug-navy/50 to-transparent" /><div className="absolute bottom-4 left-4 flex max-w-[90%] flex-col gap-1.5 md:left-5"><span className="w-fit bg-ug-teal px-2.5 py-1 text-[11px] font-semibold text-white">Active project</span><h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white md:text-2xl">{project.title}</h3></div></div>
      <div className="p-5 space-y-4"><div><div className="flex justify-between items-center mb-3"><span className="text-[11px] font-bold text-gray-400 tracking-wider">Status</span><span className="text-xs font-bold text-ug-teal tracking-wider">{project.status}</span></div><div className="relative pt-1"><div className="h-1 w-full bg-gray-100 rounded-full flex justify-between px-0.5 items-center">{statuses.map((status) => <span key={status} className={`h-2 w-0.5 rounded-full ${status === project.status ? 'bg-ug-teal' : 'bg-gray-300'}`} />)}</div><div className="absolute top-1 left-0 h-1 bg-ug-teal rounded-full" style={{ width: `${progress}%` }} /><div className="absolute top-[2px] -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-ug-teal rounded-full shadow-md" style={{ left: `calc(${progress}% - 7px)` }} /><div className="flex justify-between mt-2 overflow-hidden">{statuses.map((status) => <span key={status} className={`text-[11px] font-semibold ${status === project.status ? 'text-ug-teal' : 'text-gray-300'} max-w-[40px] truncate`}>{status}</span>)}</div></div></div><div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100"><div><span className="text-[11px] font-bold text-gray-400 tracking-wider mb-2 block">Hub Views</span><p className="text-lg font-bold text-ug-navy">{project.views ?? 0}</p></div><div><span className="text-[11px] font-bold text-gray-400 tracking-wider mb-2 block">Interests Received</span><p className="text-lg font-bold text-ug-navy">{project.expressions_of_interest ?? 0}</p></div></div></div>
    </div>
  );
};

export const BookmarkedProjectsList: React.FC<{ userId: string }> = ({ userId }) => {
  const [bookmarks, setBookmarks] = useState<Project[]>([]);
  const navigate = useNavigate();
  useEffect(() => { StorageService.getBookmarks(userId).then(setBookmarks); }, [userId]);
  if (!bookmarks.length) return null;
  return (
    <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6"><SectionTitle title="Watchlist" subtitle="Saved research notifications" /><div className="mt-4 space-y-3">{bookmarks.map((project) => <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="group flex w-full items-center gap-3 border-b border-slate-100 pb-3 text-left transition last:border-0 last:pb-0"><span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white shadow-sm"><img src={projectImage(project)} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackProjectImage; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" alt="" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ug-navy group-hover:text-ug-teal">{project.title}</span><span className="block truncate text-xs text-slate-500">{project.research_area}</span></span><Bookmark size={16} className="shrink-0 fill-ug-teal text-ug-teal" /></button>)}</div></section>
  );
};
