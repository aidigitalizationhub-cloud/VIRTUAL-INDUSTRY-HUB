import React from 'react';
import { Award, Cpu, GraduationCap, Link as LinkIcon, Rocket, Sparkles, Target, Upload } from 'lucide-react';
import type { AIProfile } from '../../types';

export const ProfileInsight: React.FC<{ profile: AIProfile | null; onRefresh?: () => void }> = ({ profile, onRefresh }) => {
  if (!profile) return (
    <div className="bg-ug-navy/5 border border-dashed border-ug-navy/20 p-6 sm:p-8 rounded-2xl text-center">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100"><Sparkles size={32} className="text-ug-teal/50" /></div>
      <h3 className="text-sm font-bold text-ug-navy tracking-wide mb-2">Profile Insights Pending</h3>
      <p className="text-[11px] text-gray-500 font-medium italic max-w-xs mx-auto">Upload your academic documents or resume in the overview to unlock AI-powered semantic matching and profile insights.</p>
    </div>
  );

  const skills = [...(profile.skills?.technical_skills || []), ...(profile.skills?.tools_and_technologies || [])];
  return (
    <div className="space-y-8 animate-fade-in group/insight">
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
        <Target size={180} className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity" />
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div><h4 className="text-[11px] font-semibold text-ug-teal tracking-[0.2em] mb-1 flex items-center gap-2"><Sparkles size={12} /> Researcher Intelligence</h4><h3 className="text-xl font-bold text-ug-navy tracking-tight">AI Narrative Summary</h3></div>
          {onRefresh && <button onClick={onRefresh} className="p-3 bg-gray-50 text-gray-400 hover:text-ug-teal hover:bg-ug-teal/10 rounded-2xl transition opacity-0 group-hover:opacity-100" title="Re-process Profile"><Upload size={16} /></button>}
        </div>
        <p className="text-sm md:text-base font-medium text-gray-600 leading-relaxed italic relative z-10 text-justify">&quot;{profile.semantic_summary}&quot;</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-gray-50 relative z-10">
          <div className="space-y-1"><span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Experience Level</span><span className="text-[11px] font-semibold text-ug-navy bg-ug-navy/5 px-3 py-1 rounded-full inline-block">{profile.professional_profile?.experience_level || 'General'}</span></div>
          <div className="space-y-1"><span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Collab Mode</span><span className="text-[11px] font-semibold text-ug-navy bg-ug-navy/5 px-3 py-1 rounded-full inline-block">{profile.collaboration_profile?.preferred_collaboration_types?.[0] || 'Flexible'}</span></div>
          <div className="space-y-1"><span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Projects</span><span className="text-[11px] font-semibold text-ug-navy">{profile.projects?.length || 0} Initiatives</span></div>
          <div className="space-y-1"><span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Education</span><span className="text-[11px] font-semibold text-ug-navy">{profile.education?.length || 0} Credentials</span></div>
        </div>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-ug-navy text-white rounded-xl flex items-center justify-center shadow-lg"><Cpu size={20} /></div><div><h4 className="text-sm font-bold text-ug-navy tracking-tight">Technological Stack</h4><p className="text-[11px] font-bold text-gray-400 tracking-wide">Validated Skillsets</p></div></div>
          <div className="flex flex-wrap gap-2">{skills.map((skill, index) => <span key={`${skill}-${index}`} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-600 hover:border-ug-teal/30 hover:bg-white hover:text-ug-teal">{skill}</span>)}</div>
        </section>
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-ug-teal text-white rounded-xl flex items-center justify-center shadow-lg"><Award size={20} /></div><div><h4 className="text-sm font-bold text-ug-navy tracking-tight">Verified Education</h4><p className="text-[11px] font-bold text-gray-400 tracking-wide">Academic Credentials</p></div></div>
          <div className="space-y-6">{(profile.education || []).map((education, index) => <div key={index} className="flex gap-5 items-start group"><div className="w-10 h-10 rounded-2xl bg-ug-navy/5 flex items-center justify-center text-ug-navy shrink-0 group-hover:bg-ug-teal group-hover:text-white transition"><GraduationCap size={18} /></div><div className="flex-1 min-w-0"><p className="text-xs font-bold text-ug-navy leading-tight mb-1">{education.degree}</p><p className="text-[11px] font-bold text-gray-400 tracking-wide">{education.institution}</p><div className="flex items-center gap-2 mt-1"><span className="text-[11px] font-bold text-ug-teal">{education.field_of_study}</span><span className="text-gray-300">•</span><span className="text-[11px] font-bold text-gray-400">{education.graduation_year}</span></div></div></div>)}</div>
        </section>
      </div>
      {!!profile.projects?.length && <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm"><div className="flex items-center gap-3 mb-10"><div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center"><Rocket size={20} /></div><div><h4 className="text-sm font-bold text-ug-navy tracking-tight">Key Initiatives</h4><p className="text-[11px] font-bold text-gray-400 tracking-wide">Project Portfolio Analysis</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{profile.projects.map((project, index) => <div key={index} className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-xl hover:border-ug-teal/20 transition-all text-left group"><div className="flex justify-between items-start mb-3"><span className="text-[11px] font-semibold text-ug-teal tracking-wide">{project.industry}</span><LinkIcon size={14} className="text-gray-200 group-hover:text-ug-teal" /></div><h5 className="text-xs font-bold text-ug-navy leading-tight mb-2">{project.project_name}</h5><p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">Research focused on {project.industry.toLowerCase()} innovation and technical implementation.</p></div>)}</div></section>}
    </div>
  );
};
