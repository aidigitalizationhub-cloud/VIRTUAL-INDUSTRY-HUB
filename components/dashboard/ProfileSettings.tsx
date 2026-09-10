import React, { useEffect, useRef, useState } from 'react';
import { FileText, Download, ChevronRight, Lock, Check, Loader2, User as UserIcon, Link as LinkIcon, Camera, AlertTriangle, Trash2, Target, Sparkles } from 'lucide-react';
import type { User } from '../../types';
import { UserRole } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { authClient } from '../../lib/auth-client';
import { safeExternalUrl } from '../../lib/urlSafety';
import { StorageService } from '../../services/storageService';

export const ProfileSettings: React.FC<{ 
  user: User | null; 
  onUpdate: () => void;
  onRetakeOnboarding?: () => void;
}> = ({ user, onUpdate, onRetakeOnboarding }) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website_url || '');
  const [website2, setWebsite2] = useState(user?.website_url_2 || '');
  const [website3, setWebsite3] = useState(user?.website_url_3 || '');
  const [website4, setWebsite4] = useState(user?.website_url_4 || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [sectorVector, setSectorVector] = useState<string[]>(user?.ai_profile?.sectorVector || user?.answers?.sectorVector || ['pharmaceutical', 'drugs', 'diagnostics']);
  const [newTag, setNewTag] = useState('');
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);

  // Security & Password Reset States
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete Account Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('No longer using the platform / Found an alternative');
  const [deleteReasonDetails, setDeleteReasonDetails] = useState('');
  const [deleteConfirmedCheck, setDeleteConfirmedCheck] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setWebsite(user.website_url || '');
      setWebsite2(user.website_url_2 || '');
      setWebsite3(user.website_url_3 || '');
      setWebsite4(user.website_url_4 || '');
      setAvatarPreview(user.avatar_url || '');
      setSectorVector(user.ai_profile?.sectorVector || user.answers?.sectorVector || ['pharmaceutical', 'drugs', 'diagnostics']);
    }
  }, [user]);

  const openEditModal = () => {
    setEditName(name);
    setEditAvatarPreview(avatarPreview);
    setEditAvatarFile(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    setName(editName);
    if (editAvatarFile) {
      setAvatarFile(editAvatarFile);
    }
    setAvatarPreview(editAvatarPreview);
    setIsEditModalOpen(false);
    showToast("Profile identity updated locally. Remember to click 'Save My Profile' at the bottom to finalize changes.", "success");
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast("Please fill in both password fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    
    setUpdatingPassword(true);
    try {
      const result: any = await (authClient as any).changePassword({
        newPassword,
        revokeOtherSessions: true,
      });
      if (result?.error) throw result.error;
      showToast("Password updated successfully!", "success");
      setIsResettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(`Password reset failed: ${err.message}`, "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDownloadData = () => {
    if (!user) {
      showToast("User session not found.", "error");
      return;
    }
    try {
      const dataToDownload = {
        meta: {
          hub_identity: "Verified University of Ghana Virtual Industry Hub Profile Export",
          exported_at: new Date().toISOString(),
          version: "1.0.0"
        },
        personal_data: {
          id: user.id,
          name: name,
          email: user.email,
          role: user.role,
          bio: bio,
          website_url: website,
          website_url_2: website2,
          website_url_3: website3,
          website_url_4: website4,
          avatar_url: avatarPreview,
          status: "Verified"
        },
        ai_profile: user.ai_profile || null
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToDownload, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `ug_hub_profile_data_${user.id || 'export'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast("Your core profile data has been downloaded successfully.", "success");
    } catch (err: any) {
      showToast(`Data packaging failed: ${err.message}`, "error");
    }
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!deletePassword.trim()) {
      showToast("Please enter your current password to confirm deletion.", "error");
      return;
    }
    if (!deleteConfirmedCheck) {
      showToast("Please acknowledge account deletion confirmation.", "error");
      return;
    }

    setDeletingAccount(true);
    try {
      const signInResult: any = await (authClient as any).signIn.email({
        email: user.email,
        password: deletePassword,
      });

      if (signInResult?.error) {
        showToast("Incorrect password. Please verify your current password.", "error");
        setDeletingAccount(false);
        return;
      }

      // Record deletion log for admin dashboard records
      await StorageService.recordAccountDeletion({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || 'Anonymous User',
        user_role: user.role || UserRole.Researcher,
        reason_category: deleteReasonCategory,
        reason_details: deleteReasonDetails.trim() || undefined
      });

      // Execute account deletion and clean profile
      await StorageService.deleteAccount(user.id);

      showToast("Your account has been permanently deleted. Session terminated.", "info");
      setIsDeleteModalOpen(false);
      
      // Navigate to homepage
      window.location.href = '/';
    } catch (err: any) {
      showToast(`Account deletion failed: ${err.message}`, "error");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    try {
      let avatarUrl = user.avatar_url;
      if (avatarFile) {
        avatarUrl = await StorageService.uploadFile(avatarFile, 'avatars');
      }

      const updatedAnswers = { 
        ...(user.answers || {}), 
        sectorVector 
      };
      
      const updatedAIProfile = {
        ...(user.ai_profile || {}),
        sectorVector
      };

      await StorageService.updateProfile({
        id: user.id,
        name,
        bio,
        role: user.role,
        email: user.email,
        website_url: safeExternalUrl(website),
        website_url_2: safeExternalUrl(website2),
        website_url_3: safeExternalUrl(website3),
        website_url_4: safeExternalUrl(website4),
        avatar_url: avatarUrl,
        answers: updatedAnswers,
        ai_profile: updatedAIProfile
      });
      
      showToast("Profile identity updated", "success");
      onUpdate();
    } catch (err: any) { 
      showToast(`Update failed: ${err.message}`, "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="animate-fade-in space-y-7 pb-20">
      {/* Identity Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm md:p-8 dark:from-slate-900 dark:to-slate-950">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-ug-teal/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row md:gap-8">
        <div>
          <div 
            className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-gray-50 shadow-lg group/avatar md:h-32 md:w-32 dark:border-slate-700"
            onClick={openEditModal}
          >
            {avatarPreview ? (
              <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200 bg-ug-navy/5"><UserIcon size={40} strokeWidth={1} /></div>
            )}
            <div className="absolute inset-0 bg-ug-navy/60 opacity-0 group-hover/avatar:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white text-[11px] font-semibold tracking-wider backdrop-blur-[1px]">
              <Camera size={14} className="mb-0.5" />
              Change
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold tracking-tight text-ug-navy md:text-3xl">{name || 'New Member'}</h3>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 items-center">
              <span className="text-[11px] font-semibold text-ug-teal tracking-[0.2em]">Official Researcher Profile</span>
              <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
              <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{user?.email}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium max-w-2xl leading-relaxed">
            Update your profile details and personal links to ensure the intelligence engine can match you with the right projects and partners.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <button 
              type="button" 
              onClick={openEditModal} 
              className="px-5 py-2.5 bg-ug-navy text-white hover:bg-ug-teal transition rounded-xl text-[11px] font-semibold tracking-wide shadow-md flex items-center gap-1.5"
            >
              <UserIcon size={12} /> Edit Profile
            </button>
            {onRetakeOnboarding && (
              <button 
                type="button" 
                onClick={onRetakeOnboarding} 
                className="px-5 py-2.5 bg-ug-teal/10 hover:bg-ug-teal hover:text-white text-ug-teal transition rounded-xl text-[11px] font-semibold tracking-wide border border-ug-teal/20 flex items-center gap-1.5"
              >
                <Sparkles size={12} /> Refine AI Matching
              </button>
            )}
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[11px] font-semibold tracking-wide text-gray-400 dark:border-slate-700 dark:bg-slate-900">Verified Hub</div>
          </div>
        </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="space-y-7 rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm md:space-y-9 md:p-8">
            {/* Biography Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                <div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center shrink-0"><FileText size={18} /></div>
                <div>
                  <h4 className="text-lg font-bold text-ug-navy tracking-tight ">My Information</h4>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">Professional Narrative</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Full Name / Display Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-4 font-bold text-ug-navy focus:bg-white focus:border-ug-teal focus:ring-4 focus:ring-ug-teal/5 outline-none transition-all shadow-inner text-xs" 
                    placeholder="Your display name..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 font-bold text-gray-400 outline-none cursor-not-allowed text-xs shadow-inner" 
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Verified Portal Role</label>
                  <input 
                    type="text" 
                    value={user?.role || 'Researcher'} 
                    disabled 
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 font-bold text-gray-400 outline-none cursor-not-allowed text-xs shadow-inner  " 
                  />
                </div>
              </div>
            </div>

            {user?.user_type === 'entity' && (
                <div className="space-y-6 rounded-2xl border border-gray-100 bg-slate-50/50 p-5 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ug-teal/10 text-ug-teal rounded-xl flex items-center justify-center shrink-0">
                    <Target size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-ug-navy tracking-tight ">Active Focus Tracks</h4>
                    <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">Manage Sector Tracks & Dynamic Tags</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sectorVector.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1.5 bg-ug-teal text-white rounded-lg text-[11px] font-semibold tracking-wider flex items-center gap-1.5"
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => setSectorVector(sectorVector.filter(t => t !== tag))}
                        className="hover:scale-125 transition-transform font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Input other custom dynamic tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim() && !sectorVector.includes(newTag.trim().toLowerCase())) {
                          setSectorVector([...sectorVector, newTag.trim().toLowerCase()]);
                          setNewTag('');
                        }
                      }
                    }}
                    className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-4 font-bold text-ug-navy focus:bg-white focus:border-ug-teal outline-none text-xs shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newTag.trim() && !sectorVector.includes(newTag.trim().toLowerCase())) {
                        setSectorVector([...sectorVector, newTag.trim().toLowerCase()]);
                        setNewTag('');
                      }
                    }}
                    className="px-5 py-2 bg-ug-navy text-white rounded-xl text-xs font-bold   hover:bg-ug-teal transition-colors focus:outline-none"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            )}

            {/* Portfolio Links */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                <div className="w-10 h-10 bg-ug-navy text-white rounded-xl flex items-center justify-center shadow-md shrink-0"><LinkIcon size={18} /></div>
                <div>
                  <h4 className="text-lg font-bold text-ug-navy tracking-tight ">Portfolio Slots</h4>
                  <p className="text-[11px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">External Research Links (Up to 4)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {[
                  { label: "Main Portfolio Website", val: website, setter: setWebsite, placeholder: "https://yourwebsite.com" },
                  { label: "LinkedIn Profile", val: website2, setter: setWebsite2, placeholder: "https://linkedin.com/in/..." },
                  { label: "Research Archive Link", val: website3, setter: setWebsite3, placeholder: "Scholar or Project link" },
                  { label: "Extra Portfolio Slot", val: website4, setter: setWebsite4, placeholder: "Any other relevant link" },
                ].map((input, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">{input.label}</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-ug-teal transition-colors">
                        <LinkIcon size={14} />
                      </div>
                      <input 
                        type="url" 
                        placeholder={input.placeholder}
                        value={input.val || ''} 
                        onChange={e => input.setter(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-bold text-ug-navy focus:bg-white focus:border-ug-teal focus:ring-4 focus:ring-ug-teal/5 outline-none transition-all shadow-inner text-xs" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="group w-full sm:w-auto bg-ug-navy text-white px-8 py-3.5 rounded-xl font-semibold text-[11px] tracking-wide shadow-md hover:bg-ug-teal transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="group-hover:scale-125 transition-transform" />}
                Save My Profile
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h4 className="text-[11px] font-semibold text-gray-400 tracking-wide px-1">Account Management</h4>
            <div className="space-y-1">
              {isResettingPassword ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5 animate-fade-in mb-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-semibold tracking-wide text-ug-navy">Change Password</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsResettingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-[11px] font-semibold tracking-wide text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <input 
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-ug-navy placeholder-gray-400 focus:border-ug-teal outline-none"
                    />
                    <input 
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-ug-navy placeholder-gray-400 focus:border-ug-teal outline-none"
                    />
                  </div>
                  
                  <button 
                    type="button"
                    disabled={updatingPassword}
                    onClick={handleResetPassword}
                    className="w-full bg-ug-navy hover:bg-ug-teal text-white py-2 rounded-lg font-semibold text-[11px] tracking-wide transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsResettingPassword(true)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group text-left border border-transparent hover:border-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-gray-400 group-hover:text-ug-navy transition" />
                    <span className="text-[11px] font-semibold text-gray-500 tracking-wide">Reset Password</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-ug-navy group-hover:translate-x-0.5 transition" />
                </button>
              )}

              <button 
                type="button" 
                onClick={handleDownloadData}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group text-left border border-transparent hover:border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-gray-400 group-hover:text-ug-navy transition" />
                  <span className="text-[11px] font-semibold text-gray-500 tracking-wide">Download Data</span>
                </div>
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setDeletePassword('');
                  setDeleteReasonCategory('No longer using the platform / Found an alternative');
                  setDeleteReasonDetails('');
                  setDeleteConfirmedCheck(false);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 hover:bg-red-50 rounded-xl transition group text-left border border-transparent hover:border-red-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={16} className="text-gray-400 group-hover:text-red-500 transition" />
                  <span className="text-[11px] font-semibold text-gray-500 tracking-wide group-hover:text-red-600 transition">Delete Account</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Privacy Disclaimer */}
      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <p className="text-[11px] md:text-xs text-gray-400 font-medium leading-relaxed max-w-2xl">
          "Your data is used specifically for matchmaking and is never shared with third-party advertisers."
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-ug-teal/5 rounded-full border border-ug-teal/10 shrink-0">
          <span className="w-1.5 h-1.5 bg-ug-teal rounded-full animate-pulse"></span>
          <span className="text-[11px] font-semibold tracking-wide text-ug-teal">Encrypted & Secure</span>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ug-navy/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-lg overflow-hidden animate-fade-in z-[160] max-h-[90vh] flex flex-col">
            <div className="p-8 md:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-ug-navy tracking-tight">Edit Profile Info</h3>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wide mt-1">Name & Profile Picture</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-ug-navy rounded-full flex items-center justify-center transition text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveEditModal} className="p-8 md:p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Profile Picture Selector */}
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-50 border-4 border-gray-100 shadow-lg cursor-pointer relative group/avatar"
                >
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} className="w-full h-full object-cover group-hover/avatar:scale-110 transition duration-500" alt="New Avatar" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-ug-navy/5">
                      <UserIcon size={48} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-ug-navy/60 opacity-0 group-hover/avatar:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white text-[11px] font-semibold tracking-wider backdrop-blur-[2px]">
                    <Camera size={18} className="mb-1" />
                    Upload
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl text-[11px] font-semibold tracking-wide transition"
                >
                  Choose Image
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditAvatarFile(file);
                      setEditAvatarPreview(URL.createObjectURL(file));
                    }
                  }} 
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-500 tracking-wide ml-1">Full Name / Display Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent focus:border-ug-teal focus:bg-white focus:ring-4 focus:ring-ug-teal/5 rounded-2xl p-4 font-bold text-ug-navy outline-none transition-all text-sm"
                  placeholder="Enter dynamic display name..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-ug-navy transition rounded-2xl text-[11px] font-semibold tracking-wide"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-ug-navy text-white hover:bg-ug-teal transition rounded-2xl text-[11px] font-semibold tracking-wide shadow-xl font-bold"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 my-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative w-full max-w-lg overflow-hidden animate-fade-in my-auto flex flex-col max-h-[85vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex justify-between items-start shrink-0 bg-white z-10">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-ug-navy">Delete Account</h3>
                  <p className="text-[11px] font-semibold tracking-wider text-gray-400 mt-0.5">Permanent Offboarding & Data Erasure</p>
                </div>
              </div>
              <button 
                type="button"
                disabled={deletingAccount}
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-ug-navy rounded-full flex items-center justify-center transition text-xl font-bold cursor-pointer disabled:opacity-50 shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="p-3.5 sm:p-4 bg-red-50/70 rounded-2xl border border-red-100/90 text-red-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-red-600 shrink-0" />
                  Warning: This action cannot be undone.
                </p>
                <p className="text-[11px] text-red-700/90 leading-relaxed">
                  Deleting your account will permanently remove your profile, project associations, watchlist, and saved alert preferences.
                </p>
              </div>

              <form onSubmit={handleConfirmDeleteAccount} className="space-y-5">
                {/* Reason Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Why are you deleting your account? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deleteReasonCategory}
                    onChange={(e) => setDeleteReasonCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50 cursor-pointer"
                    required
                  >
                    <option value="No longer using the platform / Found an alternative">No longer using the platform / Found an alternative</option>
                    <option value="Privacy or data security concerns">Privacy or data security concerns</option>
                    <option value="Too many notifications or alerts">Too many notifications or alerts</option>
                    <option value="Created a duplicate or test account">Created a duplicate or test account</option>
                    <option value="Difficulty navigating or using the hub">Difficulty navigating or using the hub</option>
                    <option value="Other reason (please specify below)">Other reason (please specify below)</option>
                  </select>
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Additional Details / Feedback (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={deleteReasonDetails}
                    onChange={(e) => setDeleteReasonDetails(e.target.value)}
                    placeholder="Please tell us how we could improve the Virtual Industry Hub..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50 resize-none"
                  />
                </div>

                {/* Password Confirmation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold tracking-wider text-gray-500 block">
                    Confirm Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-ug-navy focus:outline-none focus:ring-2 focus:ring-ug-teal/50"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="confirmDeleteCheck"
                    checked={deleteConfirmedCheck}
                    onChange={(e) => setDeleteConfirmedCheck(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    required
                  />
                  <label htmlFor="confirmDeleteCheck" className="text-[11px] font-bold text-gray-600 cursor-pointer leading-tight">
                    I understand that deleting my account is permanent and cannot be reversed.
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold   rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletingAccount || !deletePassword || !deleteConfirmedCheck}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold   rounded-xl transition shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
