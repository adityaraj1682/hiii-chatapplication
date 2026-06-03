import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
const userSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
        minlength: 6,
    },
    bio:{
        type: String,
        default: "",
    },
    profilePic:{
        type: String,
        default:"https://images.unsplash.com/photo-1620553907142-9907f1837a4e?q=80&w=500&auto=format&fit=crop"},
    
    nativeLanguage:{
        type: String,
        default: ""
    },
    learningLanguage:{
        type: String,
        defalut: "",
    },
    location:{
        type: String,
        default: "",
    },
    isOnboarded:{
        type: Boolean,
        default: false,
    },
    friends:[
        {
            type: mongoose.Schema.Types.ObjectId, 
            ref : "User",
        },
    ],
    blockedUsers: [
        { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" },
    ],
    isVerified: { type: Boolean, 
        default: false 
    }, 
    isOnboarded: { 
        type: Boolean, 
        default: false 
    },
    otpCode: { 
        type: String, 
        default: null 
    },
    otpExpiresAt: { 
        type: Date, 
        default: null 
    },
    savedPosts: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Post",
        default: []
    },
    lastLogoutAt: {
    type: Date,
    default: null // Starts as null for brand new accounts
    },
    isDeactivated: {
        type: Boolean,
        default: false
    },
    deactivatedAt: {
        type: Date,
        default: null
    }
},
{
    timeseries: true
})


//pre hook
// pre hook
userSchema.pre("save", async function() {
    // 1. If password hasn't changed, move to the next middleware
    if (!this.isModified('password')) {
        return ;
    }

    // 2. Wrap the hashing logic in try/catch
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        console.log(err)
    }
});

userSchema.methods.matchPassword = async function(enteredPassword){
    const isPasswordCorrect = await bcrypt.compare(enteredPassword,this.password)
    return isPasswordCorrect
}

const userModel = mongoose.model('User',userSchema)



export default userModel