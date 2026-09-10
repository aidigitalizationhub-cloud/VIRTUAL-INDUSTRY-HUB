import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { IpDisclosureService, type IpDisclosureWorkspaceCase, type IpFinding, type IpLink } from '../../services/ipDisclosureService';
import { shortenUrl } from '../../lib/urlDisplay';
import { formatIpAnswer } from '../../lib/ipSchemas';
import { useToast } from '../../contexts/ToastContext';

const linkedBody = (body: string): React.ReactNode[] => body.split(/(https?:\/\/[^\s]+)/g).map((part, index) => /^https?:\/\//i.test(part)
  ? <a key={index} href={part.replace(/[),.;]+$/, '')} target="_blank" rel="noreferrer" className="font-semibold text-ug-teal underline underline-offset-2">{shortenUrl(part.replace(/[),.;]+$/, ''))}</a>
  : <React.Fragment key={index}>{part}</React.Fragment>);

export const TtoReviewPanel: React.FC<{ disclosureId: string; onCompleted?: () => void }> = ({ disclosureId, onCompleted }) => {
  const { showToast } = useToast();
  const [findings, setFindings] = useState<IpFinding[]>([]);
  const [links, setLinks] = useState<IpLink[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [caseData, setCaseData] = useState<IpDisclosureWorkspaceCase | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = async () => {
    try {
      const workspace = await IpDisclosureService.workspace(disclosureId);
      setCaseData(workspace); setFindings(workspace.findings); setLinks(workspace.links);
    } catch { setFindings([]); setLinks([]); }
  };

  useEffect(() => { void load(); }, [disclosureId]);

  const share = async (finding: IpFinding) => {
    try { await IpDisclosureService.shareFinding(disclosureId, finding.id, 'shared_researcher'); showToast('Finding shared with the researcher.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Share failed', 'error'); }
  };

  const complete = async () => {
    setCompleting(true);
    try { await IpDisclosureService.sendToSuperAdmin(disclosureId); showToast('TTO review completed and queued for Super Admin.', 'success'); onCompleted?.(); }
    catch (e: any) { showToast(e.message || 'TTO review could not be completed.', 'error'); }
    finally { setCompleting(false); }
  };

  const approveFile = async (fileId: string) => {
    try { await IpDisclosureService.approveFile(fileId); showToast('Evidence file approved for secure access.', 'success'); await load(); }
    catch (e: any) { showToast(e.message || 'Evidence approval failed.', 'error'); }
  };

  const addFinding = async () => {
    if (!body.trim()) { showToast('Enter a finding before saving.', 'error'); return; }
    try { await IpDisclosureService.addFinding(disclosureId, { category: 'tto', title: title.trim() || 'TTO finding', body: body.trim(), visibility: 'internal' }); setTitle(''); setBody(''); await load(); showToast('TTO finding saved.', 'success'); }
    catch (e: any) { showToast(e.message || 'Finding could not be saved.', 'error'); }
  };

  const addLink = async () => {
    if (!url.trim()) return;
    try { await IpDisclosureService.addLink(disclosureId, { url: url.trim() }); setUrl(''); await load(); showToast('Evidence link added.', 'success'); }
    catch (e: any) { showToast(e.message || 'Link could not be added.', 'error'); }
  };

  const isForwarded = caseData?.disclosure.status === 'super_admin_review';
  return <div className="disclosure-page space-y-6 rounded-2xl bg-slate-50 p-5 sm:p-6">
    <header><p className="disclosure-eyebrow text-ug-teal">TTO / IP Office review · {disclosureId.slice(0, 8)}</p><h4 className="disclosure-title mt-1">{caseData?.project?.title || 'Loading project...'}</h4><p className="disclosure-body mt-2">{caseData?.project?.description || 'Project details unavailable.'}</p></header>
    <section className="disclosure-section tto-answer-grid"><h5 className="disclosure-eyebrow">IP question answers</h5><div className="mt-4 grid gap-x-8 gap-y-1 md:grid-cols-2">{Object.entries(caseData?.disclosure.answers || {}).map(([key, value]) => <div key={key} className="border-b border-slate-200 py-4"><span className="answer-label">{key.replaceAll('_', ' ')}</span><p className="answer-value mt-1 whitespace-pre-line">{formatIpAnswer(value)}</p></div>)}</div></section>
    <section className="disclosure-section"><h5 className="disclosure-eyebrow text-ug-teal">AI advisory findings</h5><p className="disclosure-note mt-1">Advisory only. AI output does not grant legal clearance.</p><div className="mt-3 divide-y divide-slate-200">{findings.filter((finding) => finding.source_type === 'ai').map((finding) => <article key={finding.id} className="py-4"><p className="text-sm font-bold text-ug-navy">{finding.title} <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">{finding.severity}</span></p><p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-slate-600">{linkedBody(finding.body)}</p></article>)}{!findings.some((finding) => finding.source_type === 'ai') && <p className="disclosure-empty mt-3">AI screening is pending.</p>}</div></section>
    <section className="disclosure-section"><div className="flex items-center justify-between"><h5 className="disclosure-eyebrow">Confidential files</h5><span className="disclosure-note">{caseData?.files.length || 0} file{caseData?.files.length === 1 ? '' : 's'}</span></div><div className="mt-3 space-y-1">{(caseData?.files || []).map((file) => <div key={file.id} className="flex items-center gap-3 border-b border-slate-200 py-3"><button disabled={file.scan_status !== 'clean'} onClick={async () => { try { window.open(await IpDisclosureService.signedFileUrl(file.id), '_blank', 'noopener,noreferrer'); } catch (e: any) { showToast(e.message || 'File is not available yet.', 'error'); } }} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"><FileText size={16} className="shrink-0 text-ug-teal" /><span className="truncate">{file.original_name}</span></button><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{file.scan_status}</span>{file.scan_status !== 'clean' && <button onClick={() => void approveFile(file.id)} className="rounded-lg bg-ug-teal px-2.5 py-1.5 text-[10px] font-bold text-white">Approve</button>}{file.scan_status === 'clean' && <ExternalLink size={14} className="shrink-0 text-ug-teal" />}</div>)}{!caseData?.files.length && <p className="disclosure-empty">No files attached.</p>}</div></section>
    <section className="disclosure-section"><h5 className="disclosure-eyebrow">Record a TTO/IP Office finding</h5><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finding title" className="disclosure-input mt-3" /><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Finding, recommendation, confidentiality marking, or review note..." className="disclosure-input mt-2" /><button onClick={() => void addFinding()} className="mt-2 rounded-xl bg-ug-navy px-4 py-2.5 text-xs font-bold text-white">Save TTO finding</button><div className="mt-5 flex gap-2"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https:// supporting evidence link" className="disclosure-input min-w-0 flex-1" /><button onClick={() => void addLink()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-ug-navy">Add link</button></div><div className="mt-3 space-y-2">{findings.filter((finding) => finding.source_type !== 'ai').map((finding) => <div key={finding.id} className="border-b border-slate-200 py-3"><p className="text-sm font-bold text-ug-navy">{finding.title}</p><p className="mt-1 text-[13px] leading-6 text-slate-600">{finding.body}</p><button onClick={() => void share(finding)} className="mt-2 text-xs font-bold text-ug-teal hover:underline">Share with researcher</button></div>)}{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" title={link.url} className="block truncate text-xs font-semibold text-ug-teal hover:underline">{link.title || shortenUrl(link.url)}</a>)}</div></section>
    {isForwarded ? <p className="border-t border-slate-200 pt-4 text-right text-xs font-semibold text-ug-teal">Sent to Super Admin for final decision.</p> : <div className="flex justify-end border-t border-slate-200 pt-4"><button disabled={completing} onClick={() => void complete()} className="rounded-xl bg-ug-teal px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{completing ? 'Sending...' : 'Complete review → queue Super Admin'}</button></div>}
  </div>;
};
