import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Briefcase, Loader2, Plus, Sparkles, DollarSign, Calendar, MapPin, Tag 
} from 'lucide-react';
import { useToast } from '../App';
import { ChallengeService } from '../services/challengeService';
import { User, IndustryChallenge } from '../types';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onChallengePosted?: (challenge: IndustryChallenge) => void;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  isOpen,
  onClose,
  user,
  onChallengePosted
}) => {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Diagnostics');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [collabType, setCollabType] = useState('Joint R&D Pipeline');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in the challenge title and description.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const partnerId = user?.id || 'industry_partner_default';
      const created = await ChallengeService.createIndustryChallenge(
        {
          title: title.trim(),
          category,
          summary: summary.trim() || title.trim(),
          description: description.trim(),
          required_skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          collaboration_type: collabType,
          budget_range: budget.trim() || undefined,
          deadline: deadline || undefined,
          location: location.trim() || undefined,
          status: 'Open'
        },
        partnerId
      );

      if (created) {
        showToast('Commercial Challenge successfully published!', 'success');
        
        // Trigger background candidate match calculation
        ChallengeService.generateChallengeMatches(created.id, partnerId).catch(console.warn);

        // Reset form
        setTitle('');
        setSummary('');
        setDescription('');
        setSkills('');
        setBudget('');
        setDeadline('');
        setLocation('');

        if (onChallengePosted) {
          onChallengePosted(created);
        }
        onClose();
      } else {
        showToast('Failed to post challenge. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred while publishing challenge.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 py-6 sm:py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden relative my-auto"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-ug-navy to-ug-teal p-5 sm:p-6 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-3">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <Briefcase size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase bg-white/20 px-2.5 py-0.5 rounded-full tracking-widest text-white/90">Commercial Research Pipeline</span>
                  <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-white leading-tight mt-0.5">
                    Post New Industry Challenge
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition cursor-pointer relative z-10"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 md:p-8 space-y-5 overflow-y-auto flex-1 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                    Challenge Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rapid Biosensor for Infectious Disease Detection"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                    Industry Domain / Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  >
                    <option value="Diagnostics">Diagnostics & Medical Devices</option>
                    <option value="Pharmaceutical">Pharmaceutical & Drug Discovery</option>
                    <option value="Vaccines">Vaccines & Immunotherapy</option>
                    <option value="AgTech & Food">AgTech & Food Security</option>
                    <option value="Renewable Energy">Renewable Energy & Sustainability</option>
                    <option value="AI & Data Science">AI, Data & Digital Health</option>
                    <option value="Other">Other Medical & Industrial Tech</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                  Brief One-Line Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Development of portable diagnostic assay with under 15-minute readout time."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                  Detailed Scope & Technical Specifications <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Outline full technical parameters, laboratory testing criteria, material requirements, validation constraints, and target outcomes."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-medium text-gray-700 leading-relaxed focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                    Required Technical Skills (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assay design, PCR, microfluidics, ELISA, Python"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest">
                    Collaboration Framework
                  </label>
                  <select
                    value={collabType}
                    onChange={(e) => setCollabType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  >
                    <option value="Joint R&D Pipeline">Joint R&D Pipeline</option>
                    <option value="Licensing">Technology Licensing & Commercialization</option>
                    <option value="Consultancy">Specialist Academic Consultancy</option>
                    <option value="Student Internship">Student Research Fellowship / Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest flex items-center gap-1">
                    <DollarSign size={12} className="text-ug-teal" /> Budget / Grant Range
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GH₵ 50,000 - 100,000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={12} className="text-ug-teal" /> Application Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-ug-navy uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={12} className="text-ug-teal" /> Location / Market Focus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accra, Ghana / West Africa"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-ug-navy focus:outline-none focus:border-ug-teal focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest text-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-ug-navy hover:bg-ug-teal text-white rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="stroke-[3]" />
                      <span>Publish Commercial Challenge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
