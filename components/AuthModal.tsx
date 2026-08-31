
import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, AlertCircle, Info, Eye, EyeOff, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { authClient } from '../lib/auth-client';
import { StorageService } from '../services/storageService';

const TITLE_OPTIONS = [
  'Dr.',
  'Prof.',
  'Mr.',
  'Mrs.',
  'Ms.',
  'Ing.',
  'Rev.',
  'Rev. Dr.',
  'Dr. Ing.',
  'Other',
  'Prefer not to specify'
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState<string>('Prefer not to specify');
  const [customTitle, setCustomTitle] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Researcher);
  const [userType, setUserType] = useState<'individual' | 'entity'>('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'general' | 'rate-limit' | 'signup-disabled' } | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getEffectiveTitle = () => {
    if (title === 'Prefer not to specify') return '';
    if (title === 'Other') return customTitle.trim();
    return title;
  };

  const getFormattedDisplayName = () => {
    const raw = name.trim();
    if (!raw) return 'Anonymous User';
    const prefix = getEffectiveTitle();
    if (!prefix) return raw;
    if (raw.toLowerCase().startsWith(prefix.toLowerCase())) return raw;
    return `${prefix} ${raw}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Try Better Auth first, fallback to Supabase for legacy users
        let userId: string | null = null;
        try {
          const res: any = await authClient.signIn.email({ email, password } as any);
          if (res?.error) throw res.error;
          const sess: any = await (authClient as any).getSession?.();
          userId = sess?.data?.user?.id || sess?.user?.id || null;
          // Ensure Supabase JWT exists for RLS-protected data (dual-write transitional)
          try { await supabase.auth.signInWithPassword({ email, password }); } catch {}
        } catch (baErr: any) {
          const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
          if (authError) throw authError;
          userId = signInData?.user?.id || null;
        }
        if (userId) {
          const profile = await StorageService.getProfile(userId);
          if (profile && profile.role === UserRole.Admin) {
            try { await (authClient as any).signOut?.(); } catch {}
            await supabase.auth.signOut();
            throw new Error("Access Denied: Administrative login must be performed through the secure Admin Portal (/admin/login).");
          }
        }
        if (!userId) throw new Error("Login failed: no session returned");
      } else {
        if (password.length < 6) throw new Error("Password must be at least 6 characters long.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const effectiveTitle = getEffectiveTitle();
        const displayName = getFormattedDisplayName();
        let newUserId: string | null = null;
        try {
          const res: any = await authClient.signUp.email({ email, password, name: displayName } as any);
          if (res?.error) throw res.error;
          const sess: any = await (authClient as any).getSession?.();
          newUserId = sess?.data?.user?.id || sess?.user?.id || res?.data?.user?.id || null;
          if (!newUserId) {
            const s2: any = await authClient.signIn.email({ email, password } as any);
            const sess2: any = await (authClient as any).getSession?.();
            newUserId = sess2?.data?.user?.id || s2?.data?.user?.id || null;
          }
          // Dual-write: ensure Supabase auth user exists so existing RLS continues to work
          try { await supabase.auth.signUp({ email, password }); } catch {}
          try { await supabase.auth.signInWithPassword({ email, password }); } catch {}
          // Refresh to obtain Supabase JWT for immediate profile insert
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id && session.user.id !== newUserId) {
              // If Supabase generated a different UUID, prefer Supabase one for FK consistency until full migration
              newUserId = session.user.id;
            }
          } catch {}
        } catch (baErr: any) {
          const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
          if (authError) throw authError;
          newUserId = authData.user?.id || null;
        }
        if (newUserId) {
          await StorageService.updateProfile({
            id: newUserId,
            email,
            name: displayName,
            title: effectiveTitle || undefined,
            role: role,
            user_type: (role === UserRole.Investor || role === UserRole.IndustryPartner) ? userType : 'individual'
          });
        }
      }
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError({
          message: "Email rate limit exceeded. Supabase only allows 3 emails per hour by default.",
          type: 'rate-limit'
        });
      } else if (msg.toLowerCase().includes('signups not allowed')) {
        setError({
          message: "Signups are currently disabled for this instance.",
          type: 'signup-disabled'
        });
      } else {
        let finalMsg = msg;
        if (msg.toLowerCase().includes('unprocessable') || msg.toLowerCase().includes('422')) {
          finalMsg = "Validation Error: Please ensure your email is valid and your password is at least 6 characters long.";
        }
        setError({
          message: finalMsg || 'An error occurred during authentication.',
          type: 'general'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose();
    navigate('/forgot-password');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-ug-navy py-6 px-6 relative overflow-hidden flex flex-col items-center justify-center text-center border-b border-white/10">
            <div className="absolute inset-0 opacity-15 bg-[url('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
            
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer z-20"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="relative z-10 flex flex-col items-center">
                {/* Official University of Ghana Logo */}
                <div className="h-12 px-3 py-1 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-xl ring-2 ring-white/40 overflow-hidden">
                    <img 
                      src="/logo.svg" 
                      alt="University of Ghana Logo" 
                      className="h-full w-auto max-w-[130px] object-contain"
                    />
                </div>

                {/* Hub Brand Title */}
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-bold text-lg sm:text-xl tracking-tight leading-tight">
                    {t('nav.brand')}
                  </h2>
                  <span className="text-[11px] font-extrabold tracking-wide px-1.5 py-0.5 rounded bg-ug-gold/20 text-ug-gold border border-ug-gold/30">
                    IAST
                  </span>
                </div>

                {/* Sub-label */}
                <p className="text-gray-300 text-[11px] font-extrabold tracking-wide mt-1">
                  {isLogin ? 'Secure Identity Authentication' : 'Academic & Industry Registration'}
                </p>
            </div>
        </div>

        <div className="p-8">
            {error && (
              <div className={`mb-6 p-4 rounded-xl flex flex-col gap-2 text-xs font-bold animate-pulse ${error.type === 'rate-limit' || error.type === 'signup-disabled' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error.message}</span>
                </div>
                {error.type === 'rate-limit' && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <p className="flex items-center gap-1 text-[11px] tracking-wider">
                      <Info size={12} /> Developer Fix:
                    </p>
                    <p className="mt-1 font-medium italic">Go to Supabase Dashboard → Auth → Settings. Disable "Confirm Email" to bypass this limit for testing.</p>
                  </div>
                )}
                {error.type === 'signup-disabled' && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <p className="flex items-center gap-1 text-[11px] tracking-wider">
                      <Info size={12} /> Developer Fix:
                    </p>
                    <p className="mt-1 font-medium italic">Go to Supabase Dashboard → Auth → Settings → Auth Providers → Email. Enable "Allow new users to sign up".</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex border-b border-gray-100 mb-6">
                <button 
                    className={`flex-1 pb-3 text-sm font-bold transition-colors ${isLogin ? 'text-ug-teal border-b-2 border-ug-teal' : 'text-gray-400'}`}
                    onClick={() => setIsLogin(true)}
                >
                    {t('auth.login')}
                </button>
                <button 
                    className={`flex-1 pb-3 text-sm font-bold transition-colors ${!isLogin ? 'text-ug-teal border-b-2 border-ug-teal' : 'text-gray-400'}`}
                    onClick={() => setIsLogin(false)}
                >
                    {t('auth.register')}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Title / Name Affiliation */}
                      <div className="sm:col-span-5 relative">
                        <label className="block text-[11px] font-semibold tracking-wider text-gray-500 mb-1">
                          Title / Affiliation
                        </label>
                        <div className="relative">
                          <Award className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                          <select
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-xs font-bold bg-gray-50 appearance-none cursor-pointer"
                          >
                            {TITLE_OPTIONS.map((tOpt) => (
                              <option key={tOpt} value={tOpt}>
                                {tOpt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div className="sm:col-span-7 relative">
                        <label className="block text-[11px] font-semibold tracking-wider text-gray-500 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                          <input
                            required
                            type="text"
                            placeholder="e.g. Jane Mensah"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-xs font-bold bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Title Input if 'Other' selected */}
                    {title === 'Other' && (
                      <div className="relative animate-fade-in pt-1">
                        <Award className="absolute left-3 top-3 text-ug-teal" size={16} />
                        <input
                          type="text"
                          placeholder="Specify Title (e.g. Arc., Surv., Hon.)"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-ug-teal/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-xs font-bold bg-ug-teal/5"
                        />
                      </div>
                    )}

                    {/* Live Display Preview */}
                    {name.trim() && (
                      <div className="flex items-center gap-1.5 px-1 text-[11px] text-gray-500 font-medium">
                        <span>Platform Display:</span>
                        <span className="font-extrabold text-ug-navy bg-ug-navy/5 px-2 py-0.5 rounded border border-gray-200/60">
                          {getFormattedDisplayName()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!isLogin && (
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      <ArrowRight size={18} />
                    </div>
                    <select 
                      value={role} 
                      onChange={(e) => {
                        const nextRole = e.target.value as UserRole;
                        setRole(nextRole);
                        if (nextRole !== UserRole.Investor && nextRole !== UserRole.IndustryPartner) {
                          setUserType('individual');
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-sm font-bold bg-gray-50 appearance-none"
                    >
                      {Object.values(UserRole).filter(r => r !== UserRole.Admin).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!isLogin && (role === UserRole.Investor || role === UserRole.IndustryPartner) && (
                  <div className="relative animate-fade-in-up">
                    <div className="absolute left-3 top-3 text-gray-400">
                      <Target size={18} />
                    </div>
                    <select 
                      value={userType} 
                      onChange={(e) => setUserType(e.target.value as 'individual' | 'entity')}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-sm font-bold bg-gray-50 appearance-none"
                    >
                      <option value="individual">Individual Setup</option>
                      <option value="entity">Firm / NGO / Entity Setup</option>
                    </select>
                  </div>
                )}

                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input required type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-sm font-bold bg-gray-50" />
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      placeholder={t('auth.password')} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-sm font-bold bg-gray-50" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-ug-teal transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {!isLogin && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      placeholder={t('auth.password')} 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal text-sm font-bold bg-gray-50" 
                    />
                  </div>
                )}

                {isLogin && (
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-[11px] font-semibold text-ug-teal tracking-wide hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-ug-navy text-white py-3 rounded-lg font-bold uppercase tracking-wide hover:bg-opacity-90 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-lg cursor-pointer"
                >
                    {loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.signUp'))} <ArrowRight size={18} />
                </button>

                <div className="relative my-6 flex items-center">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="px-3 text-[11px] font-bold tracking-wide text-gray-400 bg-white">OR</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError(null);
                    setLoading(true);
                    try {
                      await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" } as any);
                    } catch (err: any) {
                      setError({ message: err?.message || "Google sign-in failed", type: 'general' });
                      setLoading(false);
                    }
                  }}
                  className="w-full bg-white border border-gray-200 text-ug-navy py-3 rounded-lg font-bold text-xs tracking-wide hover:bg-gray-50 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.73.13-1.43.36-2.09V7.07H2.18A10.99 11.99 0 0 0 0 12c0 1.79.43 3.48 1.18 5.02l3.66-2.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continue with Google
                </button>
            </form>

            <p className="text-center text-[11px] text-gray-400 mt-6 leading-relaxed font-bold tracking-wide">
                Protected by UG Research Governance & Ghana Data Protection Act (Act 843).
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
