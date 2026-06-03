import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Zap, Lock, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react' // ⏳ Added useEffect for countdown lifecycle management
import { login, verifyOTP, requestPasswordOTP, resetPassword } from '../lib/api'
import { Link, useNavigate } from 'react-router' 
import toast from 'react-hot-toast'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // 🔒 OTP & Recovery Multi-Step State System
  const [requireOtpStep, setRequireOtpStep] = useState(false);
  const [stepContext, setStepContext] = useState("login"); // "login" | "forgot_password" | "reset_success"
  const [targetUserId, setTargetUserId] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  
  // ⏳ Resend Cooldown Counter State
  const [resendCooldown, setResendCooldown] = useState(0);

  // 📝 Passwords Form States for Recovery Step
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ⏳ Cooldown Countdown Timer Lifecycle Hook
  useEffect(() => {
    if (resendCooldown === 0) return;
    
    const intervalId = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [resendCooldown]);

  // 1. Initial Login Trigger Mutation
  const { mutate: loginMutation, isPending, error } = useMutation({
  mutationFn: login,
  onSuccess: async (data) => { // 🚀 Added async here
    if (data?.step === "REQUIRE_OTP") {
      setTargetUserId(data.userId);
      setStepContext("login");
      setRequireOtpStep(true);
    } else {
      // 🚀 THE FIX: Await the query invalidation so the app state updates BEFORE redirecting
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/");
    }
  }
});

// 2. 🔢 Login 6-Digit OTP Verification Mutation
const { mutate: verifyOtpMutation, isPending: isVerifyingOtp, error: otpError } = useMutation({
  mutationFn: (otpCode) => verifyOTP({ userId: targetUserId, otp: otpCode }),
  onSuccess: async () => { // 🚀 Added async here
    await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    navigate("/");
  }
});

  // 3. ✉️ Forgot Password: Send OTP Code Mutation
  const { mutate: sendRecoveryOtpMutation, isPending: isSendingRecoveryOtp } = useMutation({
    mutationFn: () => requestPasswordOTP({ email: loginData.email }),
    onSuccess: () => {
      toast.success("Password reset code sent to your email!");
      setRequireOtpStep(true);
      setResendCooldown(60); // Trigger a 60-second block window on success
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to issue password recovery request.");
    }
  });

  // 4. 💾 Reset Password: Commit New Password to Database
  const { mutate: commitResetMutation, isPending: isUpdatingPassword } = useMutation({
    mutationFn: () => resetPassword({
      email: loginData.email,
      otp: otpDigits.join(""),
      newPassword: newPassword
    }),
    onSuccess: () => {
      toast.success("Password updated in database cleanly!");
      setStepContext("reset_success");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Reset token validation failed.");
    }
  });

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  const handleForgotPasswordClick = () => {
    if (!loginData.email) {
      toast.error("Please fill in your email address first!");
      return;
    }
    setStepContext("forgot_password");
    sendRecoveryOtpMutation();
  };

  const handleResendClick = () => {
    if (resendCooldown > 0) return;

    if (stepContext === "login") {
      loginMutation(loginData);
    } else {
      sendRecoveryOtpMutation();
    }
    setResendCooldown(60); // Reset timer window back to 60s
  };

  // 🔢 Smart OTP Keyboard Management
  const handleOtpInputChange = (value, index) => {
    if (isNaN(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }

    const finalCode = newDigits.join("");
    if (finalCode.length === 6 && index === 5) {
      if (stepContext === "login") {
        // Mode A: Handle standard account login verification
        verifyOtpMutation(finalCode);
      } else if (stepContext === "forgot_password") {
        // Mode B: Hold tight! The screen will change dynamically 
        // once the code passes validation without missing keys.
        toast.success("Code filled! Ready to save your new password.");
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    commitResetMutation();
  };

  const resetFlowState = () => {
    setRequireOtpStep(false);
    setStepContext("login");
    setOtpDigits(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setResendCooldown(0);
  };

  return (
    <div className='h-screen flex items-center justify-center p-4 sm:p-6 md:p-8' data-theme="forest">
      <div className='border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden'>
        
        {/* LEFT COMPONENT COLUMN CONTEXT PANEL CONTAINER */}
        <div className='w-full lg:w-1/2 p-4 sm:p-8 flex flex-col justify-center relative'>
          
          {/* Logo Branding */}
          <div className='mb-4 flex items-center justify-start gap-2'>
            <Zap className='size-9 text-primary'/>
            <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider'>hiii</span>
          </div>

          {/* VIEW A: SUCCESS STATUS DISPLAY SCREEN */}
          {stepContext === "reset_success" ? (
            <div className="w-full text-center py-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="mx-auto bg-success/10 text-success p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-xs">
                <CheckCircle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Password Updated!</h2>
                <p className="text-sm opacity-70 mt-1">Your credentials have been securely committed to our database.</p>
              </div>
              <button type="button" onClick={resetFlowState} className="btn btn-primary w-full max-w-xs mx-auto block">
                Return to Sign In
              </button>
            </div>
          ) : 

          /* VIEW B: CHOOSE NEW PASSWORD ENTRY FORM DISPLAY LINK */
          requireOtpStep && stepContext === "forgot_password" && !otpDigits.includes("") ? (
            <form onSubmit={handlePasswordResetSubmit} className="w-full space-y-4 animate-in slide-in-from-bottom-3 duration-200 text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Choose New Password</h2>
                <p className="text-sm opacity-70">Update your account with a strong verification secret.</p>
              </div>

              <div className="form-control w-full space-y-1">
                <label className="label"><span className="label-text font-medium">New Password</span></label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    minLength={6}
                    className="input input-bordered w-full pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-control w-full space-y-1">
                <label className="label"><span className="label-text font-medium">Confirm New Password</span></label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    minLength={6}
                    className="input input-bordered w-full pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isUpdatingPassword} className="btn btn-primary w-full mt-2">
                {isUpdatingPassword ? <span className="loading loading-spinner loading-xs" /> : "Save New Password"}
              </button>
            </form>
          ) :

          /* VIEW C: 6-DIGIT OTP SECURITY PROMPT MODULE */
          requireOtpStep ? (
            <div className="w-full text-center py-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <button type="button" onClick={resetFlowState} className="absolute top-4 left-4 btn btn-ghost btn-sm text-xs gap-1 opacity-60">
                <ArrowLeft size={14} /> Cancel
              </button>
              
              <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-12 h-12 flex items-center justify-center">
                <Lock size={24} />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {stepContext === "forgot_password" ? "Reset Verification" : "Security Check"}
                </h2>
                <p className="text-sm opacity-70 mt-1 px-4">
                  We have sent verification security code directly to your email.
                </p>
              </div>

              {otpError && (
                <div className='alert alert-error text-sm rounded-xl py-2.5 max-w-sm mx-auto'>
                  <span>{otpError?.response?.data?.message || "Invalid code sequence entry."}</span>
                </div>
              )}

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
                    className="w-12 h-12 text-center text-xl font-bold input input-bordered bg-base-200 border-base-300 rounded-xl focus:outline-primary focus:outline-2"
                  />
                ))}
              </div>

              <div className="max-w-sm mx-auto space-y-3">
                {stepContext === "login" ? (
                  <button 
                    type="button"
                    onClick={() => verifyOtpMutation(otpDigits.join(""))}
                    disabled={otpDigits.includes("") || isVerifyingOtp}
                    className="btn btn-primary w-full"
                  >
                    {isVerifyingOtp ? "Validating Code..." : "Verify Identity"}
                  </button>
                ) : (
                  <button 
                    type="button"
                    disabled={otpDigits.includes("")}
                    className="btn btn-primary w-full"
                  >
                    Code Entered Successfully
                  </button>
                )}

                {/* ⏳ Cooldown-Aware Action Button Element Layer */}
                <button 
                  type="button"
                  onClick={handleResendClick}
                  disabled={isPending || isSendingRecoveryOtp || resendCooldown > 0}
                  className="btn btn-ghost btn-sm text-xs gap-1.5 opacity-60 hover:opacity-100 mx-auto block disabled:opacity-40"
                >
                  <RefreshCw size={12} className={(isPending || isSendingRecoveryOtp) ? "animate-spin" : ""} /> 
                  {resendCooldown > 0 ? (
                    <span>Resend Code available in <b className="text-primary font-mono">{resendCooldown}s</b></span>
                  ) : (
                    "Resend Code to Email"
                  )}
                </button>
              </div>
            </div>
          ) : (
            
            /* VIEW D: STANDARD USER EMAIL/PASSWORD INPUT FIELD ELEMENTS */
            <div className='w-full text-left'>
              {error && (
                <div className='alert alert-error mb-4'>
                  <span><p>{error?.response?.data?.message || "An unexpected error occurred"}</p></span>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className='space-y-4'>
                  <div>
                    <h2 className='text-xl font-semibold'>Welcome back</h2>
                    <p className='text-sm opacity-70'>Sign in to continue</p>
                  </div>

                  {/* Email Input */}
                  <div className='flex flex-col gap-3'>
                    <div className='form-control w-full space-y-2'>
                      <label className='label'>
                        <span className='label-text'>Email</span>
                      </label>
                      <input 
                        type="email"
                        placeholder='hello@example.com'
                        className='input input-bordered w-full'
                        value={loginData.email}
                        onChange={(e)=>setLoginData({...loginData, email:e.target.value})} 
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className='form-control w-full space-y-1 relative'>
                    <label className='label'>
                      <span className='label-text font-medium'>Password</span>
                    </label>
                    
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder='*********'
                        className='input input-bordered w-full pr-10' 
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} 
                        required
                      />
                      
                      <button
                        type="button" 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50 hover:text-base-content"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>

                    {/* 🔑 FORGOT PASSWORD BUTTON ACTION ANCHOR LINK */}
                    <div className="text-right pt-1.5">
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        disabled={isSendingRecoveryOtp}
                        className="text-xs text-primary font-semibold hover:underline bg-transparent border-none p-0 inline-block transition-colors"
                      >
                        {isSendingRecoveryOtp ? "Sending link..." : "Forgot Password?"}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button type='submit' className='btn btn-primary w-full' disabled={isPending}>
                    {isPending ? "Signing in..." : "Sign In"}
                  </button>

                  {/* Toggle Route Jump Link */}
                  <div className='text-center mt-4'>
                    <p className='text-sm'>
                      Don't have an account? {" "}
                      <Link to='/signup' className='text-primary hover:underline'>Create One</Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR PANEL DISPLAY */}
        <div className='hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center'>
          <div className='max-w-md p-8'>
            <div className='relative aspect-square max-w-sm mx-auto'>
              <img src="/i.png" alt="Chat Application" className='w-full h-full' />
            </div>
            <div className='text-center space-y-3 mt-6'>
              <h2 className='text-xl font-semibold'>Connect with your friends</h2>
              <p className='opacity-70'>Connect with your friends all across the globe</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LoginPage