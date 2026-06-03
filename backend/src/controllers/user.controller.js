import userModel from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

import mongoose from "mongoose";

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user._id; 
    const currentUser = req.user;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const outgoingRequests = await FriendRequest.find({ 
      sender: currentUserId 
    }).select("recipient");

    const sentRequestIds = outgoingRequests.map(req => req.recipient);
   
    const usersToExclude = [
      currentUserId,                 
      ...(currentUser.friends || []), 
      ...sentRequestIds             
    ];

    // 🚀 UPDATED: Excludes self, friends, sent requests, non-onboarded, AND deactivated accounts!
    const allUsers = await userModel.find({
      $and: [
        { _id: { $nin: usersToExclude } }, 
        { isOnboarded: true },
        { isDeactivated: { $ne: true } } // 🔥 ADDED: Filter out deactivated accounts!
      ]
    }).select("-password").limit(100); 
    const recommendedUsers = allUsers
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    return res.status(200).json(recommendedUsers);

  } catch (error) {
    console.error('Error in getRecommendedUsers controller:', error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


export async function getMyFriends(req, res) {
    try {
        // 🚀 UPDATED: Added a match filter inside populate to drop deactivated profiles inline!
        const user = await userModel.findById(req.user.id)
            .select("friends")
            .populate({
                path: "friends",
                match: { isDeactivated: { $ne: true } }, // 🔥 ADDED: Only fetch active friends!
                select: "fullName profilePic nativeLanguage learningLanguage"
            });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Clean up empty array items in case references were suppressed by the match criteria
        const activeFriends = user.friends.filter(friend => friend !== null);

        res.status(200).json(activeFriends); 
    } catch (error) {
        console.error("Error in getMyFriends controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" }); 
    }
}


export async function sendFriendRequest(req,res){
    try {
        const myId = req.user.id;
        const {id:recipientId} = req.params

        if(myId===recipientId)
            return res.status(400).json({message:"YOu can't send friend request to yourself"})
        const recipient = await userModel.findById(recipientId)
        if(!recipient)
            return res.status(400).json({message:"Recipient Not Found"})

        if (recipient.friends.includes(myId)){
            return res.status(400).json({message:"You are already friends with the user"})
        }

        //check if a request already sent

        const existingRequest = await FriendRequest.findOne({
            $or:[
                {
                    sender:myId,recipient:recipientId 
                },
                {
                    recipient:myId,sender:recipientId 
                }
            ]
        })

        if (existingRequest){
            return res.status(400).json({message:"A friend request already exists between you and this user"})
        }


        const friendRequest = await FriendRequest.create({
            sender:myId,
            recipient: recipientId,
        });
        res.status(201).json(friendRequest)
    } catch (error) {
        console.error("Error in friendRequest controller",error.message)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export async function acceptFriendRequest(req,res){
    try {
        const {id:requestId} = req.params
        const friendRequest = await FriendRequest.findById(requestId)
        // const { id: senderId } = req.params; // Now this represents the Sender's User ID
        // const recipientId = req.user.id;    // The logged-in user accepting it
        // const friendRequest = await FriendRequest.findOne({
        //     sender: senderId,
        //     recipient: recipientId,
        //     status: "pending"
        // });
        if(!friendRequest)
            res.status(404).json({message:"Friend Request not found"})

        console.log(`[DEBUG] Found Friend Request! Recipient is: ${friendRequest.recipient}`);
        if (friendRequest.recipient.toString()!==req.user.id){
            return res.status(403).json({message:"You are not authorized to accept this request"})
        }

        friendRequest.status = "accepted";
        await friendRequest.save()

        //add each user to the other's friends array

        await userModel.findByIdAndUpdate(friendRequest.recipient,{
            $addToSet:{friends: friendRequest.sender}
        })

        await userModel.findByIdAndUpdate(friendRequest.sender,{
            $addToSet:{friends: friendRequest.recipient}
        })

        res.status(200).json({message:'Friend request accepted'})

    } catch (error) {
        console.log("Error in acceptFriendRequest controller",error.message)
    }
}

export async function getFriendRequests(req, res) {
    try {
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending",
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

        const acceptedReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "accepted",
            // ADD THIS LINE 👇 So it doesn't fetch dismissed notifications
            isNotificationDismissed: { $ne: true } 
        }).populate("recipient", "fullName profilePic");

        res.status(200).json({ incomingReqs, acceptedReqs });
    } catch (error) {
        console.log("Error in getFriendRequests controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function rejectFriendRequest(req, res) {
    try {
        const { id: requestId } = req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: "Friend Request not found" });
        }

        // Security check: Only the recipient can reject the request
        if (friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to reject this request" });
        }

        // Instead of updating status, we delete the document
        await FriendRequest.findByIdAndDelete(requestId);

        res.status(200).json({ message: 'Friend request rejected and removed' });

    } catch (error) {
        console.log("Error in rejectFriendRequest controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getOutgoingFriendReqs(req,res){
    try{
        const outgoingRequests = await FriendRequest.find({
            sender: req.user.id,
            status: "pending",
        }).populate("recipient","fullName profilePic nativeLanguage learningLanguage")
        res.status(200).json(outgoingRequests)
    }catch(error){
        console.log("Error in getOutgoingFriendReqs controller",error.message)
        res.status(500).json({message: "Internal Server error"})
    }
}

export async function searchUsers(req, res) {
    try {
        const { q } = req.query;
        // Access the current logged-in user's ID from the auth middleware
        const currentUserId = req.user?._id; 
        
        if (!q || q.trim() === "") {
            return res.status(200).json([]);
        }

        // Build the query object
        const query = {
            fullName: { $regex: q, $options: "i" }
        };

        // If a logged-in user is making the request, exclude them from the results
        if (currentUserId) {
            query._id = { $ne: currentUserId };
        }

        const users = await userModel.find(query)
        .select("fullName email profilePic isOnboarded") 
        .limit(10);

        console.log(`Search for "${q}" found ${users.length} matching users (excluding self).`);

        return res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchUsers backend logic:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function dismissNotification(req, res) {
    try {
        const { id: requestId } = req.params;
        
        // We update the document to add a hidden flag instead of deleting it!
        const notification = await FriendRequest.findByIdAndUpdate(
            requestId, 
            { isNotificationDismissed: true }, 
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: 'Notification dismissed successfully' });
    } catch (error) {
        console.log("Error in dismissNotification controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function removeFriend(req, res) {
    try {
        const friendId = req.params.friendId || req.params.id; 
        const userId = req.user?._id || req.user?.id;


        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user found in request" });
        }

        if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ message: "Invalid or missing Friend ID format" });
        }

        // 1. 🛠️ FIX: Changed 'User' to 'userModel' to match your top import statement!
        await userModel.findByIdAndUpdate(userId, 
            { $pull: { friends: friendId } }
        );

        // 2. 🛠️ FIX: Changed 'User' to 'userModel' here too!
        await userModel.findByIdAndUpdate(friendId, 
            { $pull: { friends: userId } }
        );

        // 3. Delete matching request history logs completely
        await FriendRequest.deleteMany({
            $or: [
                { sender: userId, recipient: friendId },
                { sender: friendId, recipient: userId }
            ]
        });

        return res.status(200).json({ message: "Friend removed successfully" });
    } catch (error) {
        console.error("CRITICAL BACKEND ERROR IN REMOVEFRIEND:", error); 
        return res.status(500).json({ 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
}