import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DisclosureQuestions, type AnswerMap } from './DisclosureQuestions';
import { DisclosurePolicy } from './DisclosurePolicy';
import { IpDisclosureService } from '../../services/ipDisclosureService';
import { IP_POLICY_VERSION, IP_SUBMISSION_POLICY_VERSION, missingIpAnswers } from '../../lib/ipSchemas';
import { useToast } from '../../contexts/ToastContext';

export const ProjectDisclosureWizard: React.FC<{
  disclosureId: string;
  onSubmitted: () => void;
}> = ({ disclosureId, onSubmitted }) => {
  const { showToast } = useToast();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [route, setRoute] = useState<'tto_review' | 'tto_opt_out'>('tto_review');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void IpDisclosureService.get(disclosureId).then((disclosure) => {
      if (disclosure.answers && Object.keys(disclosure.answers).length) setAnswers(disclosure.answers as AnswerMap);
    }).catch(() => {
      // A new draft has no saved answers yet.
    });
  }, [disclosureId]);

  const submit = async () => {
    const missing = missingIpAnswers(answers);
    if (missing.length) {
      showToast(
        `Answer all ${missing.length} remaining question${missing.length === 1 ? '' : 's'} before submitting. First: ${missing[0].slice(0, 80)}…`,
        'error',
      );
      return;
    }
    if (!accepted) {
      showToast('Accept the policy to submit.', 'error');
      return;
    }
    setSaving(true);
    try {
      await IpDisclosureService.updateAnswers(disclosureId, answers);
      const disclosure = await IpDisclosureService.submit(disclosureId, {
        route,
        policyVersion: IP_POLICY_VERSION,
        submissionPolicyVersion: IP_SUBMISSION_POLICY_VERSION,
      });
      showToast(
        disclosure.status === 'tto_review'
          ? 'Disclosure sent to the TTO/IP Office for review.'
          : 'Disclosure submitted for Admin review.',
        'success',
      );
      onSubmitted();
    } catch (e: any) {
      showToast(e.message || 'Submission failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
       <div className="disclosure-page space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div>
        <h3 className="text-base font-bold text-ug-navy">IP questions & route</h3>
        <p className="text-xs text-gray-400 mt-1">Answers are stored privately. Submission freezes a versioned record.</p>
      </div>
      <DisclosureQuestions answers={answers} onChange={setAnswers} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button type="button" onClick={() => setRoute('tto_review')} className={`rounded-2xl border p-4 text-left transition ${route === 'tto_review' ? 'border-ug-teal bg-teal-50/60' : 'border-gray-200 bg-white'}`}>
          <p className="text-sm font-bold text-ug-navy">Send to TTO/IP Office (recommended)</p>
          <p className="text-xs text-gray-500 mt-1">For possible IP, prior disclosure, ownership, or sponsor issues.</p>
        </button>
        <button type="button" onClick={() => setRoute('tto_opt_out')} className={`rounded-2xl border p-4 text-left transition ${route === 'tto_opt_out' ? 'border-ug-teal bg-teal-50/60' : 'border-gray-200 bg-white'}`}>
          <p className="text-sm font-bold text-ug-navy">Opt out of TTO review</p>
          <p className="text-xs text-gray-500 mt-1">Admin + AI checks still apply. No legal clearance implied.</p>
        </button>
      </div>
      <DisclosurePolicy accepted={accepted} onAccept={setAccepted} />
      <button onClick={submit} disabled={saving} className="w-full rounded-2xl bg-ug-navy py-3 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Loader2 size={16} className="animate-spin" />} Submit disclosure
      </button>
    </div>
  );
};
