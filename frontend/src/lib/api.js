import axios from "axios";
import { axiosInstance } from "./axios";

export const signup = async (data) => {
    const response = await axiosInstance.post("/auth/signup", data);
    return response.data; // 🚀 FIX: Unpacks .data properties uniformly!
};

export const verifyOTP = async (payload) => {
    const response = await axiosInstance.post("/auth/verify-otp", payload);
    return response.data; // 🚀 FIX: Unpacks .data properties uniformly!
};

export const login = async(loginData) =>{
    const response = await axiosInstance.post("/auth/login",loginData)
    return response.data
}
export const getAuthUser = async()=>{
      try {
        const res = await axiosInstance.get("/auth/me")
        return res.data
      } catch (error) {
        return null
      }
    }

export const completeOnboarding = async(userData)=>{
    const response = await axiosInstance.post("/auth/onboarding",userData)
    return response.data
}


export const logout = async() =>{
    const response = await axiosInstance.post("/auth/logout")
    return response.data
} 


export async function getUserfriends(){
  const response = await axiosInstance.get("/users/friends")
  return response.data
}

export async function getRecommendedUsers(){
  const response = await axiosInstance.get("/users")
  return response.data
}


export async function getOutgoingFriendReqs(){
  const response = await axiosInstance.get("/users/outgoing-friend-requests")
  return response.data
}

export async function sendFriendRequest(userId){
  const response = await axiosInstance.post(`/users/friend-request/${userId}`)
  return response.data
}

export async function getFriendRequests(){
  const response = await axiosInstance.get('/users/friend-requests')
    return response.data
}

export async function acceptFriendRequest(requestId){
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`)
  return response.data 
}
export async function rejectFriendRequest(requestId) {
  const response = await axiosInstance.delete(`/users/friend-request/${requestId}/reject`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token")
  return response.data
}
export const removeNotification = async (requestid) => {
  // We use .patch or .put because we are updating the "isNotificationDismissed" flag
  const response = await axiosInstance.put(`/users/friend-request/${requestid}/dismiss`);
  return response.data;
};

export const removeFriend = async (friendId) => {
  const response = await axiosInstance.delete(`/users/friends/${friendId}`);
  return response.data;
};

export async function createPost(postData) {
  // postData should contain: { content, postImage }
  const response = await axiosInstance.post("/posts/create", postData);
  return response.data;
}

export async function getFeedPosts() {
  // Fetches timeline feed (own posts + friends' posts)
  const response = await axiosInstance.get("/posts/");
  return response.data;
}

export async function toggleLikePost(postId) {
  // Toggles the like status of a specific post
  const response = await axiosInstance.post(`/posts/${postId}/like`);
  return response.data; // Returns updated likes array and status
}

// Inside lib/api.js

export async function addComment(postId, text) {
  const response = await axiosInstance.post(`/posts/${postId}/comments`, { 
    text, 
    parentCommentId: null // Tells controller it's a top-level message
  });
  return response.data; 
}
export async function deletePostApi(postId) {
  const response = await axiosInstance.delete(`/posts/${postId}`);
  return response.data;
} 
// For infinite sub-comment replies:
export async function addReplyApi(postId, commentId, text) {
  const response = await axiosInstance.post(`/posts/${postId}/comments`, { 
    text, 
    parentCommentId: commentId // Passes the target comment ID as a parent pointer
  });
  return response.data; 
}

export async function toggleSavePost(postId) {
  const response = await axiosInstance.post(`/posts/${postId}/save`);
  return response.data;
} 

export const requestPasswordOTP = async ({ email }) => {
  const response = await axiosInstance.post('/auth/request-password-otp', { email });
  return response.data;
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const response = await axiosInstance.post('/auth/update-password', {
    email,
    otp, // 🚀 FIXED: Kept as "otp" to align with your controller destructuring!
    newPassword,
  });
  return response.data;
};

export const updateProfile = async (formData) => {
  const response = await axiosInstance.put('/auth/update-profile', formData);
  return response.data;
};

// Updated inside lib/api.js - Passing confirmation payloads down to backend
export const deactivateAccount = async (payload) => {
  // payload contains: { password, reason }
  const response = await axiosInstance.post("/auth/deactivate", payload);
  return response.data;
};

export const deleteAccount = async (payload) => {
  // payload contains: { password, reason }
  const response = await axiosInstance.delete("/auth/delete-account", { data: payload });
  return response.data;
};
export const getFeedStories = async () => {
  const response = await axiosInstance.get("/posts/story/feed"); 
  return response.data;
};


export const createStory = async (storyData) => {
  const response = await axiosInstance.post("/posts/story", storyData); 
  return response.data;
};
export const queryChatbot = async (conversationHistory) => {
  // 🚀 FIXED: Changed "/chats/" to "/chat/" to perfectly match your backend layout
  const response = await axiosInstance.post("/chat/chatbot/ask", { messages: conversationHistory });
  return response.data;
};

export const getUserSessions = async () => {
  const response = await axiosInstance.get("/auth/sessions");
  return response.data;
};

/**
 * Remotely logs out a specific device session via its sessionId
 * @param {string} sessionId 
 */
export const logoutSpecificDevice = async (sessionId) => {
  const response = await axiosInstance.post("/auth/sessions/logout-device", { sessionId });
  return response.data;
};

/**
 * Mass log out handler tool
 * @param {boolean} includeCurrentDevice - True logs out everywhere, False logs out other devices only
 */
export const logoutAllDevices = async (includeCurrentDevice = false) => {
  const response = await axiosInstance.post("/auth/sessions/logout-all", { includeCurrentDevice });
  return response.data;
};