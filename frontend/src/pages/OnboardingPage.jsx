import React, { useState, useRef } from 'react' // Added useRef
import useAuthUser from '../hooks/useAuthUser'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast, Toaster } from 'react-hot-toast'
import { completeOnboarding } from '../lib/api'
import { CameraIcon, LoaderIcon, ShuffleIcon, UploadIcon, Zap } from 'lucide-react' // Added UploadIcon
import { COUNTRIES, LANGUAGES } from '../constants'

const OnboardingPage = () => {
  const { authUser } = useAuthUser()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null) // Ref to trigger the hidden file input

  const [formState, setformState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningLanguage: authUser?.learningLanguage || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "", // This will temporarily hold base64 on frontend, then get the ImageKit URL from backend
  })

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data) => {
      console.log("MUTATION SUCCESSFUL:", data);
      toast.success("Profile Updated!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      console.log("MUTATION ERROR:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formState.fullName.trim()) return toast.error("Full Name is required");
    
    console.log("Sending form data to backend:", formState);
    onboardingMutation(formState)
  }

  // 1. Handle file selection and conversion to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate if it's an image file
    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG/JPG)");
    }

    // Validate size (e.g., max 4MB) to prevent large payloads
    if (file.size > 4 * 1024 * 1024) {
      return toast.error("Image size must be less than 4MB");
    }

    const reader = new FileReader();
    reader.readAsDataURL(file); // Convert to Base64 data-URI string
    reader.onloadend = () => {
      setformState({ ...formState, profilePic: reader.result });
      toast.success("Image selected successfully");
    };
  };

  return (
    <div className='min-h-screen bg-base-100 flex items-center justify-center p-4'>
      <div className='card bg-base-200 w-full max-w-3xl shadow-xl'>
        <div className='card-body p-6 sm:p-8'>
          <div className='text-2xl sm:text-3xl font-bold text-center mb-6'>
            Complete Your Profile
          </div>
          <form onSubmit={handleSubmit} className='space-y-6'>
            
            {/* Profile pic handler */}
            <div className='flex flex-col items-center justify-center space-y-4'>
              {/* Image preview box */}
              <div className='size-32 rounded-full bg-base-300 overflow-hidden relative group border-2 border-dashed border-base-content/20 flex items-center justify-center'>
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic} 
                    alt="Profile Preview" 
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <CameraIcon className='size-12 text-base-content opacity-40' />
                )}
              </div>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden" 
              />

              {/* Action Buttons */}
              <div className='flex items-center gap-2'>
                <button 
                  type='button' 
                  onClick={() => fileInputRef.current.click()} // Programmatically open file dialog
                  className='btn btn-accent btn-sm sm:btn-md rounded-2xl'
                >
                  <UploadIcon className='size-4 mr-2'/>
                  Upload Photo
                </button>
              </div>
            </div>

            {/* Full name */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>Full Name</span>
              </label>
              <input type="text" 
                name='fullName'
                value={formState.fullName}
                onChange={(e) => setformState({ ...formState, fullName: e.target.value })}
                className='input input-bordered w-full'
                placeholder='Your full Name'
              />
            </div>
              
            {/* Bio */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>Bio</span>
              </label>
              <textarea 
                name="bio"
                value={formState.bio}
                onChange={(e) => setformState({ ...formState, bio: e.target.value })}
                className='textarea textarea-bordered h-24 w-full'
                placeholder='Tell us about yourself'
              />
            </div>

            {/* Native Language */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>Native Language</span>
              </label>
              <select
                value={formState.nativeLanguage}
                onChange={(e) => setformState({ ...formState, nativeLanguage: e.target.value })}
                className='select select-bordered w-full'
              >
                <option value="">Select your native language</option>
                {LANGUAGES.map((lang) => (
                  <option key={`native-${lang}`} value={lang.toLowerCase()}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Learning Language */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>Learning Language</span>
              </label>
              <select
                value={formState.learningLanguage}
                onChange={(e) => setformState({ ...formState, learningLanguage: e.target.value })}
                className='select select-bordered w-full'
              >
                <option value="">Select language you want to learn</option>
                {LANGUAGES.map((lang) => (
                  <option key={`learning-${lang}`} value={lang.toLowerCase()}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className='form-control'>
              <label className='label'>
                <span className='label-text'>Location</span>
              </label>
              <select 
                name="location"
                value={formState.location}
                onChange={(e) => setformState({ ...formState, location: e.target.value })}
                className='select select-bordered w-full'
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((country) => (
                  <option key={`location-${country}`} value={country.toLowerCase()}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button className='btn btn-primary w-full rounded-2xl text-white' disabled={isPending} type='submit'>
              {!isPending ? (
                <>
                  <Zap className='size-5 mr-2'/>
                  Proceed
                </>
              ) : (
                <>
                  <LoaderIcon className='animate-spin size-5 mr-2'/>
                  Proceeding...
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage