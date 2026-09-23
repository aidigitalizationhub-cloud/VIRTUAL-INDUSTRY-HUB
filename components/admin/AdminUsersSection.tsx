import React from 'react';
import { motion } from 'motion/react';
import {
  Building2, Copy, Download, Eye, GraduationCap, Mail, Microscope, Search, ShieldCheck,
  Sparkles, TrendingUp, Users, X
} from 'lucide-react';
import { User, Project, UserRole } from '../../types';

type AssignableRole = UserRole | 'TTO/IP';

interface AdminUsersSectionProps {
  profiles: User[];
  projects: Project[];
  searchQuery: string;
  roleFilter: string;
  filteredProfiles: User[];
  assignableRoles: readonly AssignableRole[];
  inspectingUser: User | null;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onCopyEmails: () => void;
  onExportUserCsv: () => void;
  onInspectUser: (profile: User) => void;
  onCloseInspection: () => void;
  onRoleChange: (userId: string, newRole: UserRole | 'TTO/IP') => void;
  onInspectionRoleChange: (userId: string, newRole: UserRole | 'TTO/IP') => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  profiles,
  projects,
  searchQuery,
  roleFilter,
  filteredProfiles,
  assignableRoles,
  inspectingUser,
  onSearchChange,
  onRoleFilterChange,
  onCopyEmails,
  onExportUserCsv,
  onInspectUser,
  onCloseInspection,
  onRoleChange,
  onInspectionRoleChange,
}) => (
  <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-left">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {[
        { label: 'Total Users', icon: <Users size={16} className="text-ug-navy" />, count: profiles.length, badge: '100%', badgeClass: 'text-ug-teal bg-ug-teal/10' },
        { label: 'Researchers', icon: <Microscope size={16} className="text-ug-teal" />, count: profiles.filter(p => p.role === UserRole.Researcher).length, badge: `${profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Researcher).length / profiles.length) * 100) : 0}%`, badgeClass: 'text-gray-500 bg-gray-100' },
        { label: 'Students', icon: <GraduationCap size={16} className="text-blue-500" />, count: profiles.filter(p => p.role === UserRole.Student).length, badge: `${profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Student).length / profiles.length) * 100) : 0}%`, badgeClass: 'text-blue-600 bg-blue-50' },
        { label: 'Industry', icon: <Building2 size={16} className="text-amber-500" />, count: profiles.filter(p => p.role === UserRole.IndustryPartner).length, badge: `${profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.IndustryPartner).length / profiles.length) * 100) : 0}%`, badgeClass: 'text-amber-600 bg-amber-50' },
        { label: 'Investors', icon: <TrendingUp size={16} className="text-emerald-500" />, count: profiles.filter(p => p.role === UserRole.Investor).length, badge: `${profiles.length ? Math.round((profiles.filter(p => p.role === UserRole.Investor).length / profiles.length) * 100) : 0}%`, badgeClass: 'text-emerald-600 bg-emerald-50' },
        { label: 'Admins', icon: <ShieldCheck size={16} className="text-purple-600" />, count: profiles.filter(p => p.role === UserRole.Admin).length, badge: 'Governance', badgeClass: 'text-purple-600 bg-purple-50' },
      ].map(item => (
        <div key={item.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2"><span className="text-[11px] font-semibold tracking-wider">{item.label}</span>{item.icon}</div>
          <div className="flex items-baseline justify-between"><span className="text-xl sm:text-2xl font-bold text-ug-navy">{item.count}</span><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeClass}`}>{item.badge}</span></div>
        </div>
      ))}
    </div>

    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div><h3 className="text-lg font-bold text-ug-navy tracking-tight">Users Directorate Ledger</h3><p className="text-xs text-gray-400 font-medium mt-0.5">Manage user access privileges, inspect AI summaries, and audit ecosystem registrants.</p></div>
        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button onClick={onCopyEmails} className="flex-1 lg:flex-initial px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-ug-navy rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition border border-gray-200 cursor-pointer" title="Copy email addresses of filtered users"><Copy size={14} className="text-ug-teal" />Copy Emails</button>
          <button onClick={onExportUserCsv} className="flex-1 lg:flex-initial px-3.5 py-2 bg-ug-navy hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md shadow-ug-navy/20 cursor-pointer" title="Export filtered directory to CSV file"><Download size={14} className="text-ug-teal" />Export CSV</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="Search by name, email, or company..." className="w-full bg-gray-50 border border-gray-200 focus:border-ug-teal focus:bg-white rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-ug-navy outline-none transition" />{searchQuery && <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><X size={12} /></button>}</div>
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { role: 'all', label: 'ALL' }, { role: UserRole.Researcher, label: 'RESEARCHERS' }, { role: UserRole.Student, label: 'STUDENTS' }, { role: UserRole.Investor, label: 'INVESTORS' }, { role: UserRole.IndustryPartner, label: 'INDUSTRY' }, { role: UserRole.Admin, label: 'ADMINS' },
          ].map(item => <button key={item.role} onClick={() => onRoleFilterChange(item.role)} className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${roleFilter === item.role ? 'bg-ug-navy text-white border-ug-navy shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-ug-navy hover:bg-gray-100'}`}><span>{item.label}</span><span className={`px-1.5 py-0.2 rounded-full text-[11px] ${roleFilter === item.role ? 'bg-ug-teal text-ug-navy font-bold' : 'bg-gray-200 text-gray-600'}`}>{item.role === 'all' ? profiles.length : profiles.filter(p => p.role === item.role).length}</span></button>)}
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hidden md:block"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold tracking-wide text-gray-400"><th className="p-5">Registrant Details</th><th className="p-5">Dynamic Role Status</th><th className="p-5">AI Integration</th><th className="p-5">Linked Projects</th><th className="p-5 text-right">Governance Override</th></tr></thead><tbody className="divide-y divide-gray-100">
       {filteredProfiles.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400 tracking-wide">No registered user profiles match current filter query.</td></tr> : filteredProfiles.map(p => {
        const count = projects.filter(proj => proj.owner_id === p.id).length;
        return <tr key={p.id} className="hover:bg-gray-50/70 transition group"><td className="p-5"><div className="flex items-center gap-3.5"><div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ug-navy to-slate-800 text-white flex items-center justify-center font-bold text-sm border border-gray-100 overflow-hidden shrink-0 shadow-sm">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" aria-hidden="true" /> : (p.name?.[0] || p.email?.[0] || 'U').toUpperCase()}</div><div><h4 className="font-extrabold text-ug-navy text-sm leading-tight">{p.name || 'Anonymous User'}</h4><span className="type-caption mt-0.5 block">{p.email}</span>{(p.company || p.department) && <span className="text-[11px] text-ug-teal font-extrabold block mt-0.5">{p.company || p.department}</span>}</div></div></td><td className="p-5"><span className={`text-[11px] font-semibold tracking-wider px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 ${p.role === UserRole.Admin ? 'text-purple-700 bg-purple-50 border-purple-200' : p.role === UserRole.Researcher ? 'text-ug-teal bg-ug-teal/10 border-ug-teal/20' : p.role === UserRole.Student ? 'text-blue-600 bg-blue-50 border-blue-200' : p.role === UserRole.Investor ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>{p.role}</span></td><td className="p-5">{p.ai_profile ? <div className="flex items-center gap-1.5 text-ug-teal font-semibold text-[11px] tracking-wide bg-ug-teal/10 border border-ug-teal/20 py-1 px-2.5 rounded-xl w-fit"><Sparkles size={11} />AI Compiled</div> : <span className="text-[11px] font-bold text-gray-300 tracking-wide">Unconfigured</span>}</td><td className="p-5"><span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${count > 0 ? 'bg-ug-navy/5 text-ug-navy border-ug-navy/10' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{count} {count === 1 ? 'Project' : 'Projects'}</span></td><td className="p-5 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => onInspectUser(p)} className="px-3 py-1.5 bg-gray-50 hover:bg-ug-navy hover:text-white text-ug-navy rounded-xl text-[11px] font-semibold tracking-wider transition border border-gray-200 flex items-center gap-1 cursor-pointer"><Eye size={12} />Inspect</button><select value={p.role} onChange={e => onRoleChange(p.id, e.target.value as UserRole | 'TTO/IP')} className="bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-ug-navy transition outline-none cursor-pointer">{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select>{p.email && <a href={`mailto:${p.email}`} className="p-1.5 text-gray-400 hover:text-ug-teal hover:bg-gray-100 rounded-lg transition" title="Send Email"><Mail size={14} /></a>}</div></td></tr>;
      })}
    </tbody></table></div></div>

    <div className="grid grid-cols-1 gap-3.5 md:hidden">{filteredProfiles.length === 0 ? <div className="bg-white p-8 rounded-2xl text-center text-xs font-bold text-gray-400 tracking-wide border border-gray-100">No registered user profiles match current filter.</div> : filteredProfiles.map(p => { const count = projects.filter(proj => proj.owner_id === p.id).length; return <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-ug-navy text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" aria-hidden="true" /> : (p.name?.[0] || p.email?.[0] || 'U').toUpperCase()}</div><div className="min-w-0"><h4 className="font-extrabold text-ug-navy text-sm truncate">{p.name || 'Anonymous User'}</h4><p className="type-caption truncate">{p.email}</p></div></div><span className="text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded-lg border shrink-0 text-ug-navy bg-gray-50 border-gray-200">{p.role}</span></div><div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs"><div className="flex items-center gap-2">{p.ai_profile && <span className="text-[11px] font-semibold tracking-wide text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-md">AI Ready</span>}<span className="text-[11px] font-bold text-gray-500">{count} {count === 1 ? 'Project' : 'Projects'}</span></div><div className="flex items-center gap-2"><button onClick={() => onInspectUser(p)} className="px-3 py-1 bg-ug-navy text-white text-[11px] font-semibold rounded-lg cursor-pointer">Inspect</button><select value={p.role} onChange={e => onRoleChange(p.id, e.target.value as UserRole | 'TTO/IP')} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-ug-navy cursor-pointer">{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></div></div></div>; })}</div>

    {inspectingUser && <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-2xl overflow-hidden animate-fade-in my-auto flex flex-col max-h-[90vh]"><div className="p-6 bg-gradient-to-r from-ug-navy via-slate-900 to-ug-navy text-white flex items-start justify-between shrink-0"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-ug-teal overflow-hidden shrink-0">{inspectingUser.avatar_url ? <img src={inspectingUser.avatar_url} className="w-full h-full object-cover" alt="" aria-hidden="true" /> : (inspectingUser.name?.[0] || inspectingUser.email?.[0] || 'U').toUpperCase()}</div><div><h3 className="text-xl font-bold text-white">{inspectingUser.name || 'Anonymous User'}</h3><p className="type-caption text-ug-teal mt-0.5">{inspectingUser.email}</p><span className="text-[11px] font-semibold tracking-wide text-white/50 block mt-1">User ID: {inspectingUser.id}</span></div></div><button onClick={onCloseInspection} className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-lg font-bold transition cursor-pointer">&times;</button></div><div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-left"><div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-4"><div><label className="text-[11px] font-semibold tracking-wider text-gray-400 block">System Access Level</label><span className="text-xs font-bold text-ug-navy">{inspectingUser.role}</span></div><div className="flex items-center gap-2"><span className="text-[11px] font-bold text-gray-500">Change Role:</span><select value={inspectingUser.role} onChange={e => onInspectionRoleChange(inspectingUser.id, e.target.value as UserRole | 'TTO/IP')} className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-ug-navy outline-none cursor-pointer">{assignableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-1"><span className="text-[11px] font-semibold tracking-wider text-gray-400">Department / Organization</span><p className="text-xs font-bold text-ug-navy">{inspectingUser.department || inspectingUser.company || 'Not Specified'}</p></div><div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-1"><span className="text-[11px] font-semibold tracking-wider text-gray-400">Ecosystem AI Integration</span><p className="text-xs font-bold text-ug-navy">{inspectingUser.ai_profile ? <span className="text-ug-teal font-extrabold flex items-center gap-1"><Sparkles size={12} />AI Profile Compiled</span> : <span className="text-gray-400">Standard Registration</span>}</p></div></div>{inspectingUser.ai_profile && <div className="p-4 bg-ug-teal/5 border border-ug-teal/20 rounded-2xl space-y-2"><h4 className="text-xs font-bold text-ug-navy flex items-center gap-1.5"><Sparkles size={14} className="text-ug-teal" />AI Profile Dossier</h4><p className="text-xs text-gray-700 leading-relaxed font-medium">{typeof inspectingUser.ai_profile === 'string' ? inspectingUser.ai_profile : JSON.stringify(inspectingUser.ai_profile, null, 2)}</p></div>}<div className="space-y-3"><h4 className="text-xs font-bold text-ug-navy flex items-center justify-between"><span>Linked Research Projects</span><span className="text-[11px] font-bold text-ug-teal bg-ug-teal/10 px-2 py-0.5 rounded-full">{projects.filter(proj => proj.owner_id === inspectingUser.id).length} Projects</span></h4>{projects.filter(proj => proj.owner_id === inspectingUser.id).length === 0 ? <div className="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl">No projects currently submitted under this user account.</div> : <div className="space-y-2">{projects.filter(proj => proj.owner_id === inspectingUser.id).map(proj => <div key={proj.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"><div><h5 className="text-xs font-bold text-ug-navy">{proj.title}</h5><span className="text-[11px] text-gray-400 font-semibold">{proj.department} • {proj.research_area}</span></div><span className="text-[11px] font-semibold text-ug-teal bg-ug-teal/10 px-2 py-1 rounded-lg">{proj.status}</span></div>)}</div>}</div></div><div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0"><div>{inspectingUser.email && <a href={`mailto:${inspectingUser.email}`} className="px-4 py-2 bg-ug-teal text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition flex items-center gap-1.5"><Mail size={14} />Send Direct Email</a>}</div><button type="button" onClick={onCloseInspection} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer">Close</button></div></div></div>}
  </motion.div>
);
