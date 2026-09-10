import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FileText, Loader2, LockKeyhole } from 'lucide-react';
import { IpDisclosureService, type IpDisclosureWorkspaceCase, type IpFinding } from '../../services/ipDisclosureService';
import { formatIpAnswer, IP_STATUS_LABELS } from '../../lib/ipSchemas';
import { isFinalReviewStatus } from '../../lib/ipWorkflow';
import { shortenUrl } from '../../lib/urlDisplay';
import { useToast } from '../../contexts/ToastContext';
import { useLocation, useNavigate } from 'react-router-dom';

const severityClass: Record<IpFinding['severity'], string> = {
  info: 'bg-slate-100 text-slate-600', low: 'bg-blue-50 text-blue-700', medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700',
};

const linkedBody = (body: string): React.ReactNode[] => body.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//i.test(part)
  ? <a key={index} href={part.replace(/[),.;]+$/, '')} target="_blank" rel="noreferrer" className="font-semibold text-ug-teal underline underline-offset-2">{shortenUrl(part.replace(/[),.;]+$/, ''))}</a>
  : <React.Fragment key={index}>{part}</React.Fragment>);

const FindingCard: React.FC<{ finding: IpFinding }> = ({ finding }) => (
  <article className="disclosure-finding border-b border-slate-200/70 py-3 last:border-b-0">
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${severityClass[finding.severity]}`}>{finding.severity}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{finding.author_role} · {finding.source_type}</span>
    </div>
    <h5 className="mt-2 text-sm font-bold text-ug-navy">{finding.title}</h5>
    <p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-slate-600">{linkedBody(finding.body)}</p>
  </article>
);

interface DisclosureWorkspaceProps { adminMode?: boolean; onCreateProject?: () => void; [key: string]: unknown }

export const ResearcherDisclosureWorkspace: React.FC<DisclosureWorkspaceProps> = ({ adminMode = false, onCreateProject }) => {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<IpDisclosureWorkspaceCase[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [adminFinding, setAdminFinding] = useState<Record<string, string>>({});
  const [decisionMessage, setDecisionMessage] = useState<Record<string, string>>({});
  const [timelineOpenId, setTimelineOpenId] = useState<string | null>(null);

  const detailId = adminMode && location.pathname.startsWith('/dashboard/admin/disclosures/') ? location.pathname.split('/').pop() : null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await IpDisclosureService.list();
      const visibleSummaries = adminMode ? summaries.filter((summary) => !isFinalReviewStatus(summary.status)) : summaries;
      const cases = await Promise.all(visibleSummaries.map(async (summary) => {
        try { return await IpDisclosureService.workspace(summary.id); } catch { return null; }
      }));
      const loaded = cases.filter((item): item is IpDisclosureWorkspaceCase => Boolean(item));
      setItems(loaded);
      if (!loaded.length && visibleSummaries.length) setError('Disclosure details could not be loaded. Please refresh and try again.');
    } catch (e: any) {
      setItems([]);
      setError(e.message || 'Disclosures could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const openFile = async (fileId: string) => {
    try {
      const url = await IpDisclosureService.signedFileUrl(fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) { showToast(e.message || 'File is not available yet.', 'error'); }
  };

  const approveFile = async (fileId: string, disclosureId: string) => {
    setActingId(disclosureId);
    try { await IpDisclosureService.approveFile(fileId); showToast('Evidence file approved for secure access.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Evidence approval failed.', 'error'); }
    finally { setActingId(null); }
  };

  const runAdminScreen = async (disclosureId: string) => {
    setActingId(disclosureId);
    try { await IpDisclosureService.aiScreen(disclosureId); showToast('AI authenticity screening completed.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'AI screening failed.', 'error'); }
    finally { setActingId(null); }
  };

  const saveAdminFinding = async (disclosureId: string) => {
    const body = adminFinding[disclosureId]?.trim();
    if (!body) return;
    setActingId(disclosureId);
    try { await IpDisclosureService.addFinding(disclosureId, { category: 'authenticity', title: 'Admin authenticity finding', body, visibility: 'shared_researcher', isPreliminary: false }); setAdminFinding((current) => ({ ...current, [disclosureId]: '' })); showToast('Admin finding shared with researcher.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Admin finding could not be saved.', 'error'); }
    finally { setActingId(null); }
  };

  const decideAdmin = async (disclosureId: string, decision: 'accept' | 'request_update' | 'decline') => {
    if (decision === 'request_update' && !decisionMessage[disclosureId]?.trim()) { showToast('Add a message explaining the requested update.', 'error'); return; }
    setActingId(disclosureId);
    try { await IpDisclosureService.adminDecision(disclosureId, decision, decisionMessage[disclosureId]?.trim()); showToast(decision === 'accept' ? 'Disclosure accepted.' : decision === 'decline' ? 'Disclosure declined.' : 'Update requested from researcher.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Admin action failed.', 'error'); }
    finally { setActingId(null); }
  };

  if (loading) return <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading disclosure records...</p>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>;
  if (!items.length) return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="bg-slate-50 px-6 py-10 text-center sm:px-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ug-navy text-white"><LockKeyhole size={24} /></div><p className="mt-5 text-lg font-bold text-ug-navy">Start your first project disclosure</p><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">Disclosures keep potentially valuable research private while the IP Office reviews ownership, prior publication, and supporting evidence.</p>{onCreateProject && <button onClick={onCreateProject} className="mt-6 rounded-xl bg-ug-navy px-5 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-ug-teal">Create project disclosure</button>}</div></div>;

  const visibleItems = detailId ? items.filter(({ disclosure }) => disclosure.id === detailId) : items;
  return <section className="disclosure-page space-y-5 antialiased">
    {detailId && <button onClick={() => navigate('/dashboard/admin/disclosures')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-ug-teal hover:text-ug-navy">← Back to Disclosure queue</button>}
    {visibleItems.map(({ disclosure, project, findings, links, files, events }) => {
      const expanded = Boolean(detailId) || expandedId === disclosure.id;
       const aiFindings = findings.filter((finding) => finding.source_type === 'ai');
      const humanFindings = findings.filter((finding) => finding.source_type !== 'ai');
      const shownEvents = events.slice(0, timelineOpenId === disclosure.id ? events.length : 5);
      return <article key={disclosure.id} className="overflow-hidden border-b border-slate-200/70 bg-white last:border-b-0">
        <button onClick={() => adminMode ? navigate(`/dashboard/admin/disclosures/${disclosure.id}`) : setExpandedId(expanded ? null : disclosure.id)} className="flex w-full items-center justify-between gap-3 px-2 py-4 text-left transition hover:bg-slate-50 sm:px-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-ug-navy px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">{IP_STATUS_LABELS[disclosure.status] ?? disclosure.status}</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{disclosure.route === 'tto_opt_out' ? 'TTO/IP opt-out' : 'TTO/IP Office route'}</span></div><h4 className="mt-2 truncate text-[15px] font-bold tracking-tight text-ug-navy sm:text-base">{project?.title || `Disclosure ${disclosure.id.slice(0, 8)}`}</h4><p className="mt-1 text-xs text-slate-400">Updated {new Date(disclosure.updated_at).toLocaleString()} · {findings.length} finding{findings.length === 1 ? '' : 's'}</p></div>
          {expanded ? <ChevronDown className="shrink-0 text-ug-teal" size={20} /> : <ChevronRight className="shrink-0 text-slate-400" size={20} />}
        </button>
        {expanded && <div className="disclosure-detail space-y-6 border-t border-slate-200/80 bg-slate-50/50 px-2 py-6 sm:px-5 sm:py-8">
          <div className="flex items-center justify-between"><div><p className="disclosure-eyebrow text-ug-teal">Disclosure case</p><h3 className="disclosure-title">{project?.title || disclosure.id.slice(0, 8)}</h3></div>{!detailId && <button onClick={() => setExpandedId(null)} className="text-xs font-bold text-slate-400 hover:text-ug-navy">Close</button>}</div>
           <div className="disclosure-section"><h5 className="disclosure-eyebrow">Project summary</h5><p className="disclosure-body mt-2">{project?.description || 'No project summary provided.'}</p><p className="disclosure-meta mt-2">{project?.department || 'Department not provided'} · {project?.research_area || 'Research area not provided'}</p></div>
          <div className="disclosure-section"><h5 className="disclosure-eyebrow">IP question answers</h5><dl className="mt-3 grid gap-x-6 gap-y-1 md:grid-cols-2">{Object.entries(disclosure.answers || {}).map(([key, value]) => <div key={key} className="border-b border-slate-100 py-3"><dt className="disclosure-label">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-5 text-ug-navy">{formatIpAnswer(value)}</dd></div>)}</dl></div>
          <div className="grid gap-6 lg:grid-cols-2"><div className="disclosure-section"><h5 className="disclosure-eyebrow">AI advisory findings</h5><p className="disclosure-note mt-1">Advisory only. This output does not grant legal clearance or a publication decision.</p><div className="mt-3">{aiFindings.length ? aiFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />) : <p className="disclosure-empty">AI screening has not produced findings yet.</p>}</div></div><div className="disclosure-section"><h5 className="disclosure-eyebrow">Human review findings</h5><div className="mt-3">{humanFindings.length ? humanFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />) : <p className="disclosure-empty">No human findings have been shared yet.</p>}</div></div></div>
          {adminMode && disclosure.route === 'tto_opt_out' && <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><h5 className="text-xs font-bold uppercase tracking-wide text-amber-800">Opt-out authenticity review</h5><p className="mt-1 text-xs leading-5 text-amber-700">Run the advisory check again or record an Admin finding for the researcher.</p><button disabled={actingId === disclosure.id} onClick={() => void runAdminScreen(disclosure.id)} className="mt-3 rounded-xl bg-ug-navy px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{actingId === disclosure.id ? 'Checking...' : 'Run AI authenticity check'}</button><textarea value={adminFinding[disclosure.id] || ''} onChange={(event) => setAdminFinding((current) => ({ ...current, [disclosure.id]: event.target.value }))} rows={3} placeholder="Admin authenticity finding..." className="mt-3 w-full rounded-xl border border-amber-200 bg-white p-3 text-xs" /><button disabled={actingId === disclosure.id || !adminFinding[disclosure.id]?.trim()} onClick={() => void saveAdminFinding(disclosure.id)} className="mt-2 rounded-xl border border-ug-teal px-3 py-2 text-xs font-bold text-ug-teal disabled:opacity-50">Save and share Admin finding</button></div>}
          {adminMode && ['submitted', 'tto_completed'].includes(disclosure.status) && <div className="rounded-2xl border border-slate-200 bg-white p-4"><h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">Admin disposition</h5><p className="mt-1 text-xs leading-5 text-slate-400">Accept the record, request a researcher update, or decline it. Every action is audited.</p><textarea value={decisionMessage[disclosure.id] || ''} onChange={(event) => setDecisionMessage((current) => ({ ...current, [disclosure.id]: event.target.value }))} rows={2} placeholder="Message or reason (required for update requests)..." className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-xs" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={actingId === disclosure.id} onClick={() => void decideAdmin(disclosure.id, 'accept')} className="rounded-xl bg-ug-teal px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Accept</button><button disabled={actingId === disclosure.id} onClick={() => void decideAdmin(disclosure.id, 'request_update')} className="rounded-xl border border-amber-300 px-4 py-2 text-xs font-bold text-amber-700 disabled:opacity-50">Request update</button><button disabled={actingId === disclosure.id} onClick={() => void decideAdmin(disclosure.id, 'decline')} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50">Decline</button></div></div>}
          <div className="grid gap-6 lg:grid-cols-2"><div className="disclosure-section"><div className="flex items-center justify-between"><h5 className="disclosure-eyebrow">Disclosure files</h5><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{files.length} file{files.length === 1 ? '' : 's'}</span></div><div className="mt-3 space-y-2">{files.length ? files.map((file) => <div key={file.id} className="flex items-center gap-3 border-b border-slate-100 py-3"><button onClick={() => void openFile(file.id)} disabled={file.scan_status !== 'clean'} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><FileText size={15} className="shrink-0 text-ug-teal" /><span className="truncate">{file.original_name}</span></button><span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">{file.scan_status}</span>{adminMode && file.scan_status !== 'clean' && <button disabled={actingId === disclosure.id} onClick={() => void approveFile(file.id, disclosure.id)} className="rounded-lg bg-ug-teal px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">Approve</button>}{file.scan_status === 'clean' && <ExternalLink size={13} className="shrink-0 text-ug-teal" />}</div>) : <p className="disclosure-empty">No files attached.</p>}</div></div>
            <div className="disclosure-section"><div className="flex items-center justify-between gap-3"><h5 className="disclosure-eyebrow">Review timeline</h5>{events.length > 5 && <button onClick={() => setTimelineOpenId(timelineOpenId === disclosure.id ? null : disclosure.id)} className="text-[11px] font-bold text-ug-teal hover:underline">{timelineOpenId === disclosure.id ? 'Show recent' : `View all ${events.length}`}</button>}</div><div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-2">{shownEvents.map((event) => <div key={event.id} className="relative border-l-2 border-ug-teal/30 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-ug-teal" /><p className="text-xs font-bold capitalize text-ug-navy">{event.action.replaceAll('_', ' ')}</p><p className="mt-0.5 text-[10px] text-slate-400">{new Date(event.created_at).toLocaleString()}</p></div>)}</div><div className="mt-4 border-t border-slate-100 pt-3"><p className="disclosure-eyebrow">Evidence links</p>{links.length ? <div className="mt-2 space-y-2">{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-semibold text-ug-teal hover:underline" title={link.url}>{link.title || shortenUrl(link.url)}</a>)}</div> : <p className="disclosure-empty mt-2">No external links added.</p>}</div></div></div>
        </div>}
      </article>;
    })}
  </section>;
};
