
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-expect-error - Vite ?url suffix resolves to a static string URL at build time
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { UserRole, AIProfile } from '../types';
import { AIProfileService } from '../services/aiProfileService';
import { StorageService } from '../services/storageService';
import { EmbeddingService } from '../services/embeddingService';
import { 
  Users, GraduationCap, Building, Wallet, 
  ChevronRight, ChevronLeft, Upload, 
  FileText, Check, Loader2, Sparkles,
  Search, Target, Zap, Rocket
} from 'lucide-react';
import { useToast } from '../App';
import { useNavigate } from 'react-router-dom';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
  onSkip?: () => void;
  isEmbedded?: boolean;
}

type OnboardingStep = 'role' | 'questionnaire' | 'resume' | 'processing' | 'summary' | 'entity_identity' | 'entity_focus' | 'entity_model' | 'entity_competencies' | 'entity_ai_questions';

export const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete, onSkip, isEmbedded = false }) => {
  const [step, setStep] = useState<OnboardingStep>(isEmbedded ? 'questionnaire' : 'role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(user?.role || null);
  const [userType, setUserType] = useState<'individual' | 'entity'>(user?.user_type || 'individual');
  const [cvText, setCvText] = useState('');
  
  const [answers, setAnswers] = useState<any>({
    orgName: user?.company || '',
    orgType: '',
    location: '',
    website: user?.website_url || '',
    contactEmail: user?.email || '',
    contactPhone: '',
    orgOverview: '',
    sectorVector: ['pharmaceutical', 'drugs', 'diagnostics'],
    offerVector: [],
    needVector: [],
    collaborationVector: [],
    readinessVector: [],
    capabilityVector: [],
    fundingStage: [],
    investmentRange: '',
    problemStatement: '',
    idealCandidate: '',
    ecosystemStrength: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors(prev => ({ ...prev, [key]: false }));
    }
  };

  const navigateToStep = (nextStep: OnboardingStep) => {
    setFieldErrors({});
    setStep(nextStep);
  };

  const getFieldInputStyle = (key: string, defaultBorder = "border-gray-100") => {
    if (fieldErrors[key]) {
      return "border-red-500 ring-4 ring-red-500/15 bg-red-50/40 text-red-900 placeholder-red-300 transition-all font-bold";
    }
    return `${defaultBorder} transition-all`;
  };

  const renderFieldLabel = (text: string, fieldKey: string, isRequired = true) => (
    <label className="text-[10px] font-black tracking-widest mb-2.5 flex items-center justify-between uppercase block">
      <span className={fieldErrors[fieldKey] ? "text-red-600 font-black flex items-center gap-1" : "text-gray-400"}>
        {text} {isRequired && <span className="text-red-500 font-black text-sm ml-0.5">*</span>}
      </span>
      {fieldErrors[fieldKey] && (
        <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-wider animate-pulse flex items-center gap-1">
          Required Field
        </span>
      )}
    </label>
  );

  const [customSector, setCustomSector] = useState('');
  const [customOffer, setCustomOffer] = useState('');
  const [customNeed, setCustomNeed] = useState('');
  const [customCapability, setCustomCapability] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<AIProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const stepsList = userType === 'entity' 
    ? ['role', 'entity_identity', 'entity_focus', 'entity_model', 'entity_competencies', 'entity_ai_questions', 'summary']
    : ['role', 'questionnaire', 'resume', 'summary'];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === UserRole.Researcher || role === UserRole.Student) {
      setUserType('individual');
      setStep('questionnaire');
    }
  };

  const handleLookingForToggle = (option: string) => {
    const currentSelections = Array.isArray(answers.looking_for)
      ? answers.looking_for
      : answers.looking_for
        ? [answers.looking_for]
        : [];

    let nextSelections: string[];
    if (currentSelections.includes(option)) {
      nextSelections = currentSelections.filter((item: string) => item !== option);
    } else {
      nextSelections = [...currentSelections, option];
    }

    setAnswers({
      ...answers,
      looking_for: nextSelections
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileExt === 'pdf';
    const isText = file.type === 'text/plain' || fileExt === 'txt';
    const isDoc = file.type.includes('word') || ['doc', 'docx'].includes(fileExt || '');

    if (!isPDF && !isText && !isDoc) {
      showToast("Please upload a PDF, DOCX or TXT file", "error");
      return;
    }

    setIsUploading(true);
    
    try {
      if (isPDF) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            // Robust dynamic import for pdfjs
            const pdfjsLib = await import('pdfjs-dist');
            
            // Configure worker location to use our local same-origin bundled asset
            try {
              pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
            } catch (err) {
              console.warn("Could not bind local module worker path, using unpkg CDN fallback:", err);
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';
            }

            let loadingTask = pdfjsLib.getDocument({ 
              data: arrayBuffer,
              useWorkerFetch: false,
            });

            let pdf;
            try {
              pdf = await loadingTask.promise;
            } catch (loadErr) {
              console.warn("PDF parsing failed with current worker setup. Retrying instantly via native main-thread fallback:", loadErr);
              // Resetting workerSrc forces PDF.js to fall back securely on its internal main-thread parser
              pdfjsLib.GlobalWorkerOptions.workerSrc = '';
              const fallbackTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                useWorkerFetch: false,
              });
              pdf = await fallbackTask.promise;
            }
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              fullText += pageText + '\n';
            }

            // Cleanup
            if (fullText.trim().length < 20) {
              throw new Error("Empty extraction");
            }

            setCvText(fullText.trim());
            showToast("Resume parsed successfully", "success");
          } catch (err) {
            console.error("PDF Parse Error:", err);
            showToast("Parsing failed. Please paste text directly into the area below.", "warning");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (isText) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCvText(e.target?.result as string);
          setIsUploading(false);
          showToast("Document registered", "success");
        };
        reader.readAsText(file);
      } else {
        setIsUploading(false);
        showToast("Word documents (.docx) cannot be parsed directly. Please paste the text below.", "warning");
      }
    } catch (error) {
      setIsUploading(false);
      showToast("File processing failed", "error");
    }
  };

  const processAIProfile = async () => {
    setIsProcessing(true);
    setStep('processing');
    try {
      let profile: AIProfile;
      if (userType === 'entity') {
        profile = await AIProfileService.processEntityProfile({
          ...answers,
          role: selectedRole,
          user_name: user?.name
        });
      } else {
        profile = await AIProfileService.processProfile(cvText, {
          ...answers,
          role: selectedRole,
          user_name: user?.name
        });
      }
      
      setExtractedProfile(profile);
      
      // Generate Embedding for matching
      let embedding: number[] | undefined;
      try {
        embedding = (await EmbeddingService.getEmbedding(profile.embedding_text)) ?? undefined;
      } catch (err: any) {
        console.error("Embedding generation failed:", err);
        showToast(err?.message || "AI Vector Matching setup failed due to missing credentials. Using local fallbacks.", "warning");
      }

      // Save to Supabase
      if (user?.id) {
        await StorageService.updateProfile({
          id: user.id,
          role: selectedRole as any,
          user_type: userType,
          ai_profile: profile,
          bio: profile.semantic_summary,
          embedding,
          semantic_summary: profile.semantic_summary,
          answers: answers
        });
      }
      
      setStep('summary');
    } catch (error) {
      showToast("Simulation Error: AI Processing failed. Please try again.", "error");
      setStep(userType === 'entity' ? 'entity_ai_questions' : 'resume');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderRoleStep = () => (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-ug-teal/10 text-ug-teal rounded-3xl flex items-center justify-center mx-auto mb-6"
        >
          <Zap size={40} className="fill-current" />
        </motion.div>
        <h1 className="text-4xl font-black text-ug-navy mb-4 tracking-tighter col-span-2">Who are you in this ecosystem?</h1>
        <p className="text-gray-500 font-medium col-span-2">Select your identity to personalize your intelligence hub.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: UserRole.Student, icon: GraduationCap, label: 'Student', desc: 'Find internships & mentors.' },
          { id: UserRole.Researcher, icon: Users, label: 'Researcher', desc: 'Secure funding & assistants.' },
          { id: UserRole.Investor, icon: Wallet, label: 'Investor', desc: 'Discover high-impact research.' },
          { id: UserRole.IndustryPartner, icon: Building, label: 'Industry', desc: 'Scale solutions & hire talent.' },
        ].map((role) => (
          <motion.button
            key={role.id}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelect(role.id)}
            className={`group bg-white p-8 rounded-[2rem] border-2 text-left transition-all shadow-xl ${
              selectedRole === role.id ? 'border-ug-teal ring-4 ring-ug-teal/10' : 'border-gray-100 hover:border-ug-teal shadow-gray-100 hover:shadow-ug-teal/10'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
              selectedRole === role.id ? 'bg-ug-teal text-white font-black' : 'bg-gray-50 group-hover:bg-ug-teal text-gray-400 group-hover:text-white'
            }`}>
              <role.icon size={28} />
            </div>
            <h3 className="text-lg font-black text-ug-navy mb-2 uppercase tracking-wide group-hover:text-ug-teal transition-colors">
              {role.label}
            </h3>
            <p className="text-xs text-gray-400 font-bold leading-relaxed">{role.desc}</p>
          </motion.button>
        ))}
      </div>

      {selectedRole && (selectedRole === UserRole.Investor || selectedRole === UserRole.IndustryPartner) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-12 max-w-2xl mx-auto bg-gray-50 rounded-[2.5rem] p-8 border-2 border-gray-100 relative text-center"
        >
          <h3 className="text-lg font-black text-ug-navy uppercase tracking-wider mb-2">Portal Setup Type</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">Are you setting up as an individual advisor, or on behalf of an organization?</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <button
              onClick={() => setUserType('individual')}
              className={`py-4 px-6 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                userType === 'individual'
                  ? 'bg-ug-navy text-white border-ug-navy shadow-lg'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-ug-teal'
              }`}
            >
              Individual Advisor
            </button>
            <button
              onClick={() => setUserType('entity')}
              className={`py-4 px-6 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                userType === 'entity'
                  ? 'bg-ug-navy text-white border-ug-navy shadow-lg'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-ug-teal'
              }`}
            >
              Firm / NGO / Entity
            </button>
          </div>

          <button
            onClick={() => {
              if (userType === 'entity') {
                setStep('entity_identity');
              } else {
                setStep('questionnaire');
              }
            }}
            className="bg-ug-teal text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
          >
            Proceed Setup <ChevronRight size={16} />
          </button>
        </motion.div>
      )}
    </div>
  );

  const renderEntityIdentity = () => (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={() => navigateToStep('role')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors font-sans focus:outline-none cursor-pointer">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="mb-10">
        <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 1 of 5: Identity</span>
        <h2 className="text-3xl font-black text-ug-navy tracking-tight">Organization Profile</h2>
        <p className="text-gray-400 text-sm font-medium mt-2">Tell us about your organization or fund. Mandatory fields are marked with (<span className="text-red-500 font-bold">*</span>).</p>
      </div>

      <div className="space-y-6">
        <div>
          {renderFieldLabel("Organization / Company Name", "orgName")}
          <input 
            type="text" 
            placeholder="e.g. Ghana Health NGO, Delta Fund..."
            value={answers.orgName || ''}
            onChange={(e) => {
              setAnswers({...answers, orgName: e.target.value});
              clearFieldError("orgName");
            }}
            className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("orgName", "border-gray-100")}`}
          />
        </div>

        <div>
          {renderFieldLabel("Organization Type", "orgType")}
          <select 
            value={answers.orgType || ''}
            onChange={(e) => {
              setAnswers({...answers, orgType: e.target.value});
              clearFieldError("orgType");
            }}
            className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold appearance-none cursor-pointer ${getFieldInputStyle("orgType", "border-gray-100")}`}
          >
            <option value="">Select Type</option>
            <option value="Private Company">Private Company / Enterprise</option>
            <option value="NGO">NGO / Non-Governmental Organization</option>
            <option value="Angel Investment Firm">Angel Investment Firm</option>
            <option value="Venture Capitalist (VC)">Venture Capitalist (VC)</option>
            <option value="Healthcare Provider">Healthcare / Clinical Provider</option>
            <option value="Ecosystem Lab">Ecosystem Incubator / Lab</option>
            <option value="Government Agency">Government / Public Agency</option>
            <option value="Other NGO/Firm">Other NGO or Firm</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {renderFieldLabel("Primary Office Location", "location")}
            <input 
              type="text" 
              placeholder="e.g. Accra, Kumasi"
              value={answers.location || ''}
              onChange={(e) => {
                setAnswers({...answers, location: e.target.value});
                clearFieldError("location");
              }}
              className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("location", "border-gray-100")}`}
            />
          </div>
          <div>
            {renderFieldLabel("Website URL", "website", false)}
            <input 
              type="url" 
              placeholder="e.g. www.firm.com"
              value={answers.website || ''}
              onChange={(e) => setAnswers({...answers, website: e.target.value})}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {renderFieldLabel("Contact Person Email", "contactEmail")}
            <input 
              type="email" 
              placeholder="e.g. executive@firm.com"
              value={answers.contactEmail || ''}
              onChange={(e) => {
                setAnswers({...answers, contactEmail: e.target.value});
                clearFieldError("contactEmail");
              }}
              className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("contactEmail", "border-gray-100")}`}
            />
          </div>
          <div>
            {renderFieldLabel("Contact Phone Number", "contactPhone")}
            <input 
              type="tel" 
              placeholder="e.g. +233 24 000 0000"
              value={answers.contactPhone || ''}
              onChange={(e) => {
                setAnswers({...answers, contactPhone: e.target.value});
                clearFieldError("contactPhone");
              }}
              className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("contactPhone", "border-gray-100")}`}
            />
          </div>
        </div>

        <div>
          {renderFieldLabel("Brief Organization Overview", "orgOverview")}
          <textarea 
            placeholder="Describe what your organization represents, does, and offers..."
            value={answers.orgOverview || ''}
            onChange={(e) => {
              setAnswers({...answers, orgOverview: e.target.value});
              clearFieldError("orgOverview");
            }}
            className={`w-full h-32 bg-gray-50 border-2 rounded-[2rem] p-6 outline-none focus:bg-white focus:border-ug-teal text-xs font-medium leading-relaxed resize-none shadow-sm ${getFieldInputStyle("orgOverview", "border-gray-100")}`}
          />
        </div>

        <button 
          onClick={() => {
            const errs: Record<string, boolean> = {};
            if (!answers.orgName || !answers.orgName.trim()) errs.orgName = true;
            if (!answers.orgType) errs.orgType = true;
            if (!answers.location || !answers.location.trim()) errs.location = true;
            if (!answers.contactEmail || !answers.contactEmail.trim()) errs.contactEmail = true;
            if (!answers.contactPhone || !answers.contactPhone.trim()) errs.contactPhone = true;
            if (!answers.orgOverview || !answers.orgOverview.trim()) errs.orgOverview = true;

            if (Object.keys(errs).length > 0) {
              setFieldErrors(errs);
              showToast("Please fill in all mandatory fields highlighted in red.", "error");
              return;
            }
            navigateToStep('entity_focus');
          }}
          className="w-full bg-ug-navy text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
        >
          Next: Focus & Intentions <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderEntityFocus = () => {
    const defaultSectors = ['pharmaceutical', 'drugs', 'diagnostics'];
    
    const toggleSector = (sector: string) => {
      const current = answers.sectorVector || [];
      const next = current.includes(sector) ? current.filter((s: string) => s !== sector) : [...current, sector];
      setAnswers({ ...answers, sectorVector: next });
      clearFieldError("sectorVector");
    };

    const addCustomSector = () => {
      if (!customSector.trim()) return;
      const clean = customSector.trim().toLowerCase();
      if (!answers.sectorVector?.includes(clean)) {
        setAnswers({ ...answers, sectorVector: [...(answers.sectorVector || []), clean] });
        clearFieldError("sectorVector");
      }
      setCustomSector('');
    };

    const offersOptions = [
      'Funding & Grants',
      'Mentorship & Advisory',
      'Lab Equipment & Space',
      'Regulatory Guidance',
      'Clinical Trial Access',
      'Student Internships',
      'Technology Licensing'
    ];

    const toggleOffer = (offer: string) => {
      const current = answers.offerVector || [];
      const next = current.includes(offer) ? current.filter((o: string) => o !== offer) : [...current, offer];
      setAnswers({ ...answers, offerVector: next });
      clearFieldError("offerVector");
    };

    const addCustomOffer = () => {
      if (!customOffer.trim()) return;
      const clean = customOffer.trim();
      if (!answers.offerVector?.includes(clean)) {
        setAnswers({ ...answers, offerVector: [...(answers.offerVector || []), clean] });
        clearFieldError("offerVector");
      }
      setCustomOffer('');
    };

    const needsOptions = [
      'Diagnostic Devices/Prototypes',
      'Novel Drug Leads',
      'Vaccine Candidates',
      'Ecosystem Partners',
      'Academic Publications',
      'Bioinformatics Databases',
      'Biosensor Test Assets'
    ];

    const toggleNeed = (need: string) => {
      const current = answers.needVector || [];
      const next = current.includes(need) ? current.filter((n: string) => n !== need) : [...current, need];
      setAnswers({ ...answers, needVector: next });
      clearFieldError("needVector");
    };

    const addCustomNeed = () => {
      if (!customNeed.trim()) return;
      const clean = customNeed.trim();
      if (!answers.needVector?.includes(clean)) {
        setAnswers({ ...answers, needVector: [...(answers.needVector || []), clean] });
        clearFieldError("needVector");
      }
      setCustomNeed('');
    };

    return (
      <div className="max-w-2xl mx-auto p-8">
        <button onClick={() => navigateToStep('entity_identity')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors font-sans focus:outline-none cursor-pointer">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-10">
          <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 2 of 5: Intentions</span>
          <h2 className="text-3xl font-black text-ug-navy tracking-tight">Focus & Core Capabilities</h2>
          <p className="text-gray-400 text-sm font-medium mt-2">Define focus tracks and resource exchanges. Mandatory fields are marked with (<span className="text-red-500 font-bold">*</span>).</p>
        </div>

        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 scroll-smooth pb-6">
          {/* SECTOR VECTOR TRACKS */}
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.sectorVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("Focus Tracks", "sectorVector")}
            <div className="flex flex-wrap gap-2.5 mb-4">
              {defaultSectors.map(sector => (
                <button
                  key={sector}
                  onClick={() => toggleSector(sector)}
                  className={`py-2 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    answers.sectorVector?.includes(sector) ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                  }`}
                >
                  {sector}
                </button>
              ))}
              {answers.sectorVector?.filter((s: string) => !defaultSectors.includes(s)).map((custom: string) => (
                <button
                  key={custom}
                  onClick={() => toggleSector(custom)}
                  className="py-2 px-4 rounded-xl border-2 bg-ug-teal text-white border-ug-teal text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {custom}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add other custom focus area..."
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSector()}
                className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-4 outline-none focus:bg-white focus:border-ug-teal text-xs font-bold"
              />
              <button onClick={addCustomSector} className="px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Add</button>
            </div>
          </div>

          {/* Core Value Offerings */}
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.offerVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("What Can You Offer the Ecosystem?", "offerVector")}
            <div className="flex flex-wrap gap-2 mb-4">
              {offersOptions.map(offer => (
                <button
                  key={offer}
                  onClick={() => toggleOffer(offer)}
                  className={`py-2.5 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    answers.offerVector?.includes(offer) ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                  }`}
                >
                  {offer}
                </button>
              ))}
              {answers.offerVector?.filter((o: string) => !offersOptions.includes(o)).map((custom: string) => (
                <button
                  key={custom}
                  onClick={() => toggleOffer(custom)}
                  className="py-2.5 px-4 rounded-xl border-2 bg-ug-teal text-white border-ug-teal text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {custom}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add other resource custom offer..."
                value={customOffer}
                onChange={(e) => setCustomOffer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomOffer()}
                className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-4 outline-none focus:bg-white focus:border-ug-teal text-xs font-bold"
              />
              <button onClick={addCustomOffer} className="px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Add</button>
            </div>
          </div>

          {/* Looking For (Needs) */}
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.needVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("What Are You Actively Looking For?", "needVector")}
            <div className="flex flex-wrap gap-2 mb-4">
              {needsOptions.map(need => (
                <button
                  key={need}
                  onClick={() => toggleNeed(need)}
                  className={`py-2.5 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    answers.needVector?.includes(need) ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                  }`}
                >
                  {need}
                </button>
              ))}
              {answers.needVector?.filter((n: string) => !needsOptions.includes(n)).map((custom: string) => (
                <button
                  key={custom}
                  onClick={() => toggleNeed(custom)}
                  className="py-2.5 px-4 rounded-xl border-2 bg-ug-teal text-white border-ug-teal text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {custom}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add other dynamic custom need..."
                value={customNeed}
                onChange={(e) => setCustomNeed(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomNeed()}
                className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-4 outline-none focus:bg-white focus:border-ug-teal text-xs font-bold"
              />
              <button onClick={addCustomNeed} className="px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Add</button>
            </div>
          </div>

          <button 
            onClick={() => {
              const errs: Record<string, boolean> = {};
              if (!answers.sectorVector?.length) errs.sectorVector = true;
              if (!answers.offerVector?.length) errs.offerVector = true;
              if (!answers.needVector?.length) errs.needVector = true;

              if (Object.keys(errs).length > 0) {
                setFieldErrors(errs);
                showToast("Please choose at least one item for each compulsory field highlighted in red.", "error");
                return;
              }
              navigateToStep('entity_model');
            }}
            className="w-full bg-ug-navy text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
          >
            Next: Operation Model <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderEntityModel = () => {
    const collaborationOptions = [
      'Sponsored Research Contracts',
      'Joint Venture Scaling',
      'Technology Licensing Agreement',
      'Scientific Advisory Seats',
      'Ecosystem Internship Cohort'
    ];

    const toggleCollab = (collab: string) => {
      const current = answers.collaborationVector || [];
      const next = current.includes(collab) ? current.filter((c: string) => c !== collab) : [...current, collab];
      setAnswers({ ...answers, collaborationVector: next });
      clearFieldError("collaborationVector");
    };

    const readinessOptions = [
      'Stage 1: Concept & Formulation',
      'Stage 2: Proof of Concept',
      'Stage 3: Prototype Development',
      'Stage 4: Validation Stage',
      'Stage 5: Commercialization-Ready',
      'Stage 6: Market-Ready'
    ];

    const toggleReadiness = (readiness: string) => {
      const current = answers.readinessVector || [];
      const next = current.includes(readiness) ? current.filter((r: string) => r !== readiness) : [...current, readiness];
      setAnswers({ ...answers, readinessVector: next });
      clearFieldError("readinessVector");
    };

    const fundingRangeOptions = [
      { id: 'seed_grant', val: '$10k - $50k (Seed Grant)' },
      { id: 'pre_a', val: '$50k - $250k (Pre-Series A)' },
      { id: 'growth_capital', val: '$250k - $1M (Growth Capital)' },
      { id: 'series_a', val: '$1M+ (Institutional VC)' }
    ];

    const toggleFundingStage = (stage: string) => {
      const current = answers.fundingStage || [];
      const next = current.includes(stage) ? current.filter((s: string) => s !== stage) : [...current, stage];
      setAnswers({ ...answers, fundingStage: next });
      clearFieldError("fundingStage");
    };

    return (
      <div className="max-w-2xl mx-auto p-8">
        <button onClick={() => navigateToStep('entity_focus')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors font-sans focus:outline-none cursor-pointer">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-10">
          <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 3 of 5: Model</span>
          <h2 className="text-3xl font-black text-ug-navy tracking-tight">Collaboration Model</h2>
          <p className="text-gray-400 text-sm font-medium mt-2">Specify engagement workflows and target readiness. Mandatory fields are marked with (<span className="text-red-500 font-bold">*</span>).</p>
        </div>

        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 scroll-smooth pb-6">
          {/* Collaboration Models */}
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.collaborationVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("Preferred Collaboration Models", "collaborationVector")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collaborationOptions.map(collab => {
                const isSelected = answers.collaborationVector?.includes(collab);
                return (
                  <button
                    key={collab}
                    onClick={() => toggleCollab(collab)}
                    className={`py-3.5 px-6 rounded-xl border-2 text-[10px] font-black uppercase text-left tracking-wide transition-all cursor-pointer ${
                      isSelected ? 'bg-ug-navy text-white border-ug-navy shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                    }`}
                  >
                    {collab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Innovation Readiness Preferences */}
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.readinessVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("Target Maturity Stages", "readinessVector")}
            <div className="space-y-3">
              {readinessOptions.map(readiness => {
                const isSelected = answers.readinessVector?.includes(readiness);
                return (
                  <button
                    key={readiness}
                    onClick={() => toggleReadiness(readiness)}
                    className={`w-full py-3.5 px-6 rounded-xl border-2 text-[10px] font-black uppercase text-left tracking-wide transition-all flex justify-between items-center cursor-pointer ${
                      isSelected ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                    }`}
                  >
                    <span>{readiness}</span>
                    <span className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'border-ug-teal bg-ug-teal' : 'border-gray-200 bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* INVESTOR ADDITIONAL CRITERIA */}
          {selectedRole === UserRole.Investor && (
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <div className={`p-4 rounded-3xl transition-all ${fieldErrors.investmentRange ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
                {renderFieldLabel("Investment Ticket Range", "investmentRange")}
                <div className="grid grid-cols-2 gap-3">
                  {fundingRangeOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setAnswers({...answers, investmentRange: option.val});
                        clearFieldError("investmentRange");
                      }}
                      className={`py-3 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        answers.investmentRange === option.val ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                      }`}
                    >
                      {option.val}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-3xl transition-all ${fieldErrors.fundingStage ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
                {renderFieldLabel("Active Funding Stages", "fundingStage")}
                <div className="flex flex-wrap gap-2.5">
                  {['Pre-Seed', 'Seed Stage', 'Venture Funding', 'Grant/Philanthropy Aid'].map(stage => {
                    const isSelected = answers.fundingStage?.includes(stage);
                    return (
                      <button
                        key={stage}
                        onClick={() => toggleFundingStage(stage)}
                        className={`py-2 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isSelected ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => {
              const errs: Record<string, boolean> = {};
              if (!answers.collaborationVector?.length) errs.collaborationVector = true;
              if (!answers.readinessVector?.length) errs.readinessVector = true;
              if (selectedRole === UserRole.Investor) {
                if (!answers.investmentRange) errs.investmentRange = true;
                if (!answers.fundingStage?.length) errs.fundingStage = true;
              }

              if (Object.keys(errs).length > 0) {
                setFieldErrors(errs);
                showToast("Please complete all compulsory selections highlighted in red.", "error");
                return;
              }
              navigateToStep('entity_competencies');
            }}
            className="w-full bg-ug-navy text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
          >
            Next: Match Competencies <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderEntityCompetencies = () => {
    const competenciesList = [
      'PCR & Molecular Diagnostics',
      'Rapid Diagnostic Test (RDT) Development',
      'Biosensor Development',
      'Drug Discovery Research',
      'Drug Formulation & Development',
      'Vaccine Research & Development',
      'Machine Learning & Healthcare AI',
      'Medical Device Engineering',
      'Bio-engineering Prototype Fabrication'
    ];

    const toggleCapability = (cap: string) => {
      const current = answers.capabilityVector || [];
      const next = current.includes(cap) ? current.filter((c: string) => c !== cap) : [...current, cap];
      setAnswers({ ...answers, capabilityVector: next });
      clearFieldError("capabilityVector");
    };

    const addCustomCapability = () => {
      if (!customCapability.trim()) return;
      const clean = customCapability.trim();
      if (!answers.capabilityVector?.includes(clean)) {
        setAnswers({ ...answers, capabilityVector: [...(answers.capabilityVector || []), clean] });
        clearFieldError("capabilityVector");
      }
      setCustomCapability('');
    };

    return (
      <div className="max-w-2xl mx-auto p-8">
        <button onClick={() => navigateToStep('entity_model')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors font-sans focus:outline-none cursor-pointer">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-10">
          <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 4 of 5: Competencies</span>
          <h2 className="text-3xl font-black text-ug-navy tracking-tight">Ecosystem Competencies</h2>
          <p className="text-gray-400 text-sm font-medium mt-2">Select capabilities your organization values or validates. Mandatory fields marked with (<span className="text-red-500 font-bold">*</span>).</p>
        </div>

        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 scroll-smooth pb-6">
          <div className={`p-4 rounded-3xl transition-all ${fieldErrors.capabilityVector ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
            {renderFieldLabel("Specific Competencies We Support / Value", "capabilityVector")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {competenciesList.map(comp => {
                const isSelected = answers.capabilityVector?.includes(comp);
                return (
                  <button
                    key={comp}
                    onClick={() => toggleCapability(comp)}
                    className={`py-3 px-4 rounded-xl border-2 text-[10px] text-left font-black uppercase tracking-wide transition-all cursor-pointer ${
                      isSelected ? 'bg-ug-navy text-white border-ug-navy shadow-inner' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                    }`}
                  >
                    {comp}
                  </button>
                );
              })}
              {answers.capabilityVector?.filter((c: string) => !competenciesList.includes(c)).map((custom: string) => (
                <button
                  key={custom}
                  onClick={() => toggleCapability(custom)}
                  className="py-3 px-4 rounded-xl border-2 bg-ug-teal text-white border-ug-teal text-[10px] text-left font-black uppercase tracking-wide transition-all cursor-pointer"
                >
                  {custom}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add other dynamic custom capability..."
                value={customCapability}
                onChange={(e) => setCustomCapability(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCapability()}
                className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl py-2 px-4 outline-none focus:bg-white focus:border-ug-teal text-xs font-bold"
              />
              <button onClick={addCustomCapability} className="px-4 py-2 bg-ug-navy text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Add</button>
            </div>
          </div>

          <button 
            onClick={() => {
              if (!answers.capabilityVector?.length) {
                setFieldErrors({ capabilityVector: true });
                showToast("Please choose or add at least one competency tag.", "error");
                return;
              }
              navigateToStep('entity_ai_questions');
            }}
            className="w-full bg-ug-navy text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
          >
            Next: AI Setup Questions <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderEntityAIQuestions = () => (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={() => navigateToStep('entity_competencies')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors font-sans focus:outline-none cursor-pointer">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="mb-10">
        <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 5 of 5: AI Core Matching</span>
        <h2 className="text-3xl font-black text-ug-navy tracking-tight">Smart Match Synthesis</h2>
        <p className="text-gray-400 text-sm font-medium mt-2">Fill out these open-ended statements to power high-fidelity semantic re-ranking. Mandatory fields marked with (<span className="text-red-500 font-bold">*</span>).</p>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 scroll-smooth pb-6">
        <div>
          {renderFieldLabel("What specific medical diagnostics, drugs, or healthcare problems does your organization actively seek to solve?", "problemStatement")}
          <textarea 
            placeholder="Describe the medical, diagnostics or pharmaceutical problems you want to work on..."
            value={answers.problemStatement || ''}
            onChange={(e) => {
              setAnswers({...answers, problemStatement: e.target.value});
              clearFieldError("problemStatement");
            }}
            className={`w-full h-28 bg-gray-50 border-2 rounded-2xl p-6 outline-none focus:bg-white focus:border-ug-teal text-xs font-medium leading-relaxed ${getFieldInputStyle("problemStatement", "border-gray-100")}`}
          />
        </div>

        <div>
          {renderFieldLabel("Describe your ideal research/student matches. What qualities/technologies make them ideal?", "idealCandidate")}
          <textarea 
            placeholder="For example: academic labs with molecular diagnostic device prototypes..."
            value={answers.idealCandidate || ''}
            onChange={(e) => {
              setAnswers({...answers, idealCandidate: e.target.value});
              clearFieldError("idealCandidate");
            }}
            className={`w-full h-28 bg-gray-50 border-2 rounded-2xl p-6 outline-none focus:bg-white focus:border-ug-teal text-xs font-medium leading-relaxed ${getFieldInputStyle("idealCandidate", "border-gray-100")}`}
          />
        </div>

        <div>
          {renderFieldLabel("What makes your organization/firm a strong partner for University of Ghana research teams?", "ecosystemStrength")}
          <textarea 
            placeholder="For example: robust NGO field network across Ghana cities, access to bio-safety labs, funding ticket scaling..."
            value={answers.ecosystemStrength || ''}
            onChange={(e) => {
              setAnswers({...answers, ecosystemStrength: e.target.value});
              clearFieldError("ecosystemStrength");
            }}
            className={`w-full h-28 bg-gray-50 border-2 rounded-2xl p-6 outline-none focus:bg-white focus:border-ug-teal text-xs font-medium leading-relaxed ${getFieldInputStyle("ecosystemStrength", "border-gray-100")}`}
          />
        </div>

        <button 
          onClick={() => {
            const errs: Record<string, boolean> = {};
            if (!answers.problemStatement || !answers.problemStatement.trim()) errs.problemStatement = true;
            if (!answers.idealCandidate || !answers.idealCandidate.trim()) errs.idealCandidate = true;
            if (!answers.ecosystemStrength || !answers.ecosystemStrength.trim()) errs.ecosystemStrength = true;

            if (Object.keys(errs).length > 0) {
              setFieldErrors(errs);
              showToast("Please answer all compulsory open-ended questions highlighted in red.", "error");
              return;
            }
            processAIProfile();
          }}
          className="w-full bg-ug-navy text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
        >
          Initialize AI Matching Twin <Sparkles size={18} />
        </button>
      </div>
    </div>
  );

  const renderQuestionnaire = () => (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={() => navigateToStep('role')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="mb-10">
        <span className="text-xs font-black text-ug-teal tracking-[0.2em] mb-2 block">Step 2 of 4</span>
        <h2 className="text-3xl font-black text-ug-navy tracking-tight">Your Intentions</h2>
        <p className="text-gray-400 text-sm font-medium mt-2">Tell us what you want to achieve today. Mandatory fields are marked with (<span className="text-red-500 font-bold">*</span>).</p>
      </div>

      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 scroll-smooth">
        {/* COMMON QUESTIONS */}
        <div>
          {renderFieldLabel("Primary Focus / Area of Expertise", "expertise")}
          <input 
            type="text" 
            placeholder="e.g. Molecular Biology, FinTech, Robotics..."
            value={answers.expertise || ''}
            onChange={(e) => {
              setAnswers({...answers, expertise: e.target.value});
              clearFieldError("expertise");
            }}
            className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("expertise", "border-gray-100")}`}
          />
        </div>

        <div className={`p-4 rounded-3xl transition-all ${fieldErrors.looking_for ? 'border-2 border-red-500 bg-red-50/20' : ''}`}>
          {renderFieldLabel("What are you currently looking for? (Select at least one)", "looking_for")}
          <div className="grid grid-cols-2 gap-3">
            {(selectedRole === UserRole.Researcher 
              ? ['Funding', 'Industry Partner', 'Student Assistants', 'Commercialization'] 
              : selectedRole === UserRole.Student 
              ? ['Internships', 'Mentorship', 'Research Collab', 'Scholarships']
              : selectedRole === UserRole.Investor
              ? ['High-Impact Research', 'Student Startups', 'Patent Portfolios', 'Commercial Ready']
              : ['Skilled Talent', 'Problem Solving', 'Research Funding', 'Joint Ventures']
            ).map(option => {
              const isSelected = Array.isArray(answers.looking_for)
                ? answers.looking_for.includes(option)
                : answers.looking_for === option;
              
              return (
                <button
                  key={option}
                  onClick={() => {
                    handleLookingForToggle(option);
                    clearFieldError("looking_for");
                  }}
                  className={`py-3 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected ? 'bg-ug-navy text-white border-ug-navy' : 'bg-white border-gray-100 text-gray-400 hover:border-ug-teal'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* ROLE-SPECIFIC QUESTIONS */}
        {selectedRole === UserRole.Student && (
          <div className="space-y-6 pt-4 border-t border-gray-50">
            <div>
              {renderFieldLabel("Current Academic Program / Degree", "program")}
              <input 
                type="text" 
                placeholder="e.g. BSc Computer Science, MPhil Biochemistry"
                value={answers.program || ''}
                onChange={(e) => {
                  setAnswers({...answers, program: e.target.value});
                  clearFieldError("program");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("program", "border-gray-100")}`}
              />
            </div>
            <div>
              {renderFieldLabel("Availability", "availability")}
              <select 
                value={answers.availability || ''}
                onChange={(e) => {
                  setAnswers({...answers, availability: e.target.value});
                  clearFieldError("availability");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold appearance-none cursor-pointer ${getFieldInputStyle("availability", "border-gray-100")}`}
              >
                <option value="">Select Availability</option>
                <option value="immediate">Immediate</option>
                <option value="next_month">Next Month</option>
                <option value="part_time">Part-time</option>
                <option value="internship_window">Specific Internship Window</option>
              </select>
            </div>
          </div>
        )}

        {selectedRole === UserRole.Researcher && (
          <div className="space-y-6 pt-4 border-t border-gray-50">
            <div>
              {renderFieldLabel("Research Stage", "research_stage")}
              <select 
                value={answers.research_stage || ''}
                onChange={(e) => {
                  setAnswers({...answers, research_stage: e.target.value});
                  clearFieldError("research_stage");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold appearance-none cursor-pointer ${getFieldInputStyle("research_stage", "border-gray-100")}`}
              >
                <option value="">Select Stage</option>
                <option value="conceptual">Conceptual / Literature Review</option>
                <option value="prototype">Active Prototyping</option>
                <option value="validation">Clinical / Market Validation</option>
                <option value="scaling">Ready for Commercial Scaling</option>
              </select>
            </div>
            <div className="flex items-center gap-3 p-4 bg-ug-teal/5 rounded-2xl border border-ug-teal/10">
              <input 
                type="checkbox" 
                id="needs_funding"
                checked={!!answers.funding_needed}
                onChange={(e) => setAnswers({...answers, funding_needed: e.target.checked})}
                className="w-5 h-5 rounded-lg border-2 border-ug-teal text-ug-teal focus:ring-ug-teal cursor-pointer"
              />
              <label htmlFor="needs_funding" className="text-xs font-black text-ug-navy uppercase tracking-widest cursor-pointer">Seeking External Funding</label>
            </div>
          </div>
        )}

        {selectedRole === UserRole.Investor && (
          <div className="space-y-6 pt-4 border-t border-gray-50">
            <div>
              {renderFieldLabel("Funding Range (USD)", "funding_range")}
              <select 
                value={answers.funding_range || ''}
                onChange={(e) => {
                  setAnswers({...answers, funding_range: e.target.value});
                  clearFieldError("funding_range");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold appearance-none cursor-pointer ${getFieldInputStyle("funding_range", "border-gray-100")}`}
              >
                <option value="">Select Range</option>
                <option value="seed">Seed: $10k - $50k</option>
                <option value="pre_a">Pre-Series A: $50k - $250k</option>
                <option value="growth">Growth: $250k+</option>
              </select>
            </div>
            <div>
              {renderFieldLabel("Investment Focus", "investment_focus")}
              <input 
                type="text" 
                placeholder="e.g. Biotech, AI, Agri-tech"
                value={answers.investment_focus || ''}
                onChange={(e) => {
                  setAnswers({...answers, investment_focus: e.target.value});
                  clearFieldError("investment_focus");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("investment_focus", "border-gray-100")}`}
              />
            </div>
          </div>
        )}

        {selectedRole === UserRole.IndustryPartner && (
          <div className="space-y-6 pt-4 border-t border-gray-50">
            <div>
              {renderFieldLabel("Industry Sector", "sector")}
              <input 
                type="text" 
                placeholder="e.g. Manufacturing, Logistics, Healthcare"
                value={answers.sector || ''}
                onChange={(e) => {
                  setAnswers({...answers, sector: e.target.value});
                  clearFieldError("sector");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold ${getFieldInputStyle("sector", "border-gray-100")}`}
              />
            </div>
            <div>
              {renderFieldLabel("Preferred Collaboration", "collab_type")}
              <select 
                value={answers.collab_type || ''}
                onChange={(e) => {
                  setAnswers({...answers, collab_type: e.target.value});
                  clearFieldError("collab_type");
                }}
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-8 outline-none focus:bg-white focus:border-ug-teal text-sm font-bold appearance-none cursor-pointer ${getFieldInputStyle("collab_type", "border-gray-100")}`}
              >
                <option value="">Select Type</option>
                <option value="internship">Internship Programs</option>
                <option value="research">Sponsored Research</option>
                <option value="advisory">Advisory & Mentorship</option>
                <option value="licensing">Technology Licensing</option>
              </select>
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            const errs: Record<string, boolean> = {};

            if (!answers.expertise || !answers.expertise.trim()) {
              errs.expertise = true;
            }

            const hasLookingFor = Array.isArray(answers.looking_for) 
              ? answers.looking_for.length > 0 
              : Boolean(answers.looking_for);

            if (!hasLookingFor) {
              errs.looking_for = true;
            }

            if (selectedRole === UserRole.Student) {
              if (!answers.program || !answers.program.trim()) errs.program = true;
              if (!answers.availability) errs.availability = true;
            }

            if (selectedRole === UserRole.Researcher) {
              if (!answers.research_stage) errs.research_stage = true;
            }

            if (selectedRole === UserRole.Investor) {
              if (!answers.funding_range) errs.funding_range = true;
              if (!answers.investment_focus || !answers.investment_focus.trim()) errs.investment_focus = true;
            }

            if (selectedRole === UserRole.IndustryPartner) {
              if (!answers.sector || !answers.sector.trim()) errs.sector = true;
              if (!answers.collab_type) errs.collab_type = true;
            }

            if (Object.keys(errs).length > 0) {
              setFieldErrors(errs);
              showToast("Please fill in all mandatory fields highlighted in red.", "error");
              return;
            }

            navigateToStep('resume');
          }}
          className="w-full bg-ug-navy text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
        >
          Next Step <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderResumeStep = () => {
    const isCvRequired = selectedRole === UserRole.Student || selectedRole === UserRole.Researcher;
    const hasCvError = Boolean(fieldErrors.cvText);

    return (
      <div className="max-w-2xl mx-auto p-8">
        <button onClick={() => navigateToStep('questionnaire')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-ug-navy font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black text-ug-teal tracking-[0.2em] block">Step 3 of 4</span>
            {isCvRequired && (
              <span className="px-3 py-1 bg-red-100 text-red-700 font-black text-[9px] uppercase tracking-wider rounded-full border border-red-200">
                Mandatory Step *
              </span>
            )}
          </div>
          <h2 className="text-3xl font-black text-ug-navy tracking-tight">Experience Import & CV Parse</h2>
          <p className="text-gray-400 text-sm font-medium mt-2">
            {isCvRequired ? (
              <strong className="text-red-600 font-extrabold">CV Submission Required (*): </strong>
            ) : null}
            Upload your CV to the <strong className="text-ug-teal font-black">AI Parser</strong> in PDF or TXT format for instant extraction, or paste your complete CV/resume text in the area below.
          </p>
        </div>

        {hasCvError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0" />
            <span>CV Submission is mandatory for {selectedRole === UserRole.Student ? 'Students' : 'Researchers'}. Please upload a PDF/TXT CV or paste your resume text below.</span>
          </div>
        )}

        <div className="space-y-8">
          <div className="relative group">
            <input 
              type="file" 
              id="cv-upload"
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e);
                clearFieldError("cvText");
              }}
              accept=".pdf,.txt"
            />
            <label 
              htmlFor="cv-upload"
              className={`w-full aspect-video border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                hasCvError 
                  ? 'bg-red-50/40 border-red-500 ring-4 ring-red-500/15'
                  : cvText 
                  ? 'bg-ug-teal/5 border-ug-teal' 
                  : 'bg-gray-50 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`p-6 rounded-3xl ${hasCvError ? 'bg-red-500 text-white' : cvText ? 'bg-ug-teal text-white' : 'bg-white text-gray-300 shadow-sm'} transition-colors`}>
                {isUploading ? <Loader2 className="animate-spin" size={32} /> : (cvText ? <Check size={32} /> : <Upload size={32} />)}
              </div>
              <div className="text-center">
                <p className={`text-sm font-black uppercase tracking-widest ${hasCvError ? 'text-red-600 font-extrabold' : 'text-ug-navy'}`}>
                  {isUploading ? 'Extracting Data...' : (cvText ? 'CV Payload Registered' : 'Drop CV / Resume File *')}
                </p>
                <p className="text-[10px] text-ug-teal font-bold uppercase tracking-widest mt-1">Direct Extraction: PDF & TXT</p>
              </div>
            </label>
          </div>

          <div className="text-center">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${hasCvError ? 'text-red-600 font-extrabold' : 'text-gray-400'}`}>
              Or paste CV text directly below <span className="text-red-500 font-bold">*</span>
            </span>
          </div>

          <textarea 
            placeholder="Paste CV text or a detailed bio/experience summary here (required)..."
            value={cvText}
            onChange={(e) => {
              setCvText(e.target.value);
              clearFieldError("cvText");
            }}
            className={`w-full h-48 bg-gray-50 border-2 rounded-[2rem] p-8 outline-none focus:bg-white focus:border-ug-teal text-xs font-medium leading-relaxed resize-none shadow-inner ${getFieldInputStyle("cvText", "border-gray-100")}`}
          />

          <button 
            onClick={() => {
              if (isCvRequired && (!cvText || cvText.trim().length < 20)) {
                setFieldErrors({ cvText: true });
                showToast("A CV / Resume is mandatory for Students and Researchers. Please upload a PDF/TXT or paste your CV text.", "error");
                return;
              }
              if (!cvText && !answers.expertise) {
                setFieldErrors({ cvText: true });
                showToast("Please provide your CV or primary area of expertise before continuing.", "error");
                return;
              }
              processAIProfile();
            }}
            className="w-full bg-ug-navy text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-ug-navy/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 cursor-pointer"
          >
            Initialize Intelligence <Sparkles size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
      <div className="relative mb-12">
        <div className="w-32 h-32 border-4 border-ug-teal/10 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-ug-teal animate-spin" size={64} />
        </div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -inset-8 bg-ug-teal/10 rounded-full blur-3xl z-[-1]"
        />
      </div>
      <h2 className="text-3xl font-black text-ug-navy tracking-tighter mb-4 animate-bounce">Generating Digital Twin...</h2>
      <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] max-w-sm mx-auto leading-loose">
        Normalizing research datasets, classifying technical competencies, and identifying optimal ecosystem nodes.
      </p>
    </div>
  );

  const renderSummary = () => (
    <div className="max-w-4xl mx-auto p-12">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        <div className="flex-1">
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="px-4 py-2 bg-ug-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                {extractedProfile?.professional_profile?.current_role || 'Member'}
              </div>
              <div className="px-4 py-2 bg-ug-teal text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                {extractedProfile?.professional_profile?.experience_level || 'General'}
              </div>
            </div>
            <h1 className="text-5xl font-black text-ug-navy tracking-tighter mb-6 leading-none">
                Intelligence Extraction <span className="text-ug-teal">Complete.</span>
            </h1>
            <p className="text-gray-500 font-medium leading-relaxed italic text-lg">
                "{extractedProfile?.semantic_summary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Technical Assets</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([
                  ...(extractedProfile?.skills?.technical_skills || []), 
                  ...(extractedProfile?.skills?.tools_and_technologies || [])
                ])).slice(0, 10).map(s => (
                  <span key={s} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[9px] font-bold text-gray-600 uppercase border border-gray-100">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Strategic Intent</h4>
              <div className="flex flex-wrap gap-2">
                {(extractedProfile?.collaboration_profile?.looking_for || []).map(l => (
                  <span key={l} className="px-3 py-1.5 bg-ug-teal/10 rounded-lg text-[9px] font-bold text-ug-teal uppercase border border-ug-teal/20">{l}</span>
                ))}
              </div>
            </div>
          </div>

          {(extractedProfile?.work_experience?.length || 0) > 0 && (
            <div className="mb-12">
              <h4 className="text-[10px] font-black text-ug-teal uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={14} /> Professional Trajectory
              </h4>
              <div className="space-y-4">
                {extractedProfile?.work_experience?.slice(0, 2).map((exp, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-black text-ug-navy uppercase">{exp.role} @ {exp.organization}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{exp.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(extractedProfile?.projects?.length || 0) > 0 && (
            <div className="mb-12">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Rocket size={14} /> Ecosystem Initiatives
              </h4>
              <div className="space-y-4">
                {extractedProfile?.projects?.slice(0, 2).map((p, i) => (
                  <div key={i} className="border-l-2 border-gray-100 pl-4">
                    <p className="text-xs font-bold text-ug-navy mb-1">{p.project_name}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={onComplete}
            className="w-full md:w-auto bg-ug-navy text-white px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-ug-navy/40 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-4 group"
          >
            Enter Dashboard <Rocket size={20} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/50">
            <h4 className="text-[10px] font-black text-ug-navy uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Digital Identity</h4>
            <div className="space-y-6">
                {[
                    { label: 'Education', val: extractedProfile?.education?.[0]?.degree, icon: GraduationCap },
                    { label: 'Role', val: extractedProfile?.professional_profile?.professional_title, icon: Target },
                    { label: 'Experience', val: extractedProfile?.professional_profile?.experience_level, icon: Zap },
                ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><item.icon size={18}/></div>
                        <div>
                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{item.label}</p>
                            <p className="text-[11px] font-bold text-ug-navy uppercase tracking-tight">{item.val || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-150 shadow-sm font-sans text-ug-navy relative overflow-hidden selection:bg-ug-teal/20">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[400px] h-[400px] bg-ug-teal/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Simplified Header for Embedded status monitoring */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-6 mb-8 relative z-10 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-ug-teal uppercase tracking-[0.2em] mb-1">Interactive Match Setup</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-ug-navy uppercase tracking-tight">AI Matching Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="flex gap-1.5">
              {stepsList.map((s, i) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-700 ${
                  stepsList.indexOf(step) >= i ? 'w-8 bg-ug-teal' : 'w-3 bg-gray-100'
                }`} />
              ))}
            </div>
            {onSkip && (
              <button 
                onClick={onSkip} 
                className="text-gray-400 hover:text-ug-navy font-black text-[9px] uppercase tracking-widest transition-colors border border-gray-200 hover:border-gray-300 px-3.5 py-2 rounded-xl active:scale-95 duration-150 shrink-0"
              >
                Close Portal
              </button>
            )}
          </div>
        </div>

        <main className="relative z-10 pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {step === 'role' && renderRoleStep()}
              {step === 'questionnaire' && renderQuestionnaire()}
              {step === 'resume' && renderResumeStep()}
              {step === 'entity_identity' && renderEntityIdentity()}
              {step === 'entity_focus' && renderEntityFocus()}
              {step === 'entity_model' && renderEntityModel()}
              {step === 'entity_competencies' && renderEntityCompetencies()}
              {step === 'entity_ai_questions' && renderEntityAIQuestions()}
              {step === 'processing' && renderProcessing()}
              {step === 'summary' && renderSummary()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-ug-navy overflow-x-hidden selection:bg-ug-teal/20">
      {/* Background elements */}
      <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-ug-teal/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="px-8 py-10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
            <div className="bg-ug-navy p-2 rounded-2xl text-white shadow-xl shadow-ug-navy/20">
                <GraduationCap size={24} />
            </div>
            <span className="font-black tracking-[0.3em] uppercase text-sm">UG Hub</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-10">
            <div className="hidden md:flex gap-2">
                {stepsList.map((s, i) => (
                    <div key={s} className={`h-1 rounded-full transition-all duration-700 ${
                        stepsList.indexOf(step) >= i ? 'w-12 bg-ug-teal' : 'w-4 bg-gray-100'
                    }`} />
                ))}
            </div>
            {onSkip && (
              <button 
                onClick={onSkip} 
                className="bg-ug-teal/10 hover:bg-ug-teal text-ug-navy hover:text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                Skip Setup
              </button>
            )}
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-ug-navy font-black text-[10px] uppercase tracking-widest transition-colors">Abort</button>
        </div>
      </header>
      
      <main className="relative z-10 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {step === 'role' && renderRoleStep()}
            {step === 'questionnaire' && renderQuestionnaire()}
            {step === 'resume' && renderResumeStep()}
            {step === 'entity_identity' && renderEntityIdentity()}
            {step === 'entity_focus' && renderEntityFocus()}
            {step === 'entity_model' && renderEntityModel()}
            {step === 'entity_competencies' && renderEntityCompetencies()}
            {step === 'entity_ai_questions' && renderEntityAIQuestions()}
            {step === 'processing' && renderProcessing()}
            {step === 'summary' && renderSummary()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
