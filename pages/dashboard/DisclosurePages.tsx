import React, { useEffect, useState } from 'react';
import { FileSearch, KeyRound, Loader2, LockKeyhole, Scale } from 'lucide-react';
import { ResearcherDisclosureWorkspace } from '../../components/disclosure/ResearcherDisclosureWorkspace';
import { ProjectDisclosureWizard } from '../../components/disclosure/ProjectDisclosureWizard';
import { TtoQueue } from '../../components/tto/TtoQueue';
import { PublicationDecision } from '../../components/superadmin/PublicationDecision';
import { hasDashboardCapability, type DashboardCapability } from '../../lib/dashboardRouting';
import { IpDisclosureService, type IpAccessRequest } from '../../services/ipDisclosureService';
import { useToast } from '../../contexts/ToastContext';
import { useLocation, useNavigate } from 'react-router-dom';

const PageFrame: React.FC<{ title: string; description: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ title, description, icon: Icon, action, children }) => (
    <div className="disclosure-page animate-fade-in space-y-5 antialiased">
    <div className="rounded-xl bg-ug-navy px-4 py-3 text-white shadow-md sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-ug-teal/20 p-2 text-ug-teal"><Icon size={18} /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
          <p className="mt-0.5 max-w-3xl text-[11px] leading-relaxed text-white/60 sm:text-xs">{description}</p>
        </div>
        {action}
      </div>
    </div>
    {children}
  </div>
);

const GuardedPage: React.FC<{ role: unknown; capability: DashboardCapability; children: React.ReactNode }> = ({ role, capability, children }) => {
  if (hasDashboardCapability(role, capability)) return <>{children}</>;
  return (
    <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <LockKeyhole className="mx-auto text-gray-300" size={32} />
      <h1 className="mt-4 text-lg font-bold text-ug-navy">Restricted workspace</h1>
      <p className="mt-2 text-sm text-gray-500">Your current role does not have access to this review stage.</p>
    </div>
  );
};

export const AdminDisclosuresPage: React.FC<{ role: unknown }> = ({ role }) => (
  <GuardedPage role={role} capability="reviewDisclosure">
    <PageFrame title="Disclosure" description="Review every project disclosure, including TTO/IP Office cases and TTO/IP opt-outs, in one complete record." icon={FileSearch}>
      <ResearcherDisclosureWorkspace adminMode />
      {hasDashboardCapability(role, 'decidePublication') && <PublicationDecision />}
    </PageFrame>
  </GuardedPage>
);

export const ResearcherDisclosuresPage: React.FC<{ role: unknown; onCreateProject?: () => void }> = ({ role, onCreateProject }) => (
  <GuardedPage role={role} capability="useWorkspace">
    <PageFrame title="Project disclosures" description="Prepare, submit, and track the intellectual-property review for your research projects." icon={LockKeyhole} action={onCreateProject ? <button onClick={onCreateProject} className="shrink-0 rounded-xl bg-ug-teal px-3.5 py-2.5 text-xs font-bold text-ug-navy shadow-sm transition hover:bg-white">New disclosure</button> : undefined}>
      <ResearcherDisclosureWorkspace onCreateProject={onCreateProject} />
    </PageFrame>
  </GuardedPage>
);

export const IpQuestionsPage: React.FC<{ role: unknown }> = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const disclosureId = location.pathname.split('/').at(-2);
  return <GuardedPage role={role} capability="useWorkspace">
    <PageFrame title="IP questions" description="Answer each question before your disclosure is submitted for institutional review." icon={LockKeyhole}>
      {disclosureId ? <><button onClick={() => navigate('/dashboard/disclosures')} className="mb-1 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-ug-teal hover:text-ug-navy">← Back to disclosures</button><ProjectDisclosureWizard disclosureId={decodeURIComponent(disclosureId)} onSubmitted={() => navigate('/dashboard/disclosures')} /></> : <p className="text-sm text-slate-500">Disclosure not found.</p>}
    </PageFrame>
  </GuardedPage>;
};


export const TtoDisclosuresPage: React.FC<{ role: unknown }> = ({ role }) => (
  <GuardedPage role={role} capability="reviewTto">
    <PageFrame title="TTO / IP Office" description="Record specialist findings and share evidence for the final human decision." icon={Scale}>
      <TtoQueue />
    </PageFrame>
  </GuardedPage>
);

export const AccessRequestsPage: React.FC<{ role: unknown }> = ({ role }) => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<IpAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const reviewer = hasDashboardCapability(role, 'reviewTto');
  const load = async () => {
    setLoading(true);
    try { setRequests(await IpDisclosureService.listAccessRequests()); }
    catch (error: any) { showToast(error.message || 'Access requests could not be loaded.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const decide = async (request: IpAccessRequest, decision: 'approved' | 'denied') => {
    try {
      await IpDisclosureService.decideAccessRequest(request.id, decision);
      showToast(`Access request ${decision}.`, 'success');
      await load();
    } catch (error: any) { showToast(error.message || 'Decision failed.', 'error'); }
  };
  return (
    <GuardedPage role={role} capability="useWorkspace">
      <PageFrame title="Access Requests" description="Track requests for controlled access to confidential disclosure materials." icon={KeyRound}>
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {loading ? <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={14} className="animate-spin" /> Loading access requests...</p> : requests.length === 0 ? <p className="text-sm text-gray-400">No access requests are visible to your account.</p> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-ug-navy">Disclosure {request.disclosure_id.slice(0, 8)}</p><p className="mt-1 text-xs text-gray-500">{request.purpose}</p><p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ug-teal">{request.status}</p></div>{reviewer && request.status === 'pending' && <div className="flex gap-2"><button onClick={() => decide(request, 'approved')} className="rounded-xl bg-ug-teal px-4 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => decide(request, 'denied')} className="rounded-xl bg-ug-navy px-4 py-2 text-xs font-bold text-white">Deny</button></div>}</div></article>)}</div>}
        </section>
      </PageFrame>
    </GuardedPage>
  );
};
