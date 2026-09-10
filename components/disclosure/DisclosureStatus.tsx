import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, ShieldAlert } from 'lucide-react';
import { IpDisclosure, IpDisclosureService } from '../../services/ipDisclosureService';

const labels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  admin_review: 'Admin review',
  ai_screening: 'Screening in progress',
  tto_review: 'TTO/IP Office review',
  tto_completed: 'TTO/IP Office review completed',
  accepted: 'Accepted for publication review',
  researcher_action_required: 'Action required',
  super_admin_review: 'Final publication review',
  published: 'Published',
  restricted: 'Restricted',
  confidential_hold: 'Confidential hold',
  rejected: 'Rejected',
};

export const DisclosureStatus: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const [disclosures, setDisclosures] = useState<IpDisclosure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    IpDisclosureService.list()
      .then((items) => { if (!cancelled) setDisclosures(items); })
      .catch(() => { if (!cancelled) setDisclosures([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={14} className="animate-spin" /> Loading disclosure status</div>;
  if (!disclosures.length) return null;

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-ug-navy flex items-center gap-2"><ClipboardCheck size={18} className="text-ug-teal" /> IP disclosures</h3>
          <p className="text-xs text-gray-400 mt-1">Track review status. AI findings are advisory and do not provide legal clearance.</p>
        </div>
        <ShieldAlert size={18} className="text-amber-500 shrink-0" />
      </div>
      <div className="space-y-2">
        {disclosures.map((disclosure) => (
          <div key={disclosure.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-xs font-semibold text-gray-600">Project disclosure</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-ug-teal">{labels[disclosure.status] || disclosure.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
