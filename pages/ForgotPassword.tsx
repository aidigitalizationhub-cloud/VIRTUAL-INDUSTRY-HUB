
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';

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
      setError(null);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send recovery code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:py-10">
      <div className="w-full max-w-md overflow-hidden border border-slate-200/80 bg-white shadow-[0_20px_55px_-28px_rgba(26,26,75,0.55)] animate-fade-in-up">
        <div className="relative overflow-hidden bg-ug-navy px-6 py-9 text-center sm:px-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ug-teal/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="relative z-10">
            <div className="mx-auto mb-5 flex h-14 w-20 items-center justify-center rounded-xl border border-white/80 bg-white px-2 py-1 shadow-lg">
              <img src="/logo.svg" alt="University of Ghana logo" className="h-full w-auto max-w-[120px] object-contain" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Recover access</h1>
            <p className="mt-2 text-xs font-medium text-white/65">Identity verification</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <Link to="/" className="mb-7 inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-ug-teal">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          {error && (
            <div className="mb-5 flex items-start gap-3 border border-red-100 bg-red-50 p-4 text-xs font-medium text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sent && (
            <div role="status" className="mb-5 border border-teal-100 bg-teal-50 p-4 text-xs leading-relaxed text-teal-800">
              If an account exists for this email, a reset link has been sent. Check your inbox and follow the secure link to continue.
            </div>
          )}

          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Enter your registered academic or corporate email. We will send a secure reset link to verify your identity.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="email"
                placeholder="you@ug.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-ug-teal focus:bg-white focus:ring-4 focus:ring-teal-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex w-full items-center justify-center gap-2 bg-ug-navy py-3.5 text-sm font-semibold text-white shadow-lg shadow-ug-navy/10 transition-all hover:bg-ug-teal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>Send security link <ArrowRight size={17} /></>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-[10px] font-medium leading-relaxed tracking-[0.14em] text-slate-400">
            University of Ghana Innovation Hub<br />Security and Governance Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
