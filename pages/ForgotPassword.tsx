
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Supabase resetPasswordForEmail sends a recovery OTP or Link depending on project config.
      // For OTP flow, we expect the user to receive a 6-digit code.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (resetError) throw resetError;

      // Redirect to verification page with email in state
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send recovery code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-ug-navy p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
          <div className="relative z-10">
            <div className="h-12 px-2 py-1 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-white object-contain w-fit">
              <img src="/logo.svg" alt="University of Ghana Logo" className="h-full w-auto max-w-[120px] object-contain" />
            </div>
            <h1 className="text-white font-black text-2xl tracking-tight">Recover Access</h1>
            <p className="text-gray-300 text-xs font-bold uppercase tracking-widest mt-2">Identity Verification</p>
          </div>
        </div>

        <div className="p-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-ug-teal transition mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-xs font-bold animate-pulse">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-sm text-gray-500 font-medium mb-6">
            Enter your registered academic or corporate email address below. We will send a 6-digit verification code to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                required
                type="email"
                placeholder="email@ug.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal/20 focus:border-ug-teal font-bold text-gray-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-ug-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-ug-navy/10 flex items-center justify-center gap-2 hover:bg-ug-teal transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>Send Security Code <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
            University of Ghana Innovation Hub <br /> Security & Governance Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
