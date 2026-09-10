import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { IpDisclosureService, type IpDisclosureWorkspaceCase, type IpDecision } from '../../services/ipDisclosureService';
import { shortenUrl } from '../../lib/urlDisplay';
import { useToast } from '../../contexts/ToastContext';

const decisions: Array<{ value: IpDecision['decision']; label: string; tone: string }> = [
  { value: 'publish', label: 'Accept and publish', tone: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  { value: 'restrict', label: 'Accept internally', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
  { value: 'confidential_hold', label: 'Keep confidential', tone: 'bg-amber-500 text-white hover:bg-amber-600' },
  { value: 'request_information', label: 'Request researcher review', tone: 'bg-violet-600 text-white hover:bg-violet-700' },
  { value: 'reject', label: 'Reject', tone: 'bg-red-600 text-white hover:bg-red-700' },
];

const severityClass: Record<string, string> = {
  info: 'bg-slate-100 text-slate-600', low: 'bg-blue-50 text-blue-700', medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700',
};

export const PublicationDecision: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<IpDisclosureWorkspaceCase[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = (await IpDisclosureService.list()).filter((d) => d.status === 'super_admin_review');
      const workspaces = await Promise.all(list.map(async (d) => {
        try { return await IpDisclosureService.workspace(d.id); } catch { return null; }
      }));
      setRecords(workspaces.filter((record): record is IpDisclosureWorkspaceCase => Boolean(record)));
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const decide = async (record: IpDisclosureWorkspaceCase, decision: IpDecision['decision']) => {
    const reason = reasons[record.disclosure.id]?.trim();
    if (!reason) { showToast('A written finding or review message is required.', 'error'); return; }
    setActingId(record.disclosure.id);
    try {
      await IpDisclosureService.decidePublication(record.disclosure.id, { decision, reason });
      showToast(`Decision recorded for ${record.project?.title || 'the disclosure'}.`, 'success');
      await load();
    } catch (e: any) { showToast(e.message || 'Decision failed.', 'error'); }
    finally { setActingId(null); }
  };

  const approveFile = async (fileId: string, disclosureId: string) => {
    setActingId(disclosureId);
    try { await IpDisclosureService.approveFile(fileId); showToast('Evidence approved for secure access.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Evidence approval failed.', 'error'); }
    finally { setActingId(null); }
  };

  const openFile = async (fileId: string) => {
    try { window.open(await IpDisclosureService.signedFileUrl(fileId), '_blank', 'noopener,noreferrer'); }
    catch (e: any) { showToast(e.message || 'File is not available yet.', 'error'); }
  };

  if (loading) return <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading final review...</p>;

  return <section className="disclosure-page space-y-5">
    <div><h3 className="disclosure-title text-lg">Super Admin publication decisions</h3><p className="disclosure-note mt-1">Each project below requires a recorded human finding or review message before a final decision.</p></div>
    {!records.length && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">No projects are awaiting final decision.</p>}
    {records.map((record) => {
      const { disclosure, project, findings, files, events, links } = record;
      const aiFindings = findings.filter((finding) => finding.source_type === 'ai');
      const ttoFindings = findings.filter((finding) => finding.source_type !== 'ai');
      return <article key={disclosure.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-5 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="disclosure-eyebrow text-ug-teal">Final publication review</p><h4 className="mt-1 text-lg font-extrabold tracking-tight text-ug-navy sm:text-xl">{project?.title || `Disclosure ${disclosure.id.slice(0, 8)}`}</h4><p className="mt-1 text-xs text-slate-400">{project?.department || 'Department not provided'} · {project?.research_area || 'Research area not provided'}</p></div><span className="rounded-full bg-ug-navy px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Super Admin review</span></div><p className="disclosure-body mt-4">{project?.description || 'No project summary provided.'}</p></header>
        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5"><section><div className="flex items-center justify-between"><h5 className="disclosure-eyebrow">AI advisory findings</h5><span className="disclosure-note">{aiFindings.length} finding{aiFindings.length === 1 ? '' : 's'}</span></div><p className="disclosure-note mt-1">Advisory only. AI output does not grant legal clearance.</p><div className="mt-3 divide-y divide-slate-100">{aiFindings.length ? aiFindings.map((finding) => <div key={finding.id} className="py-3 first:pt-0"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${severityClass[finding.severity] || severityClass.info}`}>{finding.severity}</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{finding.category}</span></div><p className="mt-2 text-sm font-bold text-ug-navy">{finding.title}</p><p className="mt-1 whitespace-pre-line text-[13px] leading-6 text-slate-600">{finding.body.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//i.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer" className="font-semibold text-ug-teal underline">{shortenUrl(part)}</a> : <React.Fragment key={index}>{part}</React.Fragment>)}</p></div>) : <p className="disclosure-empty">No AI findings are attached to this review.</p>}</div></section>
            <section className="border-t border-slate-200 pt-4"><div className="flex items-center justify-between"><h5 className="disclosure-eyebrow">TTO / IP Office findings</h5><span className="disclosure-note">{ttoFindings.length} finding{ttoFindings.length === 1 ? '' : 's'}</span></div><p className="disclosure-note mt-1">Human specialist findings inform the final publication decision.</p><div className="mt-3 divide-y divide-slate-100">{ttoFindings.length ? ttoFindings.map((finding) => <div key={finding.id} className="py-3 first:pt-0"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${severityClass[finding.severity] || severityClass.info}`}>{finding.severity}</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{finding.author_role}</span></div><p className="mt-2 text-sm font-bold text-ug-navy">{finding.title}</p><p className="mt-1 whitespace-pre-line text-[13px] leading-6 text-slate-600">{finding.body}</p></div>) : <p className="disclosure-empty">No TTO/IP findings have been recorded yet.</p>}</div></section>
            <section className="border-t border-slate-200 pt-4"><h5 className="disclosure-eyebrow">Disclosure files</h5><div className="mt-2 space-y-1">{files.length ? files.map((file) => <div key={file.id} className="flex items-center gap-3 border-b border-slate-100 py-3"><button disabled={file.scan_status !== 'clean'} onClick={() => void openFile(file.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><FileText size={15} className="shrink-0 text-ug-teal" /><span className="truncate">{file.original_name}</span></button><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{file.scan_status}</span>{file.scan_status !== 'clean' && <button disabled={actingId === disclosure.id} onClick={() => void approveFile(file.id, disclosure.id)} className="rounded-lg bg-ug-teal px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">Approve</button>}{file.scan_status === 'clean' && <ExternalLink size={13} className="shrink-0 text-ug-teal" />}</div>) : <p className="disclosure-empty">No files attached.</p>}</div></section>
          </div>
          <aside className="space-y-5"><section><div className="flex items-center justify-between"><h5 className="disclosure-eyebrow">Review timeline</h5><span className="disclosure-note">{events.length} event{events.length === 1 ? '' : 's'}</span></div><div className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-2">{events.slice(0, 8).map((event) => <div key={event.id} className="relative border-l-2 border-ug-teal/30 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-ug-teal" /><p className="text-xs font-bold capitalize text-ug-navy">{event.action.replaceAll('_', ' ')}</p><p className="mt-0.5 text-[10px] text-slate-400">{new Date(event.created_at).toLocaleString()}</p></div>)}</div><div className="mt-3 border-t border-slate-100 pt-3">{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" title={link.url} className="block truncate text-xs font-semibold text-ug-teal hover:underline">{link.title || shortenUrl(link.url)}</a>)}</div></section><section className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h5 className="disclosure-eyebrow text-ug-navy">Final decision</h5><textarea value={reasons[disclosure.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [disclosure.id]: event.target.value }))} rows={4} placeholder="Record the finding or review message shared with the researcher..." className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] leading-5 text-slate-700 outline-none transition focus:border-ug-teal focus:ring-2 focus:ring-ug-teal/10" /><div className="mt-3 flex flex-wrap gap-2">{decisions.map((option) => <button key={option.value} disabled={actingId === disclosure.id} onClick={() => void decide(record, option.value)} className={`rounded-xl px-3 py-2 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${option.tone}`}>{option.label}</button>)}</div></section></aside>
        </div>
      </article>;
    })}
  </section>;
};
