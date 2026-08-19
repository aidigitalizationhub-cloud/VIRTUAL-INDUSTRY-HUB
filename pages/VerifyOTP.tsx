
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;

      // On success, Supabase logs the user in with a recovery session.
      // Redirect to the reset password page.
      navigate('/reset-password');
    } catch (err: any) {
      console.error(err);
      setError('Invalid or expired security code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email);
      if (resendError) throw resendError;
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError('Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-ug-navy p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1579684385180-1ea55f9f8c60?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
          <div className="relative z-10">
             <div className="w-12 h-12 bg-ug-teal rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                <ShieldCheck size={28} />
             </div>
             <h1 className="text-white font-black text-2xl tracking-tight">Verify Identity</h1>
             <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Security Checkpoint</p>
          </div>
        </div>

        <div className="p-8">
          <Link to="/forgot-password" title="Back to Email Entry" className="inline-flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-ug-teal transition mb-6">
            <ArrowLeft size={14} /> Edit Email
          </Link>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-xs font-bold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-sm text-gray-500 font-medium mb-8">
            We've sent a 6-digit code to <span className="text-ug-navy font-bold">{email}</span>. Enter it below to proceed.
          </p>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-16 text-center text-2xl font-black bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ug-teal/10 focus:border-ug-teal transition-all text-ug-navy"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors ${
                  countdown > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-ug-teal hover:text-ug-navy'
                }`}
              >
                {resending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Security Code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.some(d => !d)}
              className="w-full bg-ug-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-ug-navy/10 flex items-center justify-center gap-2 hover:bg-ug-teal transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>Verify & Continue <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
