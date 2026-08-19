
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Check, ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Basic check: In a real Supabase recovery flow, the user is temporarily authenticated.
    // If there is no session, they shouldn't be here.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/forgot-password');
      }
    };
    checkSession();
  }, [navigate]);

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters, include an uppercase letter and a number.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      // Invalidate the session by signing out after a brief delay
      setTimeout(async () => {
        await supabase.auth.signOut();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center animate-fade-in border border-green-100">
           <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-200">
              <Check size={40} />
           </div>
           <h1 className="text-3xl font-black text-ug-navy mb-4">Security Updated</h1>
           <p className="text-gray-500 font-medium leading-relaxed mb-8">
             Your password has been successfully reset. For your security, we've logged you out of all other sessions.
           </p>
           <p className="text-[10px] font-black uppercase text-ug-teal tracking-widest animate-pulse">
             Redirecting to login portal...
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-ug-navy p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
          <div className="relative z-10">
            <h1 className="text-white font-black text-2xl tracking-tight">Set New Password</h1>
            <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Credential Reset</p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-xs font-bold">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  required
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal font-bold text-gray-700"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  required
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl space-y-2 border border-gray-100">
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Requirements</p>
               <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                  <div className={password.length >= 8 ? "text-ug-teal" : "text-gray-300"}><CheckCircle2 size={14} /></div>
                  Min 8 Characters
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                  <div className={/[A-Z]/.test(password) ? "text-ug-teal" : "text-gray-300"}><CheckCircle2 size={14} /></div>
                  1 Uppercase Letter
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                  <div className={/[0-9]/.test(password) ? "text-ug-teal" : "text-gray-300"}><CheckCircle2 size={14} /></div>
                  1 Numeric Character
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ug-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-ug-navy/10 flex items-center justify-center gap-2 hover:bg-ug-teal transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>Finalize Reset <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
