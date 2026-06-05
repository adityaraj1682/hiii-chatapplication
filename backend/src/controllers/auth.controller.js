import userModel from "../models/User.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { upsertStreamUser, deleteStreamUser, deactivateStreamUser, reactivateStreamUser } from "../config/stream.js";
import ImageKit from "imagekit";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";       // 🔒 Added for crypto secure OTP strings
import nodemailer from "nodemailer"; // 📧 Added for email dispatches
import validator from 'validator';
import { UAParser } from "ua-parser-js"; // 📱 Added for user-agent parsing
import { compressBase64Image } from "../utils/compressor.js";
dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, // Your 16-character Google App Password
  },
});

async function generateAndSendOTP(user, res, messageSuccess, isBrandNewUser = false) {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Set expiration window (Valid for 10 minutes)
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const mailOptions = {
      from: `"HiiiChat Security" <${process.env.EMAIL_USER}>`, 
      to: user.email,
      subject: "🔒 Your 6-Digit Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; text-align: center;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">HiiiChat Verification</h2>
          <p style="font-size: 14px; color: #64748b;">Use this secure code to finalize your authentication verification step:</p>
          <div style="background-color: #f1f5f9; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px; margin: 20px 0; color: #1e293b; border-radius: 8px;">
            ${otp}
          </div>
          <p style="font-size: 11px; color: #94a3b8;">This secure one-time passcode token will completely expire inside 10 minutes.</p>
        </div>
      `,
    };

    // Attempt email delivery
    await mailTransporter.sendMail(mailOptions);
    
    return res.status(200).json({ 
      step: "REQUIRE_OTP", 
      userId: user._id, 
      message: messageSuccess 
    });

  } catch (error) {
    console.error("❌ Mail dispatch failed or crashed during execution pipeline:", error.message);
    
    try {
      if (isBrandNewUser) {
        await userModel.findByIdAndDelete(user._id);
      } else {
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();
      }
    } catch (dbError) {
      console.error("❌ Failed to perform cleanup database operation:", dbError.message);
    }

    return res.status(502).json({ 
      message: "Email delivery failed. The email service rejected the message or address domain." 
    });
  }
}

export async function signup(req, res) {
    const { fullName, email, password } = req.body;
    try {
        if (!email || !fullName || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format structure." });
        }

        let existingUser = await userModel.findOne({ email });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ message: "Email already registered" });
            }
            
            existingUser.fullName = fullName;
            existingUser.password = password; 
            await existingUser.save();
            
            await generateAndSendOTP(existingUser, res, "Signup initiated. Verification OTP re-sent.", false);
        } else {
            const newUser = await userModel.create({
                email,
                fullName,
                password 
            });

            await generateAndSendOTP(newUser, res, "Signup initiated. Verification OTP sent.", true);
        }

    } catch (error) {
        console.log('Error in signup:', error.message);
        res.status(500).json({ message: "Internal Server error" });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const isPasswordCorrect = await user.matchPassword(password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

        let requireOTP = false;
        console.log("DEBUG -> user.lastLogoutAt:", user.lastLogoutAt);

        if (user.lastLogoutAt) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            console.log("DEBUG -> 7 Days Ago Date Boundary:", sevenDaysAgo);

            if (user.lastLogoutAt < sevenDaysAgo) {
                requireOTP = true; 
            }
        } else {
            requireOTP = false;
        }

        if (requireOTP) {
            console.log(`🔒 Security: Generating login OTP challenge for ${user.email} (Inactive > 7 days)`);
            return await generateAndSendOTP(user, res, "Login challenge. Security OTP sent.");
        } else {
            console.log(`⚡ Fast-Pass: User was active within the 7-day window. Skipping OTP requirement.`);
            
            // 📱 SESSIONS TRACKING STRUCTURING WITH UA-PARSER
            const parser = new UAParser(req.headers['user-agent']);
            const uaResult = parser.getResult();
            const deviceType = uaResult.device.type || "Desktop";
            const os = `${uaResult.os.name || "Unknown OS"} ${uaResult.os.version || ""}`.trim();
            const browser = `${uaResult.browser.name || "Unknown Browser"} ${uaResult.browser.version || ""}`.trim();
            const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "0.0.0.0";
            const tokenVersion = crypto.randomBytes(16).toString("hex");

            if (!user.sessions) {
                user.sessions = [];
            }

            // 🚀 FIXED: Removed the broken duplicate block and used uniform properties with a clean fallback ID string mapping wrapper
            user.sessions.push({
                _id: crypto.randomUUID(), // Safe identification generation
                tokenVersion,
                deviceType,
                os,
                browser,
                ipAddress,
                createdAt: new Date()
            });

            await user.save();

            const token = jwt.sign({ userId: user._id, tokenVersion }, process.env.JWT_SECRET_KEY, {
                expiresIn: "2d"
            });

            const isLocalhost = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');

                res.cookie('jwt', token, {
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                    
                    // ✅ If it's localhost, use "lax" so Safari can read across ports. Otherwise, keep "none" for production.
                    sameSite: isLocalhost ? "lax" : "none",
                    
                    // ✅ Turn off secure ONLY on localhost so Safari accepts HTTP cookies. Keep it true on production HTTPS.
                    secure: !isLocalhost 
                });

            return res.status(200).json({
                success: true,
                _id: user._id,
                fullName: user.fullName, 
                email: user.email,
                profilePic: user.profilePic,
                message: "Logged in successfully (OTP skipped)"
            });
        }

    } catch (error) {
        console.log("Error in login controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function verifyOTP(req, res) {
    try {
        console.log("📥 RECEIVED BODY:", req.body);
        const { userId, email, otp } = req.body;

        if (!otp || (!userId && !email)) {
            return res.status(400).json({ message: "Missing required verification data" });
        }

        let user;
        if (userId) {
            user = await userModel.findById(userId);
        }
        if (!user && email) {
            user = await userModel.findOne({ email });
        }
        
        console.log("🔍 MONGO DB DATA:", {
            foundUser: !!user,
            savedOtpCode: user?.otpCode,
            submittedOtpCode: otp,
            hasExpired: user ? (new Date() > user.otpExpiresAt) : null
        });
        
        if (!user) return res.status(404).json({ message: "User session expired or account not found" });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        if (new Date() > user.otpExpiresAt) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one" });
        }

        user.otpCode = null;
        user.otpExpiresAt = null;
        user.isVerified = true; 

        // 📱 SESSIONS TRACKING STRUCTURING WITH UA-PARSER
        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();
        const deviceType = uaResult.device.type || "Desktop";
        const os = `${uaResult.os.name || "Unknown OS"} ${uaResult.os.version || ""}`.trim();
        const browser = `${uaResult.browser.name || "Unknown Browser"} ${uaResult.browser.version || ""}`.trim();
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "0.0.0.0";
        const tokenVersion = crypto.randomBytes(16).toString("hex");

        if (!user.sessions) {
            user.sessions = [];
        }

        user.sessions.push({
            _id: crypto.randomUUID(),
            tokenVersion,
            deviceType,
            os,
            browser,
            ipAddress,
            createdAt: new Date()
        });
        await user.save();

        try {
            await upsertStreamUser({
                id: user._id.toString(),
                name: user.fullName,
            });
            console.log(`Stream user dynamically created for ${user.fullName}`);
        } catch (streamErr) {
            console.log('Stream sync skipped or failed:', streamErr.message);
        }

        const token = jwt.sign({ userId: user._id, tokenVersion }, process.env.JWT_SECRET_KEY, {
            expiresIn: "2d"
        });

        res.cookie('jwt', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"
        });

        return res.status(200).json({ success: true, user });

    } catch (error) {
        console.error("Error in verifyOTP controller:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function logout(req, res) {
    try {
        if (req.user?._id) {
            const currentTokenVersion = req.tokenPayload?.tokenVersion || req.userTokenVersion; 
            
            await userModel.findByIdAndUpdate(req.user._id, {
                lastLogoutAt: new Date(),
                $pull: { sessions: { tokenVersion: currentTokenVersion } }
            });
            console.log(`🧼 SUCCESS -> Stamped lastLogoutAt and pulled current session for user: ${req.user.email}`);
        } else {
            console.log("❌ ERROR -> req.user._id is missing! Is this route protected?");
        }

        res.clearCookie("jwt"); 
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    
    // 🚀 MEMORY FIX: Destructure out fields, using 'let' for profilePic so we can wipe it safely
    let { fullName, bio, nativeLanguage, learningLanguage, location, profilePic } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location || !profilePic) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location",
          !profilePic && "profilePic"
        ].filter(Boolean)
      });
    }

    let imageUrl = profilePic; 

    if (profilePic && profilePic.startsWith("data:image/")) {
      console.log("📸 Raw avatar image intercepted. Executing memory-safe backend compression...");
      
      // 🚀 THE MAGIC LINE: Compress the raw avatar base64 string down
      const compressedBase64 = await compressBase64Image(profilePic, 60);
      
      // 🧼 IMMEDIATE RECLAIM: Wipe the client's heavy uncompressed payload out of RAM
      profilePic = null;
      req.body.profilePic = null;

      if (compressedBase64) {
        console.log("Valid compressed avatar payload ready. Syncing with ImageKit...");
        try {
          const uploadResponse = await imagekit.upload({
            file: compressedBase64, // 🚀 Uses the lightweight compressed string
            fileName: `avatar_${userId}_${Date.now()}.png`,
            folder: "/user_profiles",
          });

          imageUrl = uploadResponse.url; 
          console.log("ImageKit upload successful! URL:", imageUrl);

        } catch (ikError) {
          console.error("ImageKit SDK Upload Failure Details:", ikError);
          return res.status(500).json({ 
            message: "Image cloud sync failed. Please check backend .env API keys." 
          });
        } finally {
          // Clean up the remaining compression string block from memory entirely
          compressedBase64 = null;
        }
      }
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        fullName,
        bio,
        nativeLanguage,
        learningLanguage,
        location,
        profilePic: imageUrl, 
        isOnboarded: true
      },
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "", 
        bio: updatedUser.bio,
        location: updatedUser.location,
        nativeLanguage: updatedUser.nativeLanguage,
        learningLanguage: updatedUser.learningLanguage
      });
      console.log("Stream user updated with clean onboarding metadata records");
    } catch (streamError) {
      console.error("Stream API Error:", streamError.message);
    }

    return res.status(200).json(updatedUser);

  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: "Internal Server error" });
  }
}
export async function googleAuth(req, res) {
    const { token } = req.body;
    try {
        if (!token) {
            return res.status(400).json({ message: "Google ID Token is missing" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();
        let user = await userModel.findOne({ email });

        if (!user) {
            console.log(`Google Auth: Registering brand new email node -> ${email}`);
            
            const randomPassword = Math.random().toString(36).slice(-16);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await userModel.create({
                fullName: name,
                email: email,
                password: hashedPassword,
                profilePic: picture || "",
                isOnboarded: false,
                isVerified: true 
            });

            await upsertStreamUser({
                id: user._id.toString(),
                name: user.fullName,
                image: user.profilePic || ""
            });
            console.log(`Stream account initialized for Google User: ${user.fullName}`);
        }

        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();
        const deviceType = uaResult.device.type || "Desktop";
        const os = `${uaResult.os.name || "Unknown OS"} ${uaResult.os.version || ""}`.trim();
        const browser = `${uaResult.browser.name || "Unknown Browser"} ${uaResult.browser.version || ""}`.trim();
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0";
        const tokenVersion = crypto.randomBytes(16).toString("hex");

        if (!user.sessions) {
            user.sessions = [];
        }

        user.sessions.push({
            _id: crypto.randomUUID(),
            tokenVersion,
            deviceType,
            os,
            browser,
            ipAddress,
            createdAt: new Date()
        });
        await user.save();

        const sessionToken = jwt.sign({ userId: user._id, tokenVersion }, process.env.JWT_SECRET_KEY, {
            expiresIn: "2d"
        });

        res.cookie('jwt', sessionToken, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"
        });

        return res.status(200).json({ success: true, user });

    } catch (error) {
        console.error("Critical failure in Google Auth Engine:", error.message);
        return res.status(500).json({ message: "Google Authentication pipeline failure" });
    }
}

export async function requestPasswordOtp(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email parameter field is required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No active user account found with this email" });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        
        user.otpCode = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const mailOptions = {
            from: `"HiiiChat Security" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "🔑 Security Check: Password Modification Request Token",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
                <h2 style="color: #15803d; margin-bottom: 8px;">Password Modification</h2>
                <p style="font-size: 14px; color: #64748b;">Use this secure verification code:</p>
                <div style="background-color: #f1f5f9; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px; margin: 20px 0; color: #1e293b; border-radius: 8px;">
                  ${otp}
                </div>
              </div>
            `,
        };

        try {
            await mailTransporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error("❌ SMTP Mail Delivery Rejection Failure:", mailError.message);
            
            user.otpCode = null;
            user.otpExpiresAt = null;
            await user.save();

            return res.status(502).json({ 
                message: "Email delivery failed. The email address provided might be invalid or unreachable." 
            });
        }

        return res.status(200).json({ success: true, message: "Security token dispatched cleanly." });

    } catch (error) {
        console.error("Error in requestPasswordOtp backend controller:", error.message);
        return res.status(500).json({ message: "Internal server engine tracking error." });
    }
}

export async function updatePassword(req, res) {
    try {
        const { userId, email, otp, newPassword } = req.body;

        if (!otp || !newPassword || (!userId && !email)) {
            return res.status(400).json({ message: "Missing required parameters data tokens" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password secret parameter must be at least 6 characters long" });
        }

        let user;
        if (userId) {
            user = await userModel.findById(userId);
        }
        if (!user && email) {
            user = await userModel.findOne({ email });
        }

        if (!user) return res.status(404).json({ message: "User session node context expired or not found" });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid verification code signature entry" });
        }

        if (new Date() > user.otpExpiresAt) {
            return res.status(400).json({ message: "Verification session token has completely expired" });
        }

        user.password = newPassword;
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();

        return res.status(200).json({ success: true, message: "Database secrets committed clean. Password modified!" });

    } catch (error) {
        console.error("Error inside updatePassword runtime controller:", error.message);
        return res.status(500).json({ message: "Failed to securely write fresh password configuration blocks" });
    }
}

export async function updateProfile(req, res) {
    try {
        const userId = req.user._id; 
        // Keep these as constants safely
        const { fullName, bio, profilePic } = req.body;

        if (!fullName) {
            return res.status(400).json({ message: "Profile naming configurations are required" });
        }

        let imageUrl = profilePic; 

        if (profilePic && profilePic.startsWith("data:image/")) {
            console.log("Valid Base64 image payload detected. Syncing with ImageKit...");
          
            try {
                const uploadResponse = await imagekit.upload({
                    file: profilePic, 
                    fileName: `avatar_${userId}_${Date.now()}.png`,
                    folder: "/user_profiles",
                });

                imageUrl = uploadResponse.url; 
                // ✅ FIXED: Removed the profilePic = null reassignment that caused the crash
                console.log("ImageKit upload successful! URL:", imageUrl);

            } catch (ikError) {
                console.error("ImageKit SDK Upload Failure Details:", ikError);
                return res.status(500).json({ 
                    message: "Image cloud sync failed. Please check backend .env API keys." 
                });
            }
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { fullName, bio, profilePic: imageUrl },
            { new: true } 
        );

        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
                bio: updatedUser.bio
            });
            console.log(`Stream sync complete for updated user node -> ${updatedUser.fullName}`);
        } catch (streamErr) {
            console.error("Stream API Sync failed during patch call updates:", streamErr.message);
        }

        return res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        // Look closely here in your terminal logs—it will confirm the constant variable assignment crash!
        console.error("Critical fault inside updateProfile pipeline handler engine:", error.message);
        return res.status(500).json({ message: "Internal server data compilation error records" });
    }
}

export async function deactivateAccount(req, res) {
    try {
        const userId = req.user._id;
        const { password, reason } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password validation token is required" });
        }

        const user = await userModel.findById(userId).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await user.matchPassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Incorrect password credentials" });
        }

        console.log(`⚠️ User ${user.email} deactivating profile. Feedback Reason: "${reason || "None specified"}"`);

        user.isDeactivated = true;
        user.deactivatedAt = new Date();
        user.location = null; 
        await user.save();

        await deactivateStreamUser(userId.toString());

        res.clearCookie("jwt");
        return res.status(200).json({ success: true, message: "Your account has been deactivated." });
    } catch (error) {
        console.error("Error in deactivateAccount controller:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function deleteAccount(req, res) {
    try {
        const userId = req.user._id;
        const { password, reason } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password validation token is required" });
        }

        const user = await userModel.findById(userId).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await user.matchPassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Incorrect password credentials" });
        }
        console.log(`🚨 CRITICAL: User ${user.email} requested PERMANENT WIPE. Reason: "${reason || "None specified"}"`);
        
        await deleteStreamUser(userId.toString());
        await userModel.findByIdAndDelete(userId);
        res.clearCookie("jwt");
        return res.status(200).json({ success: true, message: "Account data permanently erased." });
    } catch (error) {
        console.error("Error in deleteAccount controller:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getActiveSessions(req, res) {
    try {
        const user = await userModel.findById(req.user._id).select("sessions");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const currentSessionTokenVersion = req.tokenPayload?.tokenVersion || req.userTokenVersion;

        const formattedSessions = (user.sessions || []).map(session => ({
            sessionId: session._id || session.tokenVersion, // Safe ID fallback mechanism for structural identification UI keys
            deviceType: session.deviceType,
            os: session.os,
            browser: session.browser,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt,
            isCurrentDevice: session.tokenVersion === currentSessionTokenVersion
        }));
        return res.status(200).json({ success: true, sessions: formattedSessions });
    } catch (error) {
        console.error("Error fetching active sessions:", error.message);
        return res.status(500).json({ message: "Internal server error fetching active sessions" });
    }
}

// 📄 PART 2 LOGIC MERGED INTEGRATION:
export async function logoutSpecificDevice(req, res) {
    try {
        const { sessionId } = req.body; 
        if (!sessionId) return res.status(400).json({ message: "Session identifier token required" });

        const user = await userModel.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User profile not found" });

        // Dual-property match filter verification backup strategy (checks database subdocument ID or unique string keys fallback matching safely)
        user.sessions = (user.sessions || []).filter(session => 
            (session._id && session._id.toString() !== sessionId) && 
            (session.tokenVersion !== sessionId)
        );
        await user.save();

        return res.status(200).json({ success: true, message: "Target device session revoked successfully." });
    } catch (error) {
        console.error("Error revoking target device session:", error.message);
        return res.status(500).json({ message: "Internal server error revoking session" });
    }
}

export async function logoutAllDevices(req, res) {
    try {
        const { includeCurrentDevice } = req.body; 
        const user = await userModel.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (includeCurrentDevice === true) {
            user.sessions = [];
            user.lastLogoutAt = new Date();
            await user.save();

            res.clearCookie("jwt");
            return res.status(200).json({ success: true, loggedOutEverywhere: true, message: "All devices terminated completely." });
        } else {
            const currentSessionTokenVersion = req.tokenPayload?.tokenVersion || req.userTokenVersion;
            
            user.sessions = (user.sessions || []).filter(session => session.tokenVersion === currentSessionTokenVersion);
            await user.save();

            return res.status(200).json({ success: true, loggedOutEverywhere: false, message: "Logged out of all other remote device profiles cleanly." });
        }
    } catch (error) {
        console.error("Error processing mass session cleanup:", error.message);
        return res.status(500).json({ message: "Internal server mass logout processing error" });
    }
}