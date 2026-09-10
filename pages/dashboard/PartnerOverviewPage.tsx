import React, { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { CreateChallengeModal } from '../../components/CreateChallengeModal';
import { PartnerChallengesTracker } from '../../components/PartnerChallengesTracker';
import { SectionTitle, StatCard } from '../../components/dashboard/DashboardPrimitives';
import { BookmarkedProjectsList, HubStreamSidebar, UnifiedDashboardProfile } from '../../components/dashboard/DashboardWidgets';
import type { DashboardTab } from '../../lib/dashboardRouting';

export const PartnerOverviewPage: React.FC<{ user: User | null; setActiveTab?: (tab: DashboardTab) => void }> = ({ user, setActiveTab }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { StorageService.getProjects().then(setProjects); }, []);

  return (
    <div className="space-y-6">
      <UnifiedDashboardProfile user={user} onAction={() => setIsCreateModalOpen(true)} actionLabel="Post New Challenge" />
      <div className="grid grid-cols-2 gap-2 md:gap-4"><StatCard label="Market ready assets" value={projects.filter((project) => project.status === ProjectStatus.MarketReady).length} icon={ShoppingBag} /><StatCard label="Total inquiries" value={projects.reduce((sum, project) => sum + (project.expressions_of_interest || 0), 0)} icon={Bookmark} /></div>
      <PartnerChallengesTracker user={user} onPostNewChallenge={() => setIsCreateModalOpen(true)} setActiveTab={setActiveTab} refreshKey={refreshKey} />
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="space-y-6 md:col-span-2 lg:col-span-8"><section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7"><SectionTitle title="Venture portfolio" subtitle="Curated technical assets from University of Ghana" /><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{projects.slice(0, 4).map((project) => <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="group border border-slate-200/80 bg-slate-50/60 p-5 text-left transition hover:border-ug-teal/30 hover:bg-white hover:shadow-md"><h4 className="mb-2 text-base font-semibold text-ug-navy transition group-hover:text-ug-teal">{project.title}</h4><span className="flex items-center justify-between border-t border-slate-200/80 pt-3"><span className="text-xs font-medium text-slate-500">{project.status}</span><ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-ug-teal" /></span></button>)}</div></section></div>
        <div className="space-y-6 border-t border-slate-200/80 pt-6 md:col-span-2 lg:col-span-4 lg:border-t-0 lg:pt-0">{user?.id && <BookmarkedProjectsList userId={user.id} />}<HubStreamSidebar /></div>
      </div>
      <CreateChallengeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} user={user} onChallengePosted={() => setRefreshKey((current) => current + 1)} />
    </div>
  );
};
