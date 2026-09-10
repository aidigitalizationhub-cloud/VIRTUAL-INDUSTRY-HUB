import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { IpDisclosureService, type IpDisclosure, type IpFinding } from '../../services/ipDisclosureService';
import { useToast } from '../../contexts/ToastContext';

export const DisclosureAdminReview: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<IpDisclosure[]>([]);
  const [selected, setSelected] = useState<IpDisclosure | null>(null);
  const [findings, setFindings] = useState<IpFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [returnMsg, setReturnMsg] = useState('');
  const [findingBody, setFindingBody] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await IpDisclosureService.list();
      setItems(list.filter((d) => ['submitted', 'admin_review', 'ai_screening'].includes(d.status)));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const open = async (d: IpDisclosure) => {
    setSelected(d);
    try {
      setFindings(await IpDisclosureService.findings(d.id));
    } catch {
      setFindings([]);
    }
  };

  const act = async (fn: () => Promise<any>, ok: string) => {
    if (!selected) return;
    setActing(true);
    try {
      await fn();
      showToast(ok, 'success');
      await load();
      const fresh = await IpDisclosureService.get(selected.id);
      setSelected(fresh);
      setFindings(await IpDisclosureService.findings(selected.id));
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading admin queue…</p>;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-ug-navy flex items-center gap-2"><ShieldCheck size={18} className="text-ug-teal" /> Admin disclosure queue</h3>
      {items.length === 0 && <p className="text-xs text-gray-400">No disclosures awaiting admin review.</p>}
      <div className="grid md:grid-cols-2 gap-3">
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <button onClick={() => open(d)} className={`w-full text-left rounded-xl border px-3 py-2 text-xs ${selected?.id === d.id ? 'border-ug-teal bg-teal-50/50' : 'border-gray-200'}`}>
                <span className="font-bold text-ug-navy">{d.status}</span>
                <span className="block text-gray-400">{d.id.slice(0, 8)} · v{d.version}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-bold text-ug-navy">Case {selected.id.slice(0, 8)} · {selected.status}</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={acting} onClick={() => act(() => IpDisclosureService.adminAccept(selected.id), 'Accepted and sent to screening')} className="rounded-xl bg-ug-navy px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Accept</button>
              <button disabled={acting} onClick={() => act(() => IpDisclosureService.aiScreen(selected.id), 'AI screening queued')} className="rounded-xl bg-white border px-3 py-2 text-xs font-bold disabled:opacity-50">Run AI screen</button>
              <button disabled={acting} onClick={() => act(() => IpDisclosureService.sendToTto(selected.id), 'Sent to TTO')} className="rounded-xl bg-white border px-3 py-2 text-xs font-bold disabled:opacity-50">Send to TTO</button>
            </div>
            <textarea value={returnMsg} onChange={(e) => setReturnMsg(e.target.value)} rows={2} placeholder="Return message for researcher…" className="w-full rounded-xl border p-2 text-xs" />
            <button disabled={acting || !returnMsg.trim()} onClick={() => act(() => IpDisclosureService.adminReturn(selected.id, returnMsg), 'Returned to researcher')} className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50">Return to researcher</button>
            <textarea value={findingBody} onChange={(e) => setFindingBody(e.target.value)} rows={2} placeholder="Add admin finding…" className="w-full rounded-xl border p-2 text-xs" />
            <button disabled={acting || !findingBody.trim()} onClick={() => act(() => IpDisclosureService.addFinding(selected.id, { category: 'admin', title: 'Admin finding', body: findingBody, visibility: 'internal' }), 'Finding added')} className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50">Add finding</button>
            <div className="space-y-1">
              {findings.map((f) => (
                <div key={f.id} className="rounded-xl bg-white border p-2 text-xs">
                  <p className="font-bold">{f.title} · {f.visibility}</p>
                  <p className="text-gray-500 line-clamp-3">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
