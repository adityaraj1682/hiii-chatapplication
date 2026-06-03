import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { 
    createPost, 
    getFeedPosts, 
    toggleLikePost, 
    deletePost,
    addCommentOrReply, // 🚀 Using this for both comments and replies
    toggleSavePost,
    createStory,
    getFeedStories
} from "../controllers/post.controller.js";
const router = express.Router()
// Apply protectRoute middleware globally to all endpoints below
router.use(protectRoute)

router.get('/', getFeedPosts)
router.post("/create", createPost)
router.post("/:id/like", toggleLikePost)
router.delete("/:id", deletePost)
router.post("/:id/comments", addCommentOrReply);
router.post("/:id/save", toggleSavePost);
router.post("/story", createStory);        // Matches: POST /api/posts/story
router.get("/story/feed", getFeedStories); // Matches: GET /api/posts/story/feed
export default router;