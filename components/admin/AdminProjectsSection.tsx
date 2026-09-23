import React from 'react';
import { motion } from 'motion/react';
import { Layers, Search, Trash2, X } from 'lucide-react';
import { Project, ProjectStatus, ResearchArea, Visibility } from '../../types';

interface AdminProjectsSectionProps {
  projects: Project[];
  screenerProjects: Project[];
  projectSearch: string;
  projectAreaFilter: string;
  projectVisibilityFilter: string;
  projectStatusFilter: string;
  projectSort: string;
  researchAreas: ResearchArea[];
  visibilityOptions: Visibility[];
  statusOptions: ProjectStatus[];
  onProjectSearchChange: (value: string) => void;
  onProjectAreaFilterChange: (value: string) => void;
  onProjectVisibilityFilterChange: (value: string) => void;
  onProjectStatusFilterChange: (value: string) => void;
  onProjectSortChange: (value: string) => void;
  onClearProjectFilters: () => void;
  onProjectStatusChange: (projectId: string, field: 'status' | 'visibility', value: ProjectStatus | Visibility) => void;
  onDeleteProject: (projectId: string) => void;
}

export const AdminProjectsSection: React.FC<AdminProjectsSectionProps> = ({
  projects,
  screenerProjects,
  projectSearch,
  projectAreaFilter,
  projectVisibilityFilter,
  projectStatusFilter,
  projectSort,
  researchAreas,
  visibilityOptions,
  statusOptions,
  onProjectSearchChange,
  onProjectAreaFilterChange,
  onProjectVisibilityFilterChange,
  onProjectStatusFilterChange,
  onProjectSortChange,
  onClearProjectFilters,
  onProjectStatusChange,
  onDeleteProject
}) => (
  <motion.div
    key="projects"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-4 text-left"
  >
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
          <span className="type-label text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            Showing {screenerProjects.length} of {projects.length} Innovations
          </span>
          {(projectSearch || projectAreaFilter !== 'all' || projectVisibilityFilter !== 'all' || projectStatusFilter !== 'all' || projectSort !== 'newest') && (
            <button onClick={onClearProjectFilters} className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer">
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={projectSearch}
            onChange={(e) => onProjectSearchChange(e.target.value)}
            placeholder="Search title, department, or area..."
            className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 pl-9 pr-8 text-xs font-semibold text-ug-navy outline-none transition"
          />
          {projectSearch && (
            <button onClick={() => onProjectSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
        <div>
          <select value={projectAreaFilter} onChange={(e) => onProjectAreaFilterChange(e.target.value)} className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition">
            <option value="all">All Research Areas</option>
            {researchAreas.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
        </div>
        <div>
          <select value={projectVisibilityFilter} onChange={(e) => onProjectVisibilityFilterChange(e.target.value)} className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition">
            <option value="all">All Visibility</option>
            {visibilityOptions.map(vis => <option key={vis} value={vis}>{vis}</option>)}
          </select>
        </div>
        <div>
          <select value={projectStatusFilter} onChange={(e) => onProjectStatusFilterChange(e.target.value)} className="w-full bg-gray-50/70 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer transition">
            <option value="all">All Readiness Statuses</option>
            {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500 pt-1 border-t border-gray-50">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="font-bold text-gray-400 text-[11px] tracking-wider">Active Filters:</span>
          {projectSearch && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ug-teal/10 text-ug-teal font-extrabold text-[11px]">"{projectSearch}" <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => onProjectSearchChange('')} /></span>}
          {projectAreaFilter !== 'all' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[11px]">{projectAreaFilter} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => onProjectAreaFilterChange('all')} /></span>}
          {projectVisibilityFilter !== 'all' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px]">{projectVisibilityFilter} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => onProjectVisibilityFilterChange('all')} /></span>}
          {projectStatusFilter !== 'all' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">{projectStatusFilter} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => onProjectStatusFilterChange('all')} /></span>}
          {!projectSearch && projectAreaFilter === 'all' && projectVisibilityFilter === 'all' && projectStatusFilter === 'all' && <span className="text-gray-400 italic text-[11px]">None (Showing all records)</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <span className="font-bold text-gray-400 text-[11px] tracking-wider">Sort:</span>
          <select value={projectSort} onChange={(e) => onProjectSortChange(e.target.value)} className="bg-transparent text-xs font-bold text-ug-navy outline-none cursor-pointer">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      {screenerProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Layers className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-xs font-bold tracking-wide text-gray-400">No research projects matched your filter criteria.</p>
          <button onClick={onClearProjectFilters} className="mt-3 text-xs font-bold text-ug-teal hover:underline inline-block cursor-pointer">Reset All Filters</button>
        </div>
      ) : (
        screenerProjects.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 hover:border-ug-teal/40 hover:shadow-md transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50 shadow-2xs">
                {p.image_url && p.image_url.trim() !== '' ? <img src={p.image_url.split('|')[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Layers size={22} /></div>}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="px-2 py-0.5 rounded-md bg-ug-teal/10 text-ug-teal font-extrabold text-[11px] tracking-wider">{p.research_area || 'General Research'}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[11px] font-bold text-gray-500 truncate max-w-[150px]">{p.department || 'Unspecified Dept'}</span>
                  {p.budget && <><span className="text-gray-300">•</span><span className="type-label text-gray-400">{p.budget}</span></>}
                </div>
                <h3 className="text-sm font-extrabold text-ug-navy tracking-tight truncate hover:text-ug-teal transition cursor-pointer" title={p.title}>{p.title}</h3>
                <p className="text-xs text-gray-500 font-medium line-clamp-1 leading-snug">{p.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 justify-end">
              <div className="flex flex-col gap-0.5"><span className="type-label text-gray-400">Visibility</span><select value={p.visibility || Visibility.Public} onChange={(e) => onProjectStatusChange(p.id, 'visibility', e.target.value as Visibility)} className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-ug-teal rounded-lg px-2.5 py-1 text-[11px] font-semibold text-ug-navy transition outline-none cursor-pointer">{visibilityOptions.map(vis => <option key={vis} value={vis}>{vis}</option>)}</select></div>
              <div className="flex flex-col gap-0.5"><span className="type-label text-gray-400">Readiness Status</span><select value={p.status || ProjectStatus.Concept} onChange={(e) => onProjectStatusChange(p.id, 'status', e.target.value as ProjectStatus)} className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-ug-teal rounded-lg px-2.5 py-1 text-[11px] font-semibold text-ug-navy transition outline-none cursor-pointer">{statusOptions.map(st => <option key={st} value={st}>{st}</option>)}</select></div>
              <div className="flex flex-col gap-0.5"><span className="type-label text-transparent">Action</span><button onClick={() => onDeleteProject(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 transition shrink-0 cursor-pointer" title="Withdraw Project"><Trash2 size={14} /></button></div>
            </div>
          </div>
        ))
      )}
    </div>
  </motion.div>
);
