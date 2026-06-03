// import Link from 'daisyui/components/link'
import { Zap, Lock, RefreshCw } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react' 
import { Link, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { signup, verifyOTP } from '../lib/api' 
// 1. Import the Google login button and helper components
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

const SignUPPage = () => {
    const [signupData, setSignupData] = useState({
        fullName: "",
        email: "",
        password: "",
    })
    const [isChecked, setIsChecked] = useState(false);

    // 🔒 OTP Management States
    const [requireOtpStep, setRequireOtpStep] = useState(false);
    const [targetUserId, setTargetUserId] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    
    // ⏳ Resend Cooldown Counter State
    const [resendCooldown, setResendCooldown] = useState(0);
    
    // Keyboard focus array trackers for input cell navigation
    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // ⏳ Cooldown Countdown Timer Lifecycle Hook
    useEffect(() => {
        if (resendCooldown === 0) return;
        
        const intervalId = setInterval(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [resendCooldown]);

    // Mutation for regular Email/Password signup
    // 📄 Location: SignUpPage.jsx
const { mutate: signupMutation, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
        // 💡 Since api.js now unwraps response.data, read fields directly!
        if (data?.step === "REQUIRE_OTP" || data?.userId) {
            setTargetUserId(data.userId);
            setRequireOtpStep(true); 
            setResendCooldown(60); 
            toast.success("Verification code sent to your email!");
        } else {
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            toast.success("Account created successfully!");
            navigate("/");
        }
    },
    onError: (err) => {
        toast.error(err.response?.data?.message || "Signup failed");
    }
});

    // 🔒 🔢 Final 6-Digit OTP Verification Mutation Hook
 // 📄 SignUpPage.jsx
// 📄 Location: SignUpPage.jsx
// 📄 Location: SignUpPage.jsx - Line 66
const { mutate: verifyOtpMutation, isPending: isVerifyingOtp, error: otpError } = useMutation({
    mutationFn: (otpCode) => {
        // 🚀 ALWAYS passes along both tracking variables so lookup never fails!
        return verifyOTP({ 
            userId: targetUserId,
            email: signupData.email, // 👈 Grabs directly from intact form memory layout
            otp: otpCode
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        toast.success("Account verified successfully!");
        navigate("/"); 
    },
    onError: (err) => {
        toast.error(err.response?.data?.message || "Invalid OTP verification code");
    }
});

    // 2. Mutation for Google OAuth Endpoint Authentication
    const { mutate: googleLoginMutation, isPending: isGooglePending } = useMutation({
        mutationFn: async (googleToken) => {
            const res = await axiosInstance.post('/auth/google', { token: googleToken });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["authUser"], data.user);
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            toast.success(`Welcome to hiii, ${data.user.fullName}!`);
            navigate("/");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Google Authentication Failed");
        }
    });

    const handleSignup = (e) => {
        e.preventDefault()
        if (!isChecked) {
            toast.error("You must agree to the terms of service & privacy policy");
            return;
        }
        signupMutation(signupData)
    }

    const handleResendClick = () => {
        if (resendCooldown > 0) return;
        signupMutation(signupData);
        setResendCooldown(60); 
    };

    // 🔢 Smart OTP Keyboard Navigation Controllers
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
            // 🚀 Triggers mutation passing the clean text string directly
            verifyOtpMutation(finalCode);
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    return (
        <div className="h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" data-theme="forest">
            <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">
                
                <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col justify-center">
                    <div className="mb-4 flex items-center justify-start gap-2">
                        <Zap className='size-9 text-primary'/>
                        <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary tracking-wider'>
                            hiii
                        </span>
                    </div>

                    {requireOtpStep ? (
                        <div className="w-full text-center py-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-12 h-12 flex items-center justify-center">
                                <Lock size={24} />
                            </div>
                            
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Verify Your Account</h2>
                                <p className="text-sm opacity-70 mt-1 px-4">
                                    We sent a verification code to your email. Please enter it below to finish.
                                </p>
                            </div>

                            {otpError && (
                                <div className='alert alert-error text-sm rounded-xl py-2.5 max-w-sm mx-auto'>
                                    <span>{otpError?.response?.data?.message || "Invalid verification code."}</span>
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
                                <button 
                                    onClick={() => verifyOtpMutation(otpDigits.join(""))}
                                    disabled={otpDigits.includes("") || isVerifyingOtp}
                                    className="btn btn-primary w-full"
                                >
                                    {isVerifyingOtp ? (
                                        <>
                                            <span className='loading loading-spinner loading-xs'></span>
                                            Verifying Code...
                                        </>
                                    ) : "Verify & Activate"}
                                </button>

                                <button 
                                    type="button"
                                    onClick={handleResendClick}
                                    disabled={isPending || resendCooldown > 0}
                                    className="btn btn-ghost btn-sm text-xs gap-1.5 opacity-60 hover:opacity-100 mx-auto block disabled:opacity-40"
                                >
                                    <RefreshCw size={12} className={isPending ? "animate-spin" : ""} /> 
                                    {resendCooldown > 0 ? (
                                        <span>Resend Code available in <b className="text-primary font-mono">{resendCooldown}s</b></span>
                                    ) : (
                                        "Resend Code to Email"
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className='w-full'>
                            {error && (
                                <div className='alert alert-error mb-4'>
                                    <span>{error.response?.data?.message || error.message}</span>
                                </div>
                            )}

                            <form onSubmit={handleSignup}>
                                <div className='space-y-4'>
                                    <div>
                                        <h2 className='text-xl font-semibold'>Create an Account</h2>
                                        <p className='text-sm opacity-70'>Join hiii and connect with your friends</p>
                                    </div>

                                    <div className='space-y-3'>
                                        <div className='form-control w-full'>
                                            <label className='label'><span className='label-text'>Full Name</span></label>
                                            <input 
                                                type="text"
                                                placeholder='Myra' 
                                                className='input input-bordered w-full'
                                                value={signupData.fullName}
                                                onChange={(e) => setSignupData({...signupData, fullName: e.target.value})}
                                                required
                                            />
                                        </div>

                                        <div className='form-control w-full'>
                                            <label className='label'><span className='label-text'>Email</span></label>
                                            <input 
                                                type="email"
                                                placeholder='myra@example.com' 
                                                className='input input-bordered w-full'
                                                value={signupData.email}
                                                onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                                                required
                                            />
                                        </div>

                                        <div className='form-control w-full'>
                                            <label className='label'><span className='label-text'>Password</span></label>
                                            <input 
                                                type="password"
                                                placeholder='*******' 
                                                className='input input-bordered w-full'
                                                value={signupData.password}
                                                onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                                                required
                                            />
                                        </div>

                                        <div className='form-control pt-1'>
                                            <div className='flex items-start gap-3 select-none'>
                                                <input 
                                                    type="checkbox" 
                                                    className='checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0' 
                                                    checked={isChecked}
                                                    onChange={(e) => setIsChecked(e.target.checked)}   
                                                />
                                                <span className='text-xs leading-tight text-base-content'>
                                                    I agree to the <span className='text-primary hover:underline cursor-pointer font-medium'>terms of service</span> & <span className='text-primary hover:underline cursor-pointer font-medium'>privacy policy</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button className='btn btn-primary w-full' type="submit" disabled={isPending || isGooglePending}>
                                        {isPending ? <span className='loading loading-spinner loading-xs'></span> : "Create Account"}
                                    </button>

                                    <div className="divider text-xs opacity-50 my-4">OR</div>

                                    <div className="flex justify-center w-full">
                                        {/* Fixed Google button width tracking syntax warning */}
                                        <GoogleLogin
                                            onSuccess={(credentialResponse) => googleLoginMutation(credentialResponse.credential)}
                                            onError={() => toast.error("Google Popup Auth failed")}
                                            theme="filled_black" 
                                            shape="pill"
                                            width={320}
                                        />
                                    </div>

                                    <div className='text-center mt-4'>
                                        <p className='text-sm'>
                                            Already have an account? <Link to='/login' className='text-primary hover:underline'>Sign In</Link>
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

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

export default SignUPPage;