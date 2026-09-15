import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, Eye, EyeOff, Lock, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import AuthShell from '../components/AuthShell';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const readResetToken = (): string | null =>
    new URLSearchParams(window.location.search).get('token') ??
    new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('token');

  useEffect(() => {
    if (!readResetToken()) navigate('/forgot-password');
  }, [navigate]);

  const requirements = [
    ['At least 8 characters', password.length >= 8],
    ['1 uppercase letter', /[A-Z]/.test(password)],
    ['1 numeric character', /[0-9]/.test(password)],
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!requirements.every(([, valid]) => valid)) return setError('Choose a password that meets all listed requirements.');
    setLoading(true);
    try {
      const token = readResetToken();
      if (!token) throw new Error('This password reset link is missing or expired.');
      const result: any = await (authClient as any).resetPassword({ newPassword: password, token });
      if (result?.error) throw result.error;
      setSuccess(true);
      setTimeout(async () => {
        try { await (authClient as any).signOut?.(); } catch {}
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell eyebrow="Password updated" title="Security updated" description="Your password has been changed successfully.">
        <div role="status" className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><Check size={32} /></div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">For your security, your active sessions have been signed out.</p>
          <p className="mt-6 text-xs font-semibold text-ug-teal">Redirecting to the login portal...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Secure recovery" title="Set a new password" description="Create a strong password to secure your UG Virtual Industry Hub account.">
      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"><ShieldAlert size={18} className="shrink-0" /><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
        <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} autoComplete="new-password" />
        <div id="password-requirements" className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70" aria-label="Password requirements">
          <p className="type-label mb-3 text-slate-500 dark:text-slate-400">Requirements</p>
          {requirements.map(([label, valid]) => <div key={label} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><CheckCircle2 size={14} className={valid ? 'text-ug-teal' : 'text-slate-300 dark:text-slate-600'} />{label}</div>)}
        </div>
        <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ug-navy py-3.5 text-sm font-semibold text-white shadow-lg shadow-ug-navy/10 transition hover:bg-ug-teal disabled:opacity-50">
          {loading ? <><Loader2 className="animate-spin" size={17} /> Updating password</> : <>Update password <ArrowRight size={17} /></>}
        </button>
      </form>
    </AuthShell>
  );
};

interface PasswordFieldProps { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; autoComplete: string; }

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange, visible, onToggle, autoComplete }) => (
  <div>
    <label htmlFor={id} className="type-label mb-2 block text-slate-600 dark:text-slate-300">{label}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
      <input id={id} required type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby="password-requirements" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-700 outline-none transition focus:border-ug-teal focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
      <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ug-teal">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  </div>
);

export default ResetPassword;
