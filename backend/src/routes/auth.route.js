import express from 'express'
import { login, logout, verifyOTP,onboard, signup, googleAuth,requestPasswordOtp, updatePassword, updateProfile,deactivateAccount, deleteAccount } from '../controllers/auth.controller.js'
import { protectRoute } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/signup',signup)
router.post('/login',login)
router.post("/verify-otp", verifyOTP);
router.post('/logout',protectRoute,logout)
router.post("/google", googleAuth);


router.post('/onboarding',protectRoute,onboard)
router.post("/request-password-otp", requestPasswordOtp);
router.post("/update-password", updatePassword);
router.put("/update-profile", protectRoute, updateProfile);
router.post("/deactivate", protectRoute, deactivateAccount);
router.delete("/delete-account", protectRoute, deleteAccount);
router.get('/me',protectRoute,(req,res)=>{
    res.status(200).json({success: true, user: req.user})
}) 

export default router