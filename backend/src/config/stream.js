import { StreamChat } from "stream-chat";
import dotenv from "dotenv";
import path from "path";
import { DonutSwinPreTrainedModel } from "@xenova/transformers";
dotenv.config()
// // This will look for .env in the folder where you run 'npm start' (the backend folder)
// dotenv.config({ path: path.join(process.cwd(), ".env") });
const apiKey=process.env.STREAM_API_KEY
const apiSecret=process.env.STREAM_API_SECRET

// const apiKey='pmxyr9jyyg46'
// const apiSecret='z4a8fzauuypqh4bddheat2t6r6h8heqp76j4mhfexq62myzw8cyhh492ebtfzecv'

if(!apiKey || !apiSecret)
    console.error("Stream API key or secret is not defined")


const streamClient = StreamChat.getInstance(apiKey, apiSecret)

export const upsertStreamUser = async(userData)=>{
    try{
        await streamClient.upsertUsers([userData])
        return userData
    }catch(error){
        console.error("Error upserting Stream user",error)
    }
}
// todo: do it later
export const generateStreamToken =(userId) =>{
    try {
        const userIdStr = userId.toString()
        return streamClient.createToken(userIdStr)
    } catch (error) {
        console.error("Error in generating stream token",error)
    }
}

export const deleteStreamUser = async (userId) => {
    try {
        const userIdStr = userId.toString();
        
        // This removes the user completely from Stream's infrastructure
        await streamClient.deleteUser(userIdStr, {
            delete_conversation_channels: false, // Keeps shared group chat layouts intact, but removes this specific user node
            mark_messages_deleted: true          // Gracefully renders their sent messages into neat "Message Deleted" flags
        });
        
        console.log(`🗑️ Stream infrastructure: Successfully purged user ID -> ${userIdStr}`);
        return true;
    } catch (error) {
        console.error("❌ Error deleting user from Stream platform:", error.message);
        throw error; // Let your auth controller catch it gracefully if it breaks
    }
};

export const deactivateStreamUser = async (userId) => {
    try {
        const userIdStr = userId.toString();
        
        // 🚀 UPGRADED: Mark them invisible AND clear their active online status instantly
        await streamClient.partialUpdateUser({
            id: userIdStr,
            set: { 
                invisible: true,
                online: false // Prevents them from showing as "Active/Online" to friends
            } 
        });
        console.log(`📡 Stream Sync: Marked user ${userIdStr} as invisible.`);
    } catch (error) {
        console.error("Error setting Stream user to invisible:", error.message);
    }
};

/**
 * 🔓 Restore a user profile visibility back to standard stream friend arrays
 */
export const reactivateStreamUser = async (userId) => {
    try {
        const userIdStr = userId.toString();
        
        // 🚀 UPGRADED: Remove the invisible flag explicitly so they pop back into discovery
        await streamClient.partialUpdateUser({
            id: userIdStr,
            set: { 
                invisible: false 
            }
        });
        console.log(`📡 Stream Sync: Restored user ${userIdStr} visibility to public.`);
    } catch (error) {
        console.error("Error restoring Stream user visibility:", error.message);
    }
};