
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, User as UserIcon, Building2, Mail, Globe, 
  Microscope, Award, TrendingUp, ChevronRight, Loader2,
  CheckCircle2, FileText, Share2, MessageSquare, X, Send, Check,
  GraduationCap, Briefcase, UserPlus
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User, Project } from '../types';
import { useToast } from '../App';
import { getAuthUser } from '../lib/auth-client';
import { safeExternalUrl } from '../lib/urlSafety';

// --- CONTACT PI MODAL ---
const ContactPIModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  recipientName: string;
  recipientId: string;
}> = ({ isOpen, onClose, recipientName, recipientId }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const user = await getAuthUser();
      let senderName = "External Contact";
      if (user?.id) {
        const profile = await StorageService.getProfile(user.id);
        if (profile?.name) senderName = profile.name;
      }

      // Fix: Passing null for project_id and the PI's ID for recipient_id
      await StorageService.submitEOI(null, senderName, `[PROFILE MESSAGE] ${message}`, recipientId);
      setSent(true);
      showToast("Message routed to PI dashboard", "success");
      setTimeout(() => { setSent(false); setMessage(''); onClose(); }, 2000);
    } catch (err) {
      showToast("Failed to send. Sign-in required.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ug-navy/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-fade-in-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-ug-teal"></div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-ug-navy">Contact Investigator</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
        </div>
        {sent ? (
          <div className="py-12 text-center animate-fade-in"><Check size={48} className="mx-auto text-ug-success mb-4" /><p className="font-bold text-ug-navy uppercase">Message Dispatched</p></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[11px] font-semibold text-gray-400 tracking-wide">Recipient PI</p><p className="font-bold text-ug-navy">{recipientName}</p></div>
            <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter message..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal/20 font-medium text-gray-700"></textarea>
            <button type="submit" disabled={sending} className="w-full bg-[#0092B0] text-white py-4 rounded-2xl font-bold uppercase tracking-wide shadow-xl flex items-center justify-center gap-2">
              {sending ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Send to Lab</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const ResearcherPortfolio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([StorageService.getProfile(id), StorageService.getPublicResearcherProjects(id)])
        .then(([p, projects]) => {
          setProfile(p);
          setProjects(projects);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load portfolio:", err);
          setLoading(false);
        });
    }
  }, [id]);

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${profile?.name} Portfolio`, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link Copied", "success");
      }
    } catch (e) {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-ug-teal" size={40} /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center font-bold text-ug-navy">Profile Secure/Private</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-ug-navy text-white relative overflow-hidden pt-24 pb-20">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1532187875605-1ef638272ee4?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white flex items-center gap-2 mb-10 transition-colors text-[11px] font-semibold tracking-[0.3em]"><ArrowLeft size={16} /> Exit Portfolio</button>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
             <div className="w-56 h-56 rounded-[4rem] overflow-hidden border-8 border-white shadow-xl bg-white shrink-0 group relative">
                {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-ug-navy/10"><UserIcon size={80} /></div>}
             </div>
             <div className="flex-1 text-center md:text-left pb-4">
                <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter drop-shadow-lg leading-tight">{profile.name}</h1>
                  <div className="flex items-center gap-3 px-6 py-2.5 bg-ug-teal/20 backdrop-blur-xl rounded-2xl border border-ug-teal/40 w-fit mx-auto md:mx-0 shadow-xl">
                    <CheckCircle2 size={18} className="text-ug-teal" /><span className="text-[11px] font-semibold tracking-[0.2em] text-ug-teal">Certified PI</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-8 text-white/80">
                  <div className="flex items-center gap-3"><Building2 size={20} className="text-ug-teal" /><span className="font-bold text-sm uppercase">{profile.department || "Academic Faculty"}</span></div>
                  <div className="flex items-center gap-3"><Award size={20} className="text-ug-teal" /><span className="font-bold text-sm uppercase">{profile.role}</span></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-20">
          <section className="bg-white p-8 rounded-[4rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <h2 className="text-2xl font-bold text-ug-navy mb-8 flex items-center gap-4 uppercase tracking-[0.2em]"><FileText className="text-ug-teal" size={28} /> Narrative Biography</h2>
             <p className="prose prose-2xl text-gray-600 font-normal leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, serif" }}>"{profile.bio || "Academic identity verified."}"</p>
          </section>

          {(() => {
            const links = [
              { label: 'Primary Link', url: safeExternalUrl(profile.website_url) },
              { label: 'Portfolio Link 2', url: safeExternalUrl(profile.website_url_2) },
              { label: 'Portfolio Link 3', url: safeExternalUrl(profile.website_url_3) },
            ].filter(l => l.url !== '');
            if (links.length === 0) return null;
            return (
              <section className="bg-white p-8 rounded-[4rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <h2 className="text-2xl font-bold text-ug-navy mb-8 flex items-center gap-4 uppercase tracking-[0.2em]"><Globe className="text-ug-teal" size={28} /> Digital Footprint</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {links.map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-ug-teal/5 transition-colors group">
                      <Globe size={20} className="text-ug-teal" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">{link.label}</p>
                        <p className="font-bold text-ug-navy truncate group-hover:text-ug-teal transition-colors">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Open Student Opportunities Card */}
          {(() => {
            const needsStudents = profile.needs_students || profile.ai_profile?.needs_students || profile.answers?.needs_students;

            return (
              <section className="bg-gradient-to-br from-ug-navy via-slate-900 to-ug-navy text-white p-8 md:p-8 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-ug-teal/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-ug-teal uppercase tracking-wide mb-1">
                      <GraduationCap size={18} /> Student Research Collaborations
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Opportunities Hub</h2>
                    <p className="text-xs text-gray-300 font-medium mt-1">
                      {needsStudents
                        ? 'This laboratory is actively welcoming student research assistants.'
                        : 'Contact the PI directly regarding upcoming assistantship openings.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="bg-ug-teal hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wide transition flex items-center justify-center gap-2.5 shadow-lg shrink-0 cursor-pointer"
                  >
                    <Send size={16} /> Apply / Contact PI
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {/* Recruiting Students */}
                  <div className={`p-5 rounded-2xl border transition ${needsStudents ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-white/5 border-white/10 opacity-60'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl ${needsStudents ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                        <UserPlus size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Recruiting Lab Assistants</h4>
                        <span className={`text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${needsStudents ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                          {needsStudents ? 'ACTIVELY RECRUITING' : 'No Current Openings'}
                        </span>
                      </div>
                    </div>
                    {needsStudents && (
                      <p className="text-xs text-gray-200 mt-2 font-medium bg-black/20 p-3 rounded-xl border border-white/5">
                        Lab is actively accepting student research trainees & undergraduate/postgraduate lab assistants.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}
          
          <section>
            <div className="flex justify-between items-end mb-10"><h2 className="text-4xl font-bold text-ug-navy tracking-tight">Disclosure Portfolio</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.length === 0 ? <div className="col-span-2 py-10 text-center font-bold text-gray-300">No public disclosures currently listed.</div> : projects.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-700 group flex flex-col h-full">
                  <div className="h-56 overflow-hidden relative">
                    <img 
                      src={p.image_url && p.image_url.trim() !== '' ? p.image_url.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'} 
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" 
                      alt=""
                    />
                  </div>
                  <div className="p-6 flex-1"><span className="text-[11px] font-semibold text-ug-teal tracking-[0.3em] mb-4 block">{p.research_area}</span><h3 className="font-semibold text-ug-navy text-xl group-hover:text-ug-teal transition">{p.title}</h3></div>
                </Link>
              ))}
            </div>
          </section>
        </div>

         <div className="lg:col-span-4 space-y-10">
           <section className="bg-ug-navy text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <h3 className="text-xl font-bold mb-10 flex items-center gap-4 uppercase tracking-[0.2em]"><TrendingUp className="text-ug-teal" /> Verified Impact</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10"><span className="text-[11px] font-semibold text-gray-400 tracking-wide">Published Projects</span><span className="text-2xl font-semibold text-ug-teal">{projects.length}</span></div>
                <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10"><span className="text-[11px] font-semibold text-gray-400 tracking-wide">Open to Collaboration</span><span className="text-2xl font-semibold text-ug-teal">{projects.filter(p => p.open_to_collaboration).length}</span></div>
              </div>
           </section>

          <div className="flex items-center gap-5">
            <button onClick={handleShare} className="h-[76px] w-[76px] rounded-2xl bg-white border border-gray-100 shadow-xl hover:bg-gray-50 transition-all flex items-center justify-center text-ug-navy group active:scale-95">
              <Share2 size={28} className="group-hover:scale-110 transition" />
            </button>
            <button onClick={() => setIsContactModalOpen(true)} className="flex-1 h-[76px] bg-[#0092B0] hover:bg-[#007C96] rounded-2xl shadow-xl flex items-center justify-center gap-5 transition-all active:scale-95 group overflow-hidden relative border border-white/10">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageSquare size={26} className="text-white" />
              <span className="text-white font-bold text-xs uppercase tracking-wide leading-tight">Connect <br /> with PI</span>
            </button>
          </div>
        </div>
      </div>
      <ContactPIModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} recipientName={profile.name} recipientId={id!} />
    </div>
  );
};

export default ResearcherPortfolio;
