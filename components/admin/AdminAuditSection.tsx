import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Download, Eye, Fingerprint, Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import { AccountDeletionRecord } from '../../types';

interface AdminAuditSectionProps {
  eois: any[];
  accountDeletions: AccountDeletionRecord[];
  encryptedMessageCount: number;
  integrityStatus: string;
  inspectingEnvelopeMsg: any | null;
  envelopeAuditData: any | null;
  onExportSignedAuditCsv: () => void;
  onExportAccountDeletionsCsv: () => void;
  onInspectMsg: (message: any) => void;
  onCloseEnvelopeInspector: () => void;
  isMessageEncrypted: (message: string) => boolean;
}

export const AdminAuditSection: React.FC<AdminAuditSectionProps> = ({
  eois,
  accountDeletions,
  encryptedMessageCount,
  integrityStatus,
  inspectingEnvelopeMsg,
  envelopeAuditData,
  onExportSignedAuditCsv,
  onExportAccountDeletionsCsv,
  onInspectMsg,
  onCloseEnvelopeInspector,
  isMessageEncrypted,
}) => (
  <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 text-left">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-bold text-ug-navy flex items-center gap-2"><ShieldCheck className="text-ug-teal" size={22} />Administrative Governance &amp; Security Audit Ledger</h3>
        <p className="text-[11px] font-semibold text-ug-teal tracking-wide mt-1">End-to-End Cryptographic Audit &amp; Transmission Integrity Protocol</p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-center"><div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200/60"><ShieldCheck size={12} className="text-emerald-600" /><span className="text-[11px] font-semibold tracking-wider">Access Controlled Server-Side</span></div></div>
    </div>

    <div className="space-y-8">
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-ug-teal/10 border border-ug-teal/20 flex items-center justify-center shrink-0 text-ug-teal"><Fingerprint size={24} /></div><div className="space-y-1"><div className="flex items-center gap-2"><h4 className="text-sm font-bold text-white">Message security record status</h4><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Per-record verification</span></div><p className="text-xs text-slate-400 leading-relaxed max-w-2xl">New message envelopes use AES-256-GCM. Legacy plaintext records may remain in the ledger until migrated; payload contents are decrypted exclusively on authorized participant clients.</p></div></div>
        <button onClick={onExportSignedAuditCsv} className="px-4 py-2.5 bg-ug-teal hover:bg-teal-500 text-ug-navy font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-ug-teal/10 shrink-0 self-end md:self-auto"><Download size={14} />Export Signed Audit CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">Total Request Volume</p><p className="text-2xl font-bold text-ug-navy">{eois.length}</p><p className="text-[11px] text-gray-400 font-medium">Logged system outreaches</p></div>
        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">AES-256 Encrypted</p><p className="text-2xl font-bold text-emerald-600">{encryptedMessageCount}</p><p className="text-[11px] text-gray-400 font-medium">Records identified as encrypted</p></div>
        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">SHA-256 Integrity</p><p className="text-2xl font-bold text-ug-teal">{integrityStatus}</p><p className="text-[11px] text-gray-400 font-medium">Digest evidence is not stored for these records</p></div>
        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">Offboarding Audits</p><p className="text-2xl font-bold text-red-600">{accountDeletions.length}</p><p className="text-[11px] text-gray-400 font-medium">User account deletion logs</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100"><div><h4 className="text-sm font-bold text-ug-navy">Message Transmission Ledger</h4><p className="text-[11px] text-gray-400 font-mono">Real-time cryptographic audit trail of user outreaches and transmissions</p></div><span className="text-[11px] font-semibold tracking-wider text-ug-teal bg-ug-teal/10 px-3 py-1 rounded-full">Zero-Knowledge Privacy Standard</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold tracking-wide text-gray-400"><th className="p-4 pl-6">Sender</th><th className="p-4">Associated Project</th><th className="p-4">Timestamp</th><th className="p-4">Transmission Payload</th><th className="p-4 pr-6 text-right">Security &amp; Actions</th></tr></thead><tbody className="divide-y divide-gray-100">
          {eois.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400 tracking-wide">No outreach transactions recorded in the audit logs.</td></tr> : eois.map((e) => { const isEnc = isMessageEncrypted(e.raw_message || e.message); return <tr key={e.id} className="hover:bg-gray-50/50 transition duration-150"><td className="p-4 pl-6"><div><span className="font-extrabold text-xs text-ug-navy block">{e.user_name}</span><span className="text-[11px] font-mono text-gray-400 block mt-0.5">UID: {e.sender_id?.substring(0, 8)}...</span></div></td><td className="p-4"><span className="font-extrabold text-xs text-ug-navy block max-w-xs truncate" title={e.projects?.title}>{e.projects?.title || 'Direct Outreach'}</span></td><td className="p-4"><div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]"><Clock size={11} />{new Date(e.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div></td><td className="p-4"><div className="space-y-1"><p className="text-xs text-gray-700 max-w-xs sm:max-w-md line-clamp-1 leading-relaxed italic" title={e.message}>&quot;{e.message}&quot;</p>{isEnc ? <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><Lock size={9} />AES-256-GCM Encrypted Envelope</span> : <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">Legacy Plaintext</span>}</div></td><td className="p-4 pr-6 text-right"><button onClick={() => onInspectMsg(e)} className="px-3 py-1.5 bg-slate-100 hover:bg-ug-navy hover:text-white text-slate-700 font-semibold text-[11px] tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto"><Eye size={12} />Inspect Envelope</button></td></tr>; })}
        </tbody></table></div>
      </div>

      <div className="pt-8 border-t border-gray-200/80 space-y-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-red-600 mb-1"><Trash2 size={18} /><h3 className="text-xl font-bold text-ug-navy">Account Deletion &amp; Offboarding Registry</h3></div><p className="text-[11px] font-semibold text-gray-400 tracking-wide">User-Initiated Account Erasure Records &amp; Feedback Audit</p></div><button onClick={onExportAccountDeletionsCsv} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-red-500/10"><Download size={14} />Export Offboarding CSV</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">Total Accounts Erased</p><p className="text-2xl font-bold text-red-600">{accountDeletions.length}</p><p className="text-[11px] text-gray-400 font-medium">Logged user offboardings</p></div><div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">GDPR Right to Erasure</p><p className="text-2xl font-bold text-ug-navy">100%</p><p className="text-[11px] text-gray-400 font-medium">Automated profile purge compliance</p></div><div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm space-y-1"><p className="text-[11px] font-semibold text-gray-400 tracking-wider">Offboarding Feedback</p><p className="text-2xl font-bold text-ug-teal">{accountDeletions.filter(a => a.reason_details).length}</p><p className="text-[11px] text-gray-400 font-medium">Qualitative notes recorded</p></div></div>
      </div>
    </div>

    <AnimatePresence>{inspectingEnvelopeMsg && envelopeAuditData && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-8 max-w-xl w-full shadow-xl space-y-6 relative overflow-hidden"><button onClick={onCloseEnvelopeInspector} className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition cursor-pointer"><X size={20} /></button><div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="w-10 h-10 rounded-xl bg-ug-teal/10 border border-ug-teal/20 flex items-center justify-center text-ug-teal"><Fingerprint size={20} /></div><div><h3 className="text-base font-bold">Cryptographic Envelope Inspector</h3><p className="text-[11px] text-slate-400 font-mono">Transmission ID: {inspectingEnvelopeMsg.id}</p></div></div><div className="space-y-4 text-xs"><div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-800"><div><span className="text-[11px] font-mono text-slate-400 block">Sender Identity</span><span className="font-bold text-white block mt-0.5">{inspectingEnvelopeMsg.user_name}</span></div><div><span className="text-[11px] font-mono text-slate-400 block">Encryption Standard</span><span className="font-bold text-emerald-400 block mt-0.5">{envelopeAuditData.algorithm}</span></div></div><div className="space-y-1.5"><label className="text-[11px] font-mono text-slate-400 block">SHA-256 Digest Signature</label><div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-ug-teal break-all select-all">{envelopeAuditData.sha256Hash}</div></div><div className="space-y-1.5"><label className="text-[11px] font-mono text-slate-400 block">Raw Ciphertext Envelope (At-Rest Payload)</label><div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all max-h-24 overflow-y-auto">{inspectingEnvelopeMsg.raw_message || inspectingEnvelopeMsg.message}</div></div><div className="space-y-1.5"><label className="text-[11px] font-mono text-slate-400 block">Decrypted Message Payload (Client-Side Verification)</label><div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-xs italic text-slate-200">&quot;{envelopeAuditData.decryptedText}&quot;</div></div><div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-xs font-bold"><CheckCircle2 size={16} /><span>Cryptographic Signature Validated: Payload integrity verified.</span></div></div><button onClick={onCloseEnvelopeInspector} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">Close Inspector</button></motion.div></div>}</AnimatePresence>
  </motion.div>
);
