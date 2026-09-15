import React, { useState } from 'react';
import { Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import AuthShell from '../components/AuthShell';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    try {
      const result: any = await (authClient as any).requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (result?.error) throw result.error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'We could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Secure recovery"
      title="Reset your password"
      description="Enter your registered email and we will send a secure reset link."
    >
      {error && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sent && (
        <div role="status" className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs leading-relaxed text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
          If an account exists for this email, a reset link has been sent. Check your inbox and follow the secure link to continue.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="recovery-email" className="type-label mb-2 block text-slate-600 dark:text-slate-300">Email address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
            <input
              id="recovery-email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-ug-teal focus:bg-white focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>
        </div>
        <button type="submit" disabled={loading || !email.trim()} aria-busy={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ug-navy py-3.5 text-sm font-semibold text-white shadow-lg shadow-ug-navy/10 transition-all hover:bg-ug-teal disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <><Loader2 className="animate-spin" size={17} /> Sending link</> : <>Send reset link <ArrowRight size={17} /></>}
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
