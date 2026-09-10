import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Bookmark, Briefcase, ChevronDown, ChevronUp, Clock, Inbox, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../contexts/ToastContext';
import { SectionTitle, StatCard } from '../../components/dashboard/DashboardPrimitives';
import { HubStreamSidebar, UnifiedDashboardProfile } from '../../components/dashboard/DashboardWidgets';

export const StudentOverviewPage = ({ user }: { user: User | null }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Project[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectForApp, setSelectedProjectForApp] = useState<Project | null>(null);
  const [appType, setAppType] = useState<'Research Assistantship' | 'Scholarship Application' | 'Lab Workspace Access'>('Research Assistantship');
  const [eduLevel, setEduLevel] = useState('');
  const [program, setProgram] = useState('');
  const [interests, setInterests] = useState('');
  const [availability, setAvailability] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const getRecommendations = (allProjects: Project[], profile: any) => {
    if (!profile) return [];
    const studentProgram = (profile.program || '').toLowerCase();
    const studentInterests = (profile.looking_for || '').toLowerCase();

    const recs = allProjects.map(project => {
      let score = 0;
      let reason = '';
      const title = (project.title || '').toLowerCase();
      const desc = (project.description || '').toLowerCase();
      const dept = (project.department || '').toLowerCase();
      const area = (project.research_area || '').toLowerCase();

      if (studentProgram && (title.includes(studentProgram) || desc.includes(studentProgram) || dept.includes(studentProgram) || area.includes(studentProgram))) {
        score += 4;
        reason = `Aligned with your course: ${profile.program}`;
      } else if (studentInterests) {
        const keywords = studentInterests.split(',').map((keyword: string) => keyword.trim().toLowerCase()).filter(Boolean);
        for (const keyword of keywords) {
          if (keyword && (title.includes(keyword) || desc.includes(keyword) || dept.includes(keyword) || area.includes(keyword))) {
            score += 3;
            reason = `Matches your interest in ${keyword}`;
            break;
          }
        }
      }

      if (project.open_to_collaboration) {
        score += 1;
        if (!reason) reason = 'Seeking talent';
      }
      return { project, score, reason };
    });

    return recs.filter(recommendation => recommendation.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const loadDashboardData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [allProjects, studentApps, bookmarked] = await Promise.all([
        StorageService.getProjects(),
        StorageService.getStudentApplications(user.id),
        StorageService.getBookmarks(user.id),
      ]);
      setProjects(allProjects);
      setBookmarks(bookmarked);
      setApplications(studentApps);
      setRecommendations(getRecommendations(allProjects, user));
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    if (user) {
      setEduLevel(user.education_level || '');
      setProgram(user.program || '');
      setInterests(user.looking_for || '');
      setAvailability(user.availability || '');
    }
  }, [user?.id]);

  const openApplicationDrawer = (project: Project, defaultType: typeof appType = 'Research Assistantship') => {
    setSelectedProjectForApp(project);
    setAppType(defaultType);
    let template = '';
    if (defaultType === 'Research Assistantship') {
      template = `Dear Professor,\n\nI am writing to express my strong interest in joining your research team for the project "${project.title}". My academic background and goals align perfectly with this research, and I am eager to contribute to your goals.`;
    } else if (defaultType === 'Scholarship Application') {
      template = `To the Selection Committee,\n\nI am writing to submit my formal inquiry regarding scholarships, funding, or fellowship opportunities for the project "${project.title}". I would appreciate the chance to discuss potential pathways to support my research contribution.`;
    } else if (defaultType === 'Lab Workspace Access') {
      template = `Dear Lab Coordinator,\n\nI am requesting authorized workspace or laboratory access in connection with "${project.title}". I require access to conduct research, run analysis, or collaborate with team members.`;
    }
    setMessage(template);
    setDrawerOpen(true);
  };

  const handleSubmitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || !selectedProjectForApp) return;

    try {
      setSubmitting(true);
      await StorageService.updateStudentProfile(user.id, {
        education_level: eduLevel,
        availability,
        looking_for: interests,
        program,
      });

      let messageText = '';
      if (appType === 'Research Assistantship') {
        messageText = `[ASSISTANTSHIP_APPLICATION] Student "${user.name}" has formally requested consideration for a Laboratory / Research Assistantship on this project. Education Level: ${eduLevel || 'N/A'}. Program/Course: ${program || 'N/A'}. Availability: ${availability || 'N/A'}. Interests: ${interests || 'N/A'}.\n\nPersonal Statement:\n${message}`;
      } else if (appType === 'Scholarship Application') {
        messageText = `[SCHOLARSHIP_APPLICATION] Student "${user.name}" has submitted an inquiry for Academic Scholarship & Fellowships on this project. Education Level: ${eduLevel || 'Graduate'}. Program: ${program || 'N/A'}. Availability: ${availability || 'N/A'}.\n\nStatement of Intent:\n${message}`;
      } else if (appType === 'Lab Workspace Access') {
        messageText = `[LAB_WORKSPACE_ACCESS] Student "${user.name}" is requesting secure authorization to access the workspace relative to this project. Justification:\n${message}`;
      }

      const metric = appType === 'Lab Workspace Access' ? 'requests' : 'expressions_of_interest';
      await StorageService.submitEOI(selectedProjectForApp.id, user.name, messageText, undefined, metric);
      showToast(`Your ${appType} request was submitted!`, 'success');
      setDrawerOpen(false);
      loadDashboardData();
    } catch (err: any) {
      console.error('Application error:', err);
      showToast(err.message || 'Failed to submit application. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const parseAppType = (applicationMessage: string) => {
    if (!applicationMessage) return 'General Inquiry';
    if (applicationMessage.startsWith('[ASSISTANTSHIP_APPLICATION]')) return 'Research Assistantship';
    if (applicationMessage.startsWith('[SCHOLARSHIP_APPLICATION]')) return 'Scholarship Inquiry';
    if (applicationMessage.startsWith('[LAB_WORKSPACE_ACCESS]')) return 'Lab Workspace Access';
    if (applicationMessage.includes('Technical Disclosure')) return 'Technical Disclosure';
    return 'Inquiry';
  };

  const cleanMessage = (applicationMessage: string) => {
    if (!applicationMessage) return '';
    return applicationMessage
      .replace(/^\[ASSISTANTSHIP_APPLICATION\].*?\n\n(Personal Statement:\n)?/s, '')
      .replace(/^\[SCHOLARSHIP_APPLICATION\].*?\n\n(Statement of Intent:\n)?/s, '')
      .replace(/^\[LAB_WORKSPACE_ACCESS\].*?\n\n(Justification:\n)?/s, '')
      .replace(/^(?:[REVEAL_REQUEST]|🔐).*?\n\n/s, '');
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = status ? status.toLowerCase() : '';
    if (normalizedStatus === 'approved' || normalizedStatus === 'released' || normalizedStatus.startsWith('released:')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
    if (normalizedStatus === 'rejected') return 'bg-rose-50 text-rose-700 border border-rose-100';
    return 'bg-amber-50 text-amber-700 border border-amber-100';
  };

  const openOpportunities = projects.filter(project => project.open_to_collaboration);

  return (
    <div className="space-y-6 animate-fade-in">
      <UnifiedDashboardProfile user={user} onAction={() => navigate('/projects')} actionLabel="Explore Research" />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard label="Active Opportunities" value={openOpportunities.length.toString()} icon={BookOpen} />
        <StatCard label="My Applications" value={applications.length.toString()} icon={Clock} />
        <StatCard label="Saved Bookmarks" value={bookmarks.length.toString()} icon={Bookmark} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="space-y-6 md:col-span-2 lg:col-span-8">
          <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
            <SectionTitle title="Collaboration Calls" subtitle="Active Research Projects Seeking Talent" />
            <div className="space-y-4 mt-6">
              {openOpportunities.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-xs font-bold">No active collaboration calls listed.</p>
                </div>
              ) : openOpportunities.slice(0, 3).map(project => (
                <div key={project.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-gray-100 rounded-2xl bg-white hover:shadow-lg transition gap-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-ug-navy/5 rounded-2xl flex items-center justify-center text-ug-navy shrink-0"><Briefcase size={24} /></div>
                    <div>
                      <h4 className="font-bold text-ug-navy text-lg">{project.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-ug-teal tracking-wide">{project.department}</span>
                        <span className="text-gray-300 text-[11px]">•</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${
                          project.status === ProjectStatus.Concept ? 'bg-gray-50 text-gray-600 border-gray-100' :
                          project.status === ProjectStatus.ProofOfConcept ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          project.status === ProjectStatus.Prototype ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          project.status === ProjectStatus.Validation ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          project.status === ProjectStatus.Commercialization ? 'bg-teal-50 text-teal-700 border-teal-100' :
                          project.status === ProjectStatus.MarketReady ? 'bg-green-50 text-green-700 border-green-100' :
                          'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>{project.status || 'Active'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/projects/${project.id}`)} className="bg-gray-100 text-ug-navy px-4 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-gray-200 transition">View</button>
                    <button onClick={() => openApplicationDrawer(project, 'Research Assistantship')} className="bg-ug-navy text-white px-5 py-2 rounded-xl text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition">Apply for Assistantship</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
            <SectionTitle title="Scholarships & Research Fellowships" subtitle="Academically Funded Pathways to Support Innovation" />
            <div className="mt-6 text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-xs font-bold">No funded opportunities listed right now.</p>
              <p className="text-gray-400 text-[11px] font-medium mt-1">Check back soon or ask your department about open calls.</p>
            </div>
          </section>

          {recommendations.length > 0 && (
            <section className="border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
              <SectionTitle title="Recommended for You" subtitle="Personalized research matches based on your program and profile keywords" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {recommendations.map(({ project, reason }) => (
                  <div key={project.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <span className="bg-ug-teal/10 text-ug-teal text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full mb-3 inline-block">{reason}</span>
                      <h4 className="font-bold text-ug-navy text-sm leading-snug line-clamp-2 mb-2 hover:text-ug-teal transition cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>{project.title}</h4>
                      <p className="text-gray-400 text-[11px] tracking-wider font-bold mb-4">{project.department}</p>
                    </div>
                    <div className="flex gap-2"><button onClick={() => openApplicationDrawer(project)} className="flex-1 text-center bg-ug-navy hover:bg-ug-teal text-white py-2 rounded-xl text-[11px] font-semibold tracking-wide transition">Apply</button></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
            <SectionTitle title="My Applications & Request Tracker" subtitle="Live tracking of your assistantships, fellowship inquiries, and workspace permissions" />
            <div className="space-y-4 mt-6">
              {loading ? (
                <div className="text-center py-8"><p className="text-gray-400 text-xs font-bold tracking-wide">Loading records...</p></div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Inbox className="mx-auto text-gray-300 mb-3" size={32} />
                  <h4 className="font-bold text-ug-navy text-sm">No Active Submissions</h4>
                  <p className="text-gray-400 text-[11px] font-bold mt-1 tracking-wider">Your formal submissions will accumulate here.</p>
                </div>
              ) : applications.map(application => {
                const type = parseAppType(application.message);
                const isExpanded = expandedAppId === application.id;
                return (
                  <div key={application.id} className="p-6 border border-gray-100 rounded-2xl bg-white hover:border-gray-200 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-ug-teal/5 rounded-xl flex items-center justify-center text-ug-teal shrink-0"><Clock size={18} /></div>
                        <div>
                          <span className="text-[11px] font-semibold text-ug-teal tracking-wide block mb-1">{type}</span>
                          <h4 className="font-bold text-ug-navy text-sm">{application.projects?.title || 'General Department Grant'}</h4>
                          <p className="text-[11px] font-medium text-gray-400 mt-0.5">Submitted: {new Date(application.created_at).toLocaleDateString([], { dateStyle: 'medium' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-between md:justify-end">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide ${getStatusBadgeColor(application.status)}`}>{application.status || 'pending'}</span>
                        <button onClick={() => setExpandedAppId(isExpanded ? null : application.id)} className="p-1 text-gray-400 hover:text-ug-teal transition">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-600 bg-gray-50/50 p-4 rounded-2xl">
                        <span className="text-[11px] font-semibold text-gray-400 tracking-wide block mb-2">Message Body</span>
                        <p className="whitespace-pre-wrap font-medium">{cleanMessage(application.message)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6 border-t border-slate-200/80 pt-6 md:col-span-2 lg:col-span-4 lg:border-t-0 lg:pt-0">
          <section className="border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] sm:p-6 md:p-7">
            <SectionTitle title="Bookmarks & Watchlist" subtitle="Your pinned research interests" />
            <div className="space-y-4 mt-6">
              {loading ? (
                <p className="text-gray-400 text-xs font-bold tracking-wide text-center">Loading watchlist...</p>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                  <Bookmark className="mx-auto text-gray-300 mb-2" size={24} />
                  <p className="text-gray-400 text-[11px] font-semibold tracking-wide">Bookmark items to save them.</p>
                </div>
              ) : bookmarks.map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl bg-gray-50/30 hover:bg-white hover:shadow-md transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-ug-navy/5 flex items-center justify-center text-ug-navy shrink-0"><Briefcase size={20} /></div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-ug-navy text-xs truncate hover:text-ug-teal transition cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>{project.title}</h5>
                      <p className="text-[11px] font-bold text-gray-400 tracking-wide truncate">{project.department}</p>
                    </div>
                  </div>
                  <button onClick={() => openApplicationDrawer(project)} className="bg-ug-navy text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide hover:bg-ug-teal transition shrink-0">Apply</button>
                </div>
              ))}
            </div>
          </section>
          <HubStreamSidebar />
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && selectedProjectForApp && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-pointer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto flex flex-col border-l border-gray-100" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-ug-navy text-white sticky top-0 z-20">
                <div><span className="text-[11px] font-semibold text-ug-teal tracking-wide block mb-1">Academic Request Portal</span><h3 className="text-lg sm:text-xl font-bold">Submit Inquiry & Application</h3></div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer flex items-center gap-1 border border-white/10 px-3 py-1.5"><X size={16} /><span className="text-[11px] font-semibold tracking-wider">Close</span></button>
              </div>

              <form onSubmit={handleSubmitApplication} className="p-4 sm:p-6 flex-1 space-y-4 sm:space-y-5">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-400 tracking-wide block">Associated Project</span>
                  <h4 className="font-bold text-ug-navy text-xs sm:text-sm mt-1">{selectedProjectForApp.title}</h4>
                  <p className="text-[11px] font-bold text-ug-teal tracking-wider mt-0.5">{selectedProjectForApp.department}</p>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide block">Request Category</label>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    {[
                      { id: 'Research Assistantship', label: 'Research Assistantship', desc: 'Apply for a student assistant role inside this laboratory.' },
                      { id: 'Scholarship Application', label: 'Scholarship / Fellowship', desc: 'Inquire about available funding or stipends.' },
                      { id: 'Lab Workspace Access', label: 'Lab Workspace Access', desc: 'Request secure physical/digital authorization to access resources.' },
                    ].map(type => (
                      <div key={type.id} onClick={() => setAppType(type.id as typeof appType)} className={`p-3 sm:p-4 border rounded-2xl cursor-pointer transition text-left select-none ${appType === type.id ? 'border-ug-teal bg-ug-teal/5 text-ug-navy' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}>
                        <h5 className="font-bold text-xs">{type.label}</h5><p className="text-[11px] text-gray-400 mt-1">{type.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-50">
                  <span className="text-[11px] font-semibold text-ug-teal tracking-wide block">Verify Credentials (Saved to Profile)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Education Level</label><input type="text" className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" placeholder="e.g. MPhil, PhD, BSc Senior" value={eduLevel} onChange={event => setEduLevel(event.target.value)} required /></div>
                    <div><label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Program / Course</label><input type="text" className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" placeholder="e.g. Biochemistry" value={program} onChange={event => setProgram(event.target.value)} required /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Availability</label><input type="text" className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" placeholder="e.g. 15 hrs/week, Full-time" value={availability} onChange={event => setAvailability(event.target.value)} required /></div>
                    <div><label className="text-[11px] font-bold text-gray-400 tracking-wider block mb-1">Interests / Focus</label><input type="text" className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" placeholder="e.g. Immunology, Vaccines" value={interests} onChange={event => setInterests(event.target.value)} required /></div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 sm:pt-4 border-t border-gray-50">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide block">Custom Cover Message / Personal Statement</label>
                  <textarea rows={4} className="w-full p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-ug-teal" placeholder="Describe your qualifications, goals, and why you should be chosen..." value={message} onChange={event => setMessage(event.target.value)} required />
                </div>

                <div className="pt-4 sm:pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => setDrawerOpen(false)} className="w-full sm:w-1/3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 py-3.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer text-center">Close</button>
                  <button type="submit" disabled={submitting} className="w-full sm:w-2/3 flex items-center justify-center gap-2 bg-ug-navy hover:bg-ug-teal text-white py-3.5 rounded-xl text-xs font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer">
                    {submitting ? <><Loader2 className="animate-spin" size={16} /><span>Submitting...</span></> : <span>Submit Application</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
