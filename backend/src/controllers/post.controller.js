import postModel from "../models/Post.js";
import userModel from "../models/User.js";
import commentModel from "../models/Comment.js";
import ImageKit from "imagekit";
import dotenv from "dotenv";
import { isContentSafe } from "../utils/moderation.js";
import storyModel from "../models/Story.js";

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// 🔄 HELPER FUNCTION (Defined clean and only ONCE at the top layer)
function buildCommentTree(comments, parentId = null) {
  const branch = [];
  for (const comment of comments) {
    const commentParentId = comment.parentComment ? comment.parentComment.toString() : null;
    const targetId = parentId ? parentId.toString() : null;

    if (commentParentId === targetId) {
      const replies = buildCommentTree(comments, comment._id);
      branch.push({
        ...comment.toObject(),
        replies: replies
      });
    }
  }
  return branch;
}

/**
 * 1. Create a new Post
 */
export async function createPost(req, res) {
    try {
        const userId = req.user?._id || req.user?.id;
        const { content, postImage } = req.body;

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "Post content cannot be empty" });
        }
        const safe = await isContentSafe(content);
        if (!safe) {
            return res.status(400).json({ 
                message: "Post blocked! Content violates community safety guidelines." 
            });
        }
        let imageUrl = "";

         if (profilePic && profilePic.startsWith("data:image/")) {
        console.log("Valid Base64 image payload detected. Syncing with ImageKit...");
      
         try {
        const uploadResponse = await imagekit.upload({
          file: profilePic, 
          fileName: `avatar_${userId}_${Date.now()}.png`,
          folder: "/user_profiles",
        });

        imageUrl = uploadResponse.url; 
        req.body.profilePic = null;
        profilePic = null;
        console.log("ImageKit upload successful! URL:", imageUrl);

      } catch (ikError) {
        console.error("ImageKit SDK Upload Failure Details:", ikError);
        return res.status(500).json({ 
          message: "Image cloud sync failed. Please check backend .env API keys." 
        });
      }
      finally {
      req.body.postImage = null; 
      postImage = null;
    }
    }

        const newPost = await postModel.create({
            user: userId,
            content,
            postImage: imageUrl
        });

        const populatedPost = await newPost.populate("user", "fullName profilePic");
        return res.status(201).json(populatedPost);
    } catch (error) {
        console.error("Error in createPost controller:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function toggleLikePost(req, res) {
    try {
        const { id: postId } = req.params;
        const userId = req.user?._id || req.user?.id;

        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== userId.toString());
        } else {
            post.likes.push(userId);
        }

        await post.save();
        return res.status(200).json({ success: true, likes: post.likes, isLiked: !isLiked });
    } catch (error) {
        console.error("Error in toggleLikePost controller:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export async function getFeedPosts(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    // 🚀 STEP 1: Find the user, but look closely at their friends array
    const user = await userModel.findById(userId).populate({
        path: "friends",
        match: { isDeactivated: { $ne: true } }, // 🔥 Only get friends who are NOT deactivated!
        select: "_id"
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract only the IDs of active friends
    const activeFriendIds = (user.friends || [])
        .filter(f => f !== null)
        .map(f => f._id);

    // 🚀 STEP 2: Compile feed target list (Your own ID + only active friends)
    const feedUserIds = [userId, ...activeFriendIds];

    // Fetch posts only belonging to active target IDs
    const rawPosts = await postModel.find({ user: { $in: feedUserIds } })
      .populate("user", "fullName profilePic nativeLanguage learningLanguage")
      .sort({ createdAt: -1 });

    // Filter out posts where the creator profile might be soft-deleted/deactivated
    const visiblePosts = rawPosts.filter(post => post.user !== null && !post.user.isDeactivated);

    const feedPostsWithComments = await Promise.all(
      visiblePosts.map(async (post) => {
        const allCommentsForPost = await commentModel.find({ post: post._id })
          .populate("user", "fullName profilePic")
          .sort({ createdAt: 1 });

        // Build comment trees while dropping comments from accounts that are deactivated
        const activeComments = allCommentsForPost.filter(c => c.user !== null && !c.user.isDeactivated);
        const nestedTree = buildCommentTree(activeComments, null);

        return {
          ...post.toObject(),
          comments: nestedTree
        };
      })
    );

    return res.status(200).json(feedPostsWithComments);
  } catch (error) {
    console.error("Error in getFeedPosts controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deletePost(req, res) {
    try {
        const { id: postId } = req.params;
        const userId = req.user?._id || req.user?.id;

        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to delete this post" });
        }

        await postModel.findByIdAndDelete(postId);
        return res.status(200).json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error in deletePost controller:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * 5. Consolidated Infinite Comments & Replies Controller
 */
export async function addCommentOrReply(req, res) {
  console.log("🔥 HIT: The backend route was found! Post ID is:", req.params.id);
  try {
    const { id: postId } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Content cannot be empty" });
    }
    const safe = await isContentSafe(text);
    if (!safe) {
      return res.status(400).json({ 
        message: "Comment blocked! Please keep your language constructive and friendly." 
      });
    }
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await commentModel.create({
      post: postId,
      user: userId,
      text: text,
      parentComment: parentCommentId || null
    });

    const allComments = await commentModel.find({ post: postId })
      .populate("user", "fullName profilePic")
      .sort({ createdAt: 1 });

    const nestedCommentTree = buildCommentTree(allComments, null);
    return res.status(200).json(nestedCommentTree);

  } catch (error) {
    console.error("CRITICAL RUNTIME ERROR IN ADDCOMMENTORREPLY:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

export async function toggleSavePost(req, res) {
    try {
        // 💡 EXTRACT VIA 'id' TO MATCH YOUR ROUTER PARAMS EXACTLY
        const { id } = req.params; 
        const userId = req.user.id || req.user._id;

        console.log(`[DEBUG - SAVE POST] Target Post ID: ${id}`);
        console.log(`[DEBUG - SAVE POST] Authenticated User ID: ${userId}`);

        if (!id) {
            return res.status(400).json({ message: "Post identity token parameter is missing" });
        }

        // Look up the active user session document
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Authenticated account session context not found" });
        }

        // Self-heal: Initialize the savedPosts property block if it's missing or undefined
        if (!user.savedPosts) {
            user.savedPosts = [];
        }

        // Determine if the post is already saved
        const isAlreadySaved = user.savedPosts.includes(id);

        if (isAlreadySaved) {
            // Unsave: Remove the post ID from the tracking array
            user.savedPosts = user.savedPosts.filter(postId => postId.toString() !== id.toString());
            await user.save();
            console.log(`[DEBUG] Post ${id} successfully REMOVED from bookmarks`);
            return res.status(200).json({ success: true, isSaved: false, message: "Post removed from bookmarks" });
        } else {
            // Save: Append the post ID to the tracking array
            user.savedPosts.push(id);
            await user.save();
            console.log(`[DEBUG] Post ${id} successfully ADDED to bookmarks`);
            return res.status(200).json({ success: true, isSaved: true, message: "Post saved to bookmarks successfully!" });
        }

    } catch (error) {
        console.error("❌ Fatal error caught inside toggleSavePost controller:", error.message);
        return res.status(500).json({ message: "Internal server error writing bookmark streams" });
    }
}

export async function createStory(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    
    // 🚀 MEMORY FIX: Keep track of storyImage, but pull it out of req.body right away
    let { caption, storyImage } = req.body;

    // Stories must have an image payload
    if (!storyImage || !storyImage.startsWith("data:image/")) {
      return res.status(400).json({ message: "A valid image payload is required to post a story." });
    }

    // Optional: Content moderation check on the caption if provided
    if (caption && caption.trim() !== "") {
      const safe = await isContentSafe(caption);
      if (!safe) {
        // Clear memory before returning response
        storyImage = null;
        req.body.storyImage = null;
        return res.status(400).json({ 
          message: "Story blocked! Caption violates community safety guidelines." 
        });
      }
    }

    let imageUrl = "";
    console.log("Valid Base64 story image payload detected. Syncing with ImageKit...");
    
    try {
      const uploadResponse = await imagekit.upload({
        file: storyImage, 
        fileName: `story_${userId}_${Date.now()}.png`,
        folder: "/user_stories", // Saved in a dedicated stories folder
      });
      imageUrl = uploadResponse.url;
      console.log("ImageKit story upload successful! URL:", imageUrl);
    } catch (ikError) {
      console.error("ImageKit Story Upload Failure Details:", ikError);
      return res.status(500).json({ 
        message: "Story image cloud sync failed. Please check backend .env API keys." 
      });
    } finally {
      // 🚀 THE CRUCIAL MEMORY LEAK FIX: 
      // Forcefully wipe the giant base64 text chunks out of memory immediately, 
      // whether the upload succeeded or failed!
      storyImage = null;
      req.body.storyImage = null;
    }

    const newStory = await storyModel.create({
      user: userId,
      caption: caption || "",
      storyImage: imageUrl
    });

    const populatedStory = await newStory.populate("user", "fullName profilePic");
    return res.status(201).json(populatedStory);

  } catch (error) {
    console.error("Error in createStory controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * 7. Get Active Feed Stories from self and active friends
 */
export async function getFeedStories(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;

    // Find user and populate active friends (Matches your post feed logic exactly)
    const user = await userModel.findById(userId).populate({
        path: "friends",
        match: { isDeactivated: { $ne: true } }, 
        select: "_id"
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const activeFriendIds = (user.friends || []).filter(f => f !== null).map(f => f._id);
    const feedUserIds = [userId, ...activeFriendIds];

    // Fetch active stories (MongoDB handles filtering out ones past 24 hours automatically)
    const rawStories = await storyModel.find({ user: { $in: feedUserIds } })
      .populate("user", "fullName profilePic")
      .sort({ createdAt: -1 });

    // Filter out stories where the creator profile might be soft-deleted/deactivated
    const visibleStories = rawStories.filter(story => story.user !== null && !story.user.isDeactivated);

    return res.status(200).json(visibleStories);
  } catch (error) {
    console.error("Error in getFeedStories controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}