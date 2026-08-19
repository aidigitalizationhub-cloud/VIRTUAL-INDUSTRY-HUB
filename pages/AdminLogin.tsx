import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldAlert, Mail, Lock, Sparkles, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../services/storageService';
import { UserRole } from '../types';
import { useToast } from '../App';

export const AdminLogin: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in standardly with password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) throw signInError;
      
      const authUserId = signInData?.user?.id;
      if (!authUserId) throw new Error("Could not resolve authorization token.");

      // Check user role in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("Could not retrieve administrative profile.");
      }

      if (profile.role !== UserRole.Admin) {
        // Log out immediately to prevent illegal session
        await supabase.auth.signOut();
        throw new Error("Access Denied: Your profile does not possess Administrative clearance.");
      }

      showToast("Administrator Access Granted", "success");
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Admin Login Error:", err);
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
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex p-4 rounded-3xl bg-ug-teal/10 border border-ug-teal/20 mb-4 text-ug-teal"
          >
            <ShieldAlert size={36} />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase leading-tight block">
            Administrative Access
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-400 max-w-sm mx-auto leading-relaxed uppercase tracking-wider font-bold pt-1">
            Authorized Personnel Only. Please verify credentials to access directories and security metrics.
          </p>
        </div>

        {/* Input Form Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gray-900 border border-white/5 shadow-2xl rounded-[2.5rem] p-8 md:p-10 space-y-6"
        >
          <form onSubmit={handleAdminAuth} className="space-y-4 text-left">
            {/* Email field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 font-mono">
                Administrative Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ug.edu.gh"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-ug-teal focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 font-mono">
                Security Access Phrase
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-ug-teal focus:bg-white/10 transition"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-ug-teal hover:bg-ug-teal/80 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition flex items-center justify-center gap-2 mt-6 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Verifying Identity Authorized...
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
        <div className="flex items-center justify-center gap-6 text-gray-500 text-[9px] uppercase tracking-widest font-mono pt-4">
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
