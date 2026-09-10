import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Check, Loader2, Image as ImageIcon, DollarSign, FileCode, Camera, FileUp, Calendar } from 'lucide-react';
import { Project, DisclosureStatus, ProjectStatus, Visibility, ResearchArea } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../contexts/ToastContext';
import { IpDisclosureService } from '../../services/ipDisclosureService';

export const ProjectFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (continueToDisclosure?: boolean, disclosureId?: string) => void;
  project: Project | null;
}> = ({ isOpen, onClose, onSave, project }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // File states
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [technicalBrief, setTechnicalBrief] = useState<File | null>(null);

  // Temporary string state for achievements textarea to avoid line deletion and cursor jump behaviors when pressing enter
  const [tmpAchievementsText, setTmpAchievementsText] = useState('');

  const [formData, setFormData] = useState<Partial<Project>>({
    title: '',
    description: '',
    department: '',
    status: ProjectStatus.Concept,
    visibility: Visibility.Public,
    trl: 1,
    research_area: ResearchArea.Diagnostics,
    image_url: '',
    budget: '',
    start_date: new Date().toISOString().split('T')[0],
    funding_amount_usd: '',
    open_to_collaboration: true,
    technical_details_url: '',
    achievements: [],
    needs: []
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
      setTmpAchievementsText(project.achievements?.join('\n') || '');
    } else {
      setFormData({
        title: '',
        description: '',
        department: '',
        status: ProjectStatus.Concept,
        visibility: Visibility.Public,
        trl: 1,
        research_area: ResearchArea.Diagnostics,
        image_url: '',
        budget: '',
        start_date: new Date().toISOString().split('T')[0],
        funding_amount_usd: '',
        open_to_collaboration: true,
        technical_details_url: '',
        achievements: [],
        needs: []
      });
      setTmpAchievementsText('');
    }
    setMainImage(null);
    setEvidenceImage(null);
    setTechnicalBrief(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent, statusOverride?: DisclosureStatus) => {
    e.preventDefault();
    setErrorMessage(null);

    const missingFields = [
      !formData.title?.trim() && 'Research title',
      !formData.department?.trim() && 'Department',
      !formData.description?.trim() && 'Executive summary',
    ].filter(Boolean) as string[];
    if (missingFields.length) {
      const message = `Complete the required fields: ${missingFields.join(', ')}.`;
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.image_url || '';
      let finalBriefUrl = formData.technical_details_url || '';

      // Upload files if selected
      if (mainImage) {
        const url = await StorageService.uploadFile(mainImage, 'projects');
        finalImageUrl = url;
      }

      if (evidenceImage) {
        const url = await StorageService.uploadFile(evidenceImage, 'projects');
        finalImageUrl = finalImageUrl ? `${finalImageUrl}|${url}` : url;
      }

      if (technicalBrief) {
        const url = await StorageService.uploadFile(technicalBrief, 'projects');
        finalBriefUrl = url;
      }

      // Determine disclosure status and visibility
       const finalStatus = project ? (statusOverride || formData.disclosure_status || undefined) : DisclosureStatus.Draft;
      const finalVisibility = statusOverride === DisclosureStatus.Draft ? Visibility.Internal : (project ? formData.visibility : Visibility.Internal);

      const updatedPayload = {
        ...formData,
        image_url: finalImageUrl,
        technical_details_url: finalBriefUrl,
        disclosure_status: finalStatus,
        visibility: finalVisibility
      };

       const savedProject = await StorageService.saveProject(updatedPayload);
       let savedDisclosureId: string | undefined;
       if (savedProject.id) {
         // The disclosure endpoint is idempotent, so this also repairs older projects
         // that were saved before the IP disclosure record was created.
          const disclosure = await IpDisclosureService.createDraft(savedProject.id);
          savedDisclosureId = disclosure.id;
       }
       const continueToDisclosure = !project && statusOverride === DisclosureStatus.Submitted;
       showToast(project ? "Disclosure Updated" : continueToDisclosure ? "Project saved. Continue with IP questions." : "Project saved as a draft.", "success");
       onSave(continueToDisclosure, savedDisclosureId);
      onClose();
    } catch (err: any) {
      const message = err.message || "Failed to save disclosure";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const status = submitter?.getAttribute('data-disclosure-status') as DisclosureStatus | null;
    void handleSubmit(e, status || undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 md:p-6 bg-ug-navy/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <div className="bg-white rounded-2xl md:rounded-2xl w-full max-w-5xl p-6 md:p-8 shadow-xl relative my-8">
         <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-ug-teal text-white rounded-2xl flex items-center justify-center shadow-lg">
                <FileCode size={24} />
             </div>
             <div>
               <h2 className="text-2xl md:text-3xl font-bold text-ug-navy tracking-tight">{project ? 'Update Disclosure' : 'New Project Disclosure'}</h2>
               <p className="text-[11px] font-semibold text-gray-400 tracking-[0.3em] mt-1">University of Ghana Research Intelligence</p>
             </div>
          </div>
           <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition hover:rotate-90 duration-300"><X size={24} /></button>
         </div>

         {errorMessage && (
           <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
             {errorMessage}
           </div>
         )}

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-11 gap-6">
          {/* Left Column: Core Identity */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Identification</span>
               </div>
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Research Title / Product Name</label>
                 <input required type="text" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none transition" placeholder="Enter formal project title..." />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Research Area</label>
                   <select value={formData.research_area || ''} onChange={e => setFormData({...formData, research_area: e.target.value as ResearchArea})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none cursor-pointer">
                     {Object.values(ResearchArea).map(area => <option key={area} value={area}>{area}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Department</label>
                   <input required type="text" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" placeholder="e.g. Computer Science" />
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Content & Maturity</span>
               </div>
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Executive Summary</label>
                 <textarea required rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-medium text-gray-600 focus:ring-2 focus:ring-ug-teal/20 outline-none resize-none leading-relaxed" placeholder="Describe your research methodology and potential impact..." />
               </div>
 
               <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Status</label>
                 <select 
                   value={formData.status || ''} 
                   onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus, trl: Object.values(ProjectStatus).indexOf(e.target.value as ProjectStatus) + 1})}
                   className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none cursor-pointer"
                 >
                   {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
            </div>

            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                  <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Visual Evidence</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer bg-gray-50 hover:bg-white hover:border-ug-teal/30 transition group overflow-hidden">
                    {mainImage ? (
                       <div className="w-full h-full p-2">
                          <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover rounded-2xl" alt="" />
                       </div>
                    ) : (
                      <div className="text-center group-hover:scale-110 transition duration-500">
                        <Camera size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Primary Image</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setMainImage(e.target.files?.[0] || null)} />
                  </label>

                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer bg-gray-50 hover:bg-white hover:border-ug-teal/30 transition group overflow-hidden">
                    {evidenceImage ? (
                       <div className="w-full h-full p-2">
                          <img src={URL.createObjectURL(evidenceImage)} className="w-full h-full object-cover rounded-2xl" alt="" />
                       </div>
                    ) : (
                      <div className="text-center group-hover:scale-110 transition duration-500">
                        <ImageIcon size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Secondary Proof</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setEvidenceImage(e.target.files?.[0] || null)} />
                  </label>
               </div>
            </div>
          </div>

          {/* Right Column: Technical & Logistics */}
          <div className="lg:col-span-5 space-y-8 bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-100">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-4 w-1 bg-ug-teal rounded-full"></div>
                 <span className="text-[11px] font-semibold text-ug-navy tracking-wide">Logistics & Funding</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Budget Estimate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" placeholder="$0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-bold text-ug-navy focus:ring-2 focus:ring-ug-teal/20 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Key Achievements & Milestones</label>
                <textarea 
                  rows={4} 
                  value={tmpAchievementsText} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const textarea = e.currentTarget;
                      const start = textarea.selectionStart;
                      const textBefore = tmpAchievementsText.substring(0, start);
                      const textAfter = tmpAchievementsText.substring(start);
                      
                      const linesBefore = textBefore.split('\n');
                      const lastLine = linesBefore[linesBefore.length - 1];
                      
                      let prefix = '';
                      if (lastLine.trim().startsWith('•')) {
                        prefix = '• ';
                      } else if (lastLine.trim().startsWith('-')) {
                        prefix = '- ';
                      } else if (/^\d+\./.test(lastLine.trim())) {
                        const match = lastLine.trim().match(/^(\d+)\./);
                        if (match) {
                          const nextNum = parseInt(match[1], 10) + 1;
                          prefix = `${nextNum}. `;
                        }
                      }
                      
                      if (prefix) {
                        e.preventDefault();
                        const newText = textBefore + '\n' + prefix + textAfter;
                        setTmpAchievementsText(newText);
                        
                        const newLines = newText.split('\n').map(s => s.trim()).filter(Boolean);
                        setFormData({
                          ...formData,
                          achievements: newLines
                        });
                        
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
                        }, 0);
                      }
                    }
                  }}
                  onChange={e => {
                    const txt = e.target.value;
                    setTmpAchievementsText(txt);
                    const parsedLines = txt.split('\n').map(s => s.trim()).filter(Boolean);
                    setFormData({
                      ...formData,
                      achievements: parsedLines
                    });
                  }} 
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-medium text-gray-700 focus:ring-2 focus:ring-ug-teal/20 outline-none resize-none text-xs leading-relaxed" 
                  placeholder="• Lab validation completed&#10;• Prototype developed&#10;• Clinical testing phase..." 
                />
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-gray-400 tracking-wide ml-1">Technical Briefing (PDF/DOC)</label>
                 <label className="flex items-center gap-4 w-full p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:shadow-xl transition group">
                    <div className="p-3 bg-ug-navy text-ug-teal rounded-xl shadow-lg group-hover:scale-110 transition">
                      <FileUp size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ug-navy truncate">
                         {technicalBrief ? technicalBrief.name : 'Upload Document'}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-400 tracking-wide">Formal Disclosure Brief</p>
                    </div>
                    <input type="file" className="hidden" onChange={e => setTechnicalBrief(e.target.files?.[0] || null)} />
                 </label>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="collab" className="text-[11px] font-semibold text-ug-navy tracking-wide cursor-pointer select-none">Open to Collaboration</label>
                  <label htmlFor="collab" className="relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      id="collab" 
                      checked={!!formData.open_to_collaboration} 
                      onChange={e => setFormData({...formData, open_to_collaboration: e.target.checked})} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-ug-teal after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                <p className="text-[11px] font-medium text-gray-400 leading-normal">Enabling this makes your research discoverable to verified industry partners and technical investors.</p>
              </div>

              <div className="pt-6 space-y-4">
                {project ? (
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-ug-navy text-white py-3.5 rounded-xl font-semibold text-[11px] tracking-[0.25em] shadow-xl hover:bg-ug-teal active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    Apply Disclosure Changes
                  </button>
                ) : (
                  <>
                    <button 
                      type="submit" 
                      data-disclosure-status={DisclosureStatus.Submitted}
                      disabled={loading} 
                      className="w-full bg-ug-teal text-white py-3.5 rounded-xl font-semibold text-[11px] tracking-[0.25em] shadow-xl hover:bg-ug-navy active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                      Save & Continue to IP Questions
                    </button>
                    <button 
                      type="submit" 
                      data-disclosure-status={DisclosureStatus.Draft}
                      disabled={loading} 
                      className="w-full bg-gray-100 text-ug-navy hover:bg-gray-200 py-3 rounded-xl font-semibold text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                  </>
                )}
                <button type="button" onClick={onClose} className="w-full py-4 text-gray-400 font-semibold text-[11px] tracking-wide hover:text-red-500 transition-colors">
                  Discard & Close
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
