import React, { useState, useRef, useEffect } from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  X, User, KeyRound, FileText, Mail, ArrowRight, Camera, Edit2, Lock, ShieldAlert, Trash2
} from 'lucide-react'
import { deactivateAccount, deleteAccount } from '../lib/api' // 🚀 Using your clean API abstractions
import toast from 'react-hot-toast'

  
const SettingsModal = ({ isOpen, onClose }) => {
  // 1. ALL HOOKS DECLARATIONS MUST COME FIRST, UNCONDITIONALLY
  const { authUser } = useAuthUser()
  const queryClient = useQueryClient()
  const user = authUser || {}

  // Tab control and active step states
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'security'
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  
  // 📝 Initialize blank profile form states to avoid dynamic reading issues on mount
  const [editForm, setEditForm] = useState({
    fullName: "",
    bio: "",
    profilePic: ""
  })

  // 🔒 Password Reset Multi-Step States
  const [securityStep, setSecurityStep] = useState('request') // 'request' | 'verify_otp' | 'new_password'
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")

  // ⚠️ Inline Safety Dialog Confirmation States for Danger Zone
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  // 🔐 Secure Input Trackers for Identity Check and User Feedback Reasons
  const [dangerZonePassword, setDangerZonePassword] = useState("")
  const [dangerZoneReason, setDangerZoneReason] = useState("")
  
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  // 2. Sync profile data into form states inside an isolated useEffect lifecycle hook
  useEffect(() => {
    if (user && isOpen) {
      setEditForm({
        fullName: user.fullName || "",
        bio: user.bio || "",
        profilePic: user.profilePic || ""
      })
      // Reset danger zone state configs when the modal updates visibility
      setConfirmDeactivate(false)
      setConfirmDelete(false)
      setDangerZonePassword("")
      setDangerZoneReason("")
    }
  }, [user, isOpen])

  // 3. Mutation Layers (Always rendering uniformly)
  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.put('/auth/update-profile', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] })
      toast.success("Profile updated successfully!")
      setIsEditingProfile(false)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update profile.")
    }
  })

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post('/auth/request-password-otp', { email: user.email })
      return res.data
    },
    onSuccess: () => {
      toast.success("Verification OTP code sent to your email!")
      setSecurityStep('verify_otp')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send verification code.")
    }
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post('/auth/update-password', {
        userId: user._id,
        otp: otpDigits.join(""),
        newPassword: newPassword
      })
      return res.data
    },
    onSuccess: () => {
      toast.success("Password updated successfully!")
      setSecurityStep('request')
      setOtpDigits(["", "", "", "", "", ""])
      setNewPassword("")
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Password update failed.")
    }
  })

  // 🔒 Deactivate Account Mutation (Sends Password + Reason)
  const deactivateAccountMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      toast.success("Account deactivated successfully. Logging out...")
      setTimeout(() => {
        window.location.href = "/login"
      }, 1200)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Invalid credentials or deactivation failed.")
    }
  })

  // 🚨 Delete Account Mutation (Sends Password + Reason)
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("Account permanently wiped. Goodbye!")
      setTimeout(() => {
        window.location.href = "/signup"
      }, 1200)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Invalid credentials or data wipe aborted.")
    }
  })

  // 4. Handlers
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditForm(prev => ({ ...prev, profilePic: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleOtpInputChange = (value, index) => {
    if (isNaN(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.substring(value.length - 1)
    setOtpDigits(newDigits)

    if (value && index < 5) {
      inputRefs[index + 1].current.focus()
    }

    if (newDigits.join("").length === 6 && index === 5) {
      setSecurityStep('new_password')
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current.focus()
    }
  }

  if (!isOpen) return null
  const cleanAvatar = editForm.profilePic?.startsWith("data:image") 
    ? editForm.profilePic
    : user.profilePic || "/avatar.png"



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-base-100 border border-base-300 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200">
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <h3 className="text-lg font-bold text-base-content">Account Settings</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:bg-base-300">
            <X className="size-5" />
          </button>
        </div>

        {/* TABS CONTROLLER CONTAINER */}
        <div className="bg-base-200/50 border-b border-base-300 p-2 flex flex-col sm:flex-row gap-1.5">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 w-full flex-1 ${
              activeTab === 'profile' 
                ? 'bg-base-100 text-primary shadow-xs border border-base-300/30' 
                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
            }`}
          >
            <User className="size-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Profile Settings</span>
          </button>
          
          <button 
            type="button"
            onClick={() => { setActiveTab('security'); setSecurityStep('request'); }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 w-full flex-1 ${
              activeTab === 'security' 
                ? 'bg-base-100 text-primary shadow-xs border border-base-300/30' 
                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
            }`}
          >
            <KeyRound className="size-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Security Management</span>
          </button>
        </div>

        {/* BODY PANEL MAIN BODY PORT CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* TAB 1: PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-fadeIn">
              {isEditingProfile ? (
                <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(editForm); }} className="space-y-4 text-left">
                  <div className="flex flex-col items-center mb-4 relative">
                    <div className="avatar group relative">
                      <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden bg-base-300">
                        <img src={cleanAvatar} alt="Avatar Preview" className="object-cover w-full h-full" />
                      </div>
                      <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera className="text-white size-6" />
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-xs opacity-50 mt-2 text-center w-full">Hover avatar photo cell to upload changes</p>
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full bg-base-200"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Bio Info</span></label>
                    <textarea 
                      className="textarea textarea-bordered h-24 bg-base-200" 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Write a short biography description..."
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="btn btn-ghost flex-1">Cancel</button>
                    <button type="submit" disabled={updateProfileMutation.isPending} className="btn btn-primary flex-1">
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5 text-left">
                  <div className="flex flex-col items-center p-4 bg-base-200 rounded-2xl border border-base-300/50 text-center relative">
                    <button 
                      type="button"
                      onClick={() => { setEditForm({ fullName: user.fullName || "", bio: user.bio || "", profilePic: user.profilePic || "" }); setIsEditingProfile(true); }}
                      className="btn btn-sm btn-circle btn-primary absolute top-3 right-3 shadow-md"
                      title="Edit Profile"
                    >
                      <Edit2 size={14} />
                    </button>
                    <div className="avatar mb-2">
                      <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                        <img src={user.profilePic || "/avatar.png"} alt="Profile" className="object-cover w-full h-full" />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-base-content leading-tight">{user.fullName || "Your Full Name"}</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-base-200 rounded-xl border border-base-300">
                      <Mail className="size-4 text-primary flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] block uppercase tracking-wide opacity-50 font-bold">Email Address</span>
                        <span className="text-sm text-base-content font-medium truncate block">{user.email || "No Email Bound"}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-base-200 rounded-xl border border-base-300">
                      <FileText className="size-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="w-full">
                        <span className="text-[10px] block uppercase tracking-wide opacity-50 font-bold">Bio Details</span>
                        <p className="text-sm text-base-content/80 font-medium mt-0.5 whitespace-pre-wrap leading-relaxed">
                          {user.bio || "No biography provided yet."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 🚨 UPGRADED DANGER ZONE WITH PASSWORD VERIFICATION & FEEDBACK REASONS */}
                  <div className="mt-4 pt-4 border-t border-base-300">
                    <div className="flex items-center gap-2 mb-3 text-error">
                      <ShieldAlert className="size-4 flex-shrink-0" />
                      <h4 className="text-xs uppercase tracking-wider font-extrabold">Danger Zone Actions</h4>
                    </div>

                    <div className="space-y-3">
                      
                      {/* ============================================== */}
                      {/* SUB-ITEM 1: DEACTIVATE ACCOUNT LAYOUT          */}
                      {/* ============================================== */}
                      <div className="p-4 bg-base-200/60 rounded-2xl border border-base-300/70 transition-all">
                        {!confirmDeactivate ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-left">
                              <p className="text-xs font-bold text-base-content">Deactivate Account</p>
                              <p className="text-[11px] text-base-content/60 mt-0.5 leading-normal">Temporarily mask your profile, feeds, and friends panel layout positions cleanly.</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => { setConfirmDeactivate(true); setConfirmDelete(false); setDangerZonePassword(""); setDangerZoneReason(""); }}
                              className="btn btn-xs bg-base-300 hover:bg-base-400 border-none text-base-content font-bold rounded-lg px-3 self-end sm:self-auto"
                            >
                              Deactivate
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 text-left animate-fadeIn">
                            <div>
                              <h5 className="text-xs font-bold text-warning uppercase tracking-wide">Deactivate Account Request</h5>
                              <p className="text-[11px] opacity-60">Please provide verification credentials to put your account into sleep mode.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="form-control">
                                <label className="text-[11px] font-bold mb-1 opacity-70">Why are you leaving? (Optional)</label>
                                <select 
                                  value={dangerZoneReason} 
                                  onChange={(e) => setDangerZoneReason(e.target.value)}
                                  className="select select-bordered select-xs w-full bg-base-100 font-medium text-xs h-8 min-h-8"
                                >
                                  <option value="">Choose a feedback reason...</option>
                                  <option value="Temporary break">Just need a temporary break</option>
                                  <option value="Privacy concerns">Privacy concerns</option>
                                  <option value="Not finding matches">Not finding language partners</option>
                                  <option value="Technical bugs">Encountering structural app bugs</option>
                                  <option value="Other">Other / Structural reason</option>
                                </select>
                              </div>

                              <div className="form-control">
                                <label className="text-[11px] font-bold mb-1 opacity-70">Confirm your secure Account Password</label>
                                <input 
                                  type="password"
                                  placeholder="Type password to confirm..."
                                  value={dangerZonePassword}
                                  onChange={(e) => setDangerZonePassword(e.target.value)}
                                  className="input input-bordered input-xs w-full bg-base-100 text-xs h-8 min-h-8 focus:outline-warning"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button 
                                type="button"
                                onClick={() => setConfirmDeactivate(false)}
                                className="btn btn-xs btn-ghost text-base-content/70 font-semibold px-2"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button"
                                disabled={deactivateAccountMutation.isPending || !dangerZonePassword}
                                onClick={() => deactivateAccountMutation.mutate({ password: dangerZonePassword, reason: dangerZoneReason })}
                                className="btn btn-xs btn-warning font-black text-white px-4"
                              >
                                {deactivateAccountMutation.isPending ? "Validating..." : "Confirm Deactivation"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ============================================== */}
                      {/* SUB-ITEM 2: PERMANENT DELETION WIPE LAYOUT     */}
                      {/* ============================================== */}
                      <div className="p-4 bg-error/5 rounded-2xl border border-error/20 transition-all">
                        {!confirmDelete ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-left">
                              <p className="text-xs font-bold text-error">Permanently Delete Account</p>
                              <p className="text-[11px] text-base-content/60 mt-0.5 leading-normal">Irreversibly drop your MongoDB collections node data and message chains.</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => { setConfirmDelete(true); setConfirmDeactivate(false); setDangerZonePassword(""); setDangerZoneReason(""); }}
                              className="btn btn-xs btn-error font-bold text-white rounded-lg px-3 self-end sm:self-auto"
                            >
                              <Trash2 size={12} />
                              Delete Account
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 text-left animate-fadeIn">
                            <div>
                              <h5 className="text-xs font-bold text-error uppercase tracking-wide">🔴 Permanent Destruction Alert</h5>
                              <p className="text-[11px] opacity-60">This process completely obliterates your message histories and cannot be undone.</p>
                            </div>

                            <div className="space-y-2">
                              <div className="form-control">
                                <label className="text-[11px] font-bold mb-1 text-error/80">Primary reason for account destruction?</label>
                                <input 
                                  type="text"
                                  placeholder="e.g., Leaving for good, making new profile..."
                                  value={dangerZoneReason}
                                  onChange={(e) => setDangerZoneReason(e.target.value)}
                                  className="input input-bordered input-xs w-full bg-base-100 text-xs h-8 min-h-8 border-error/30 focus:outline-error"
                                />
                              </div>

                              <div className="form-control">
                                <label className="text-[11px] font-bold mb-1 opacity-70">Enter Password to authenticate account destruction</label>
                                <input 
                                  type="password"
                                  placeholder="Verify account password..."
                                  value={dangerZonePassword}
                                  onChange={(e) => setDangerZonePassword(e.target.value)}
                                  className="input input-bordered input-xs w-full bg-base-100 text-xs h-8 min-h-8 border-error/30 focus:outline-error"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button 
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="btn btn-xs btn-ghost text-base-content/70 font-semibold px-2"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button"
                                disabled={deleteAccountMutation.isPending || !dangerZonePassword}
                                onClick={() => deleteAccountMutation.mutate({ password: dangerZonePassword, reason: dangerZoneReason })}
                                className="btn btn-xs btn-error font-black text-white px-4 shadow-md"
                              >
                                {deleteAccountMutation.isPending ? "Purging..." : "PERMANENTLY WIPE EVERYTHING"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fadeIn text-center">
              
              {securityStep === 'request' && (
                <div className="space-y-5 text-left">
                  <div className="bg-base-200 p-5 rounded-2xl border border-base-300 text-center space-y-3">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                      <KeyRound className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-base-content">Change Account Password</h4>
                      <p className="text-xs text-base-content/60 max-w-sm mx-auto mt-1">
                        To guarantee security configurations, we will dispatch a dynamic 6-digit email OTP challenge validation block prior to modifying your password.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => requestOtpMutation.mutate()}
                    disabled={requestOtpMutation.isPending}
                    className="btn btn-primary w-full rounded-xl normal-case font-bold"
                  >
                    {requestOtpMutation.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        Send Security OTP Code
                        <ArrowRight className="size-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {securityStep === 'verify_otp' && (
                <div className="space-y-5 animate-in zoom-in-95 duration-150">
                  <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-12 h-12 flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Verify Security Passcode</h4>
                    <p className="text-xs text-base-content/60 mt-1">Enter the validation sequence token dispatched to your inbox directory block row.</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={inputRefs[idx]}
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInputChange(e.target.value, idx)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        className="w-12 h-12 text-center text-xl font-bold input input-bordered bg-base-200 border-base-300 rounded-xl focus:outline-primary"
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-sm mx-auto">
                    <button type="button" onClick={() => setSecurityStep('request')} className="btn btn-sm btn-ghost flex-1 text-xs">Back</button>
                    <button 
                      type="button" 
                      onClick={() => setSecurityStep('new_password')} 
                      disabled={otpDigits.includes("")} 
                      className="btn btn-sm btn-primary flex-1 text-xs"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {securityStep === 'new_password' && (
                <form 
                  onSubmit={(e) => { e.preventDefault(); updatePasswordMutation.mutate(); }} 
                  className="space-y-4 text-left animate-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="bg-base-200 p-4 rounded-xl border border-base-300 text-sm font-semibold text-primary flex items-center gap-2">
                    <Lock size={16} /> Identity Token Code Verified Successfully!
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Type New Secure Password</span></label>
                    <input 
                      type="password" 
                      placeholder="********" 
                      minLength={6}
                      className="input input-bordered w-full bg-base-200"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={updatePasswordMutation.isPending || newPassword.length < 6} 
                    className="btn btn-primary w-full rounded-xl mt-2"
                  >
                    {updatePasswordMutation.isPending ? "Committing Secrets..." : "Update Database Password"}
                  </button>
                </form>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SettingsModal