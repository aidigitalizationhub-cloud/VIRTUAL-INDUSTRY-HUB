import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { IP_QUESTIONS } from '../../lib/ipSchemas';

export type AnswerMap = Record<string, { value: 'yes' | 'no' | 'not_sure' | string; text?: string }>;
type Contributor = { name: string; role: string };

const parseContributors = (value: string): Contributor[] => value.split(/\n|;/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
  const [name, ...role] = entry.split(/\s+[—–-]\s+/);
  return { name: name.trim(), role: role.join(' - ').trim() };
});

const contributorText = (contributors: Contributor[]): string => contributors
  .map(({ name, role }) => [name.trim(), role.trim()].filter(Boolean).join(' — ')).filter(Boolean).join('\n');

export const DisclosureQuestions: React.FC<{
  answers: AnswerMap;
  onChange: (next: AnswerMap) => void;
}> = ({ answers, onChange }) => {
  const [step, setStep] = useState(0);
  const [contributors, setContributors] = useState<Contributor[]>(() => {
    const raw = answers.contributors?.text || answers.contributors?.value || '';
    const parsed = parseContributors(String(raw));
    return parsed.length ? parsed : [{ name: '', role: '' }];
  });
  const question = IP_QUESTIONS[step] as typeof IP_QUESTIONS[number];
  const current = answers[question.key]?.value ?? '';
  const currentText = answers[question.key]?.text ?? (typeof current === 'string' && current.length > 20 ? current : '');

  useEffect(() => {
    if (question.key === 'contributors' && !answers.contributors) setContributors([{ name: '', role: '' }]);
  }, [question.key, answers.contributors]);

  const setAnswer = (key: string, value: string, text?: string) => onChange({ ...answers, [key]: { value: value as any, text } });

  const updateContributor = (index: number, field: keyof Contributor, value: string) => {
    const next = contributors.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry);
    setContributors(next);
    setAnswer('contributors', contributorText(next), contributorText(next));
  };

  const validCurrent = question.key === 'contributors'
    ? contributors.some((entry) => entry.name.trim() && entry.role.trim())
    : 'freeText' in question && question.freeText
      ? Boolean(currentText.trim())
      : ['yes', 'no', 'not_sure'].includes(String(current));

  const next = () => { if (validCurrent && step < IP_QUESTIONS.length - 1) setStep((value) => value + 1); };
  const chooseOption = (value: 'yes' | 'no' | 'not_sure') => {
    setAnswer(question.key, value);
    window.setTimeout(() => { if (step < IP_QUESTIONS.length - 1) setStep((value) => value + 1); }, 220);
  };
  const previous = () => setStep((value) => Math.max(0, value - 1));

  return <div className="space-y-5" aria-live="polite">
    <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ug-teal">Question {step + 1} of {IP_QUESTIONS.length}</p><div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 sm:w-56"><motion.div className="h-full rounded-full bg-ug-teal" initial={false} animate={{ width: `${((step + 1) / IP_QUESTIONS.length) * 100}%` }} /></div></div><span className="text-xs font-semibold text-slate-400">{Math.round(((step + 1) / IP_QUESTIONS.length) * 100)}% complete</span></div>
    <AnimatePresence mode="wait">
      <motion.div key={question.key} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="min-h-[260px] rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-7">
        <p className="text-base font-bold leading-7 text-ug-navy sm:text-lg">{question.label}</p>
         {question.key === 'contributors' ? <div className="mt-6 space-y-3"><p className="text-xs leading-5 text-slate-500">Add every person who contributed and describe their role, for example: researcher, student, software developer, supervisor, or collaborator.</p>{contributors.map((entry, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={entry.name} onChange={(event) => updateContributor(index, 'name', event.target.value)} placeholder="Full name" className="disclosure-input" /><input value={entry.role} onChange={(event) => updateContributor(index, 'role', event.target.value)} placeholder="Role in the work" className="disclosure-input" /><button type="button" onClick={() => { const next = contributors.filter((_, entryIndex) => entryIndex !== index); const safe = next.length ? next : [{ name: '', role: '' }]; setContributors(safe); setAnswer('contributors', contributorText(safe), contributorText(safe)); }} disabled={contributors.length === 1} className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-400 transition hover:border-red-200 hover:text-red-600 disabled:opacity-30" aria-label="Remove contributor"><Trash2 size={16} /></button></div>)}<button type="button" onClick={() => setContributors((currentEntries) => [...currentEntries, { name: '', role: '' }])} className="inline-flex items-center gap-2 text-xs font-bold text-ug-teal hover:underline"><Plus size={15} /> Add another contributor</button></div> : !('freeText' in question && question.freeText) ? <div className="mt-7 grid gap-3 sm:grid-cols-3">{(['yes', 'no', 'not_sure'] as const).map((value) => <button key={value} type="button" onClick={() => chooseOption(value)} className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${current === value ? 'border-ug-navy bg-ug-navy text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-ug-teal hover:text-ug-navy'}`}>{value === 'not_sure' ? 'Not sure' : value.toUpperCase()}</button>)}</div> : <textarea value={currentText} onChange={(event) => setAnswer(question.key, event.target.value, event.target.value)} rows={6} className="disclosure-input mt-6 resize-none" placeholder="Type details..." />}
      </motion.div>
    </AnimatePresence>
    <div className="flex items-center justify-between gap-3"><button type="button" onClick={previous} disabled={step === 0} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-ug-teal disabled:opacity-30">Back</button>{step < IP_QUESTIONS.length - 1 && (question.key === 'contributors' || ('freeText' in question && question.freeText)) ? <button type="button" onClick={next} disabled={!validCurrent} className="rounded-xl bg-ug-navy px-5 py-2.5 text-xs font-bold text-white transition hover:bg-ug-teal disabled:cursor-not-allowed disabled:opacity-40">Continue</button> : step < IP_QUESTIONS.length - 1 ? <span className="text-right text-xs font-semibold text-slate-400">Select an answer to continue automatically.</span> : <span className="text-right text-xs font-semibold text-slate-400">All questions complete. Choose a route below.</span>}</div>
    <p className="text-xs leading-5 text-slate-400">“Not sure” recommends TTO/IP Office review. Opting out never grants legal clearance.</p>
  </div>;
};
