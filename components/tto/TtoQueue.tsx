import React, { useEffect, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { IpDisclosureService, type IpDisclosure } from '../../services/ipDisclosureService';
import { TtoReviewPanel } from './TtoReviewPanel';
import { useLocation, useNavigate } from 'react-router-dom';

export const TtoQueue: React.FC = () => {
  const [items, setItems] = useState<IpDisclosure[]>([]);
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const detailId = location.pathname.match(/^\/dashboard\/tto\/disclosures\/([^/]+)$/)?.[1];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const disclosures = await IpDisclosureService.list();
      setItems(disclosures);
      const workspaces = await Promise.all(disclosures.map(async (disclosure) => {
        try {
          const workspace = await IpDisclosureService.workspace(disclosure.id);
          return workspace.project?.title ? [disclosure.id, workspace.project.title] as const : null;
        } catch { return null; }
      }));
      setProjectTitles(Object.fromEntries(workspaces.filter((entry): entry is readonly [string, string] => Boolean(entry))));
    } catch (loadError: any) {
      setItems([]);
      setError(loadError?.message || 'The TTO queue could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!detailId) void load(); }, [detailId]);

  if (detailId) return <section className="disclosure-page space-y-5">
    <button onClick={() => navigate('/dashboard/tto/disclosures')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-ug-teal hover:text-ug-navy">← Back to TTO/IP queue</button>
    <TtoReviewPanel disclosureId={decodeURIComponent(detailId)} onCompleted={() => navigate('/dashboard/tto/disclosures')} />
  </section>;

  if (loading) return <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading TTO queue...</p>;

  return <section className="disclosure-page space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div><h3 className="disclosure-title text-lg">TTO / IP Office queue</h3><p className="disclosure-note mt-1">Open a project below to review its complete disclosure record, findings, files, and timeline.</p></div>
    {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}
    {!error && items.length === 0 && <p className="disclosure-empty">No TTO cases yet.</p>}
    <div className="space-y-2">
      {items.map((disclosure) => {
        return <button key={disclosure.id} onClick={() => navigate(`/dashboard/tto/disclosures/${encodeURIComponent(disclosure.id)}`)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-ug-teal/50 hover:bg-slate-50">
          <span className="min-w-0"><span className="block truncate text-sm font-bold tracking-tight text-ug-navy sm:text-[15px]">{projectTitles[disclosure.id] || `Disclosure ${disclosure.id.slice(0, 8)}`}</span><span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{disclosure.status.replaceAll('_', ' ')}</span></span>
          <ChevronRight className="shrink-0 text-slate-400" size={20} />
        </button>;
      })}
    </div>
  </section>;
};
