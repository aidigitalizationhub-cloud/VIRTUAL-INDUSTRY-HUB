import React from 'react';
import { IP_POLICY_TEXT, IP_POLICY_VERSION, IP_SUBMISSION_POLICY_VERSION } from '../../lib/ipSchemas';

export const DisclosurePolicy: React.FC<{
  accepted: boolean;
  onAccept: (v: boolean) => void;
}> = ({ accepted, onAccept }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5 space-y-3">
    <p className="text-[11px] font-bold tracking-widest text-amber-700">TERMS & SUBMISSION POLICY</p>
    <p className="text-sm text-gray-700 leading-relaxed">{IP_POLICY_TEXT}</p>
    <p className="text-[11px] text-gray-500">Policy {IP_POLICY_VERSION} · Submission {IP_SUBMISSION_POLICY_VERSION} · AI output is advisory only.</p>
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={accepted} onChange={(e) => onAccept(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-600" />
      <span className="text-sm font-medium text-ug-navy">I have read and accept the policy above.</span>
    </label>
  </div>
);
