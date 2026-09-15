import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { authClient, getAuthUser } from '../lib/auth-client';
import { StorageService } from '../services/storageService';
import { useToast } from '../contexts/ToastContext';
import { isAdministrativeRole } from '../lib/dashboardRouting';
import BrandLockup from '../components/BrandLockup';

export const AdminLogin: React.FC<{ onAuthenticated: (user: { id: string }) => Promise<void> | void }> = ({ onAuthenticated }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result: any = await (authClient as any).signIn.email({ email: email.trim(), password });
      if (result?.error) throw result.error;
      const authUserId = (await getAuthUser())?.id;
      if (!authUserId) throw new Error("Could not resolve authorization token.");

      // Check user role in profiles
      const profile = await StorageService.getCurrentProfile();
      const profileError = null;

      if (profileError || !profile) {
        throw new Error("Could not retrieve administrative profile.");
      }

       if (!isAdministrativeRole(profile.role)) {
        // Log out immediately to prevent illegal session
        await (authClient as any).signOut?.();
        throw new Error("Access Denied: Your profile does not possess Administrative clearance.");
      }

      showToast("Administrator Access Granted", "success");
      await onAuthenticated({ id: authUserId });
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      setError(err.message || "Failed to establish administrative privileges.");
      showToast(err.message || "Failed to establish administrative privileges.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto text-white font-sans select-none">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-ug-teal/10 to-transparent pointer-events-none"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-ug-teal/10 blur-3xl rounded-full pointer-events-none animate-pulse"></div>
      
      {/* Container */}
      <div className="w-full max-w-md space-y-8 z-10 py-4">
        <div className="text-center space-y-2">
          <BrandLockup className="mx-auto justify-center text-white" />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mt-6 inline-flex rounded-2xl bg-ug-teal/10 p-4 text-ug-teal"
          >
            <Lock size={30} />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase leading-tight block">
            Administrative Access
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 max-w-sm mx-auto leading-relaxed tracking-wider font-bold pt-1">
            Authorized Personnel Only. Please verify credentials to access directories and security metrics.
          </p>
        </div>

        {/* Input Form Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gray-900 border border-white/5 shadow-xl rounded-2xl p-8 md:p-6 space-y-6"
        >
           <form onSubmit={handleAdminAuth} className="space-y-4 text-left" aria-busy={loading}>
             {error && <div role="alert" className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-xs leading-relaxed text-red-200">{error}</div>}
            {/* Email field */}
            <div className="space-y-2">
               <label htmlFor="admin-email" className="type-label text-gray-400 ml-1">
                Administrative Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                   id="admin-email"
                   required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ug.edu.gh"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-ug-teal focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
               <label htmlFor="admin-password" className="type-label text-gray-400 ml-1">
                 Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                   id="admin-password"
                   required
                   type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                   className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-ug-teal focus:bg-white/10 transition"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ug-teal">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-ug-teal hover:bg-ug-teal/80 text-white font-semibold text-[11px] tracking-wide rounded-2xl shadow-lg transition flex items-center justify-center gap-2 mt-6 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Verifying identity...
                </>
              ) : (
                <>
                  Verify Credentials & Enter Panel
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Dynamic Trust Badges */}
         <div className="flex items-center justify-center gap-6 text-gray-500 type-caption pt-4">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle size={10} className="text-ug-teal" />
            <span>Encrypted Pipeline</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles size={10} className="text-ug-teal" />
            <span>Role Governance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
