import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { askChatbot, getStreamToken } from '../controllers/chat.controller.js'

const router = express.Router()

router.get('/token',protectRoute,getStreamToken);
router.post("/chatbot/ask", askChatbot);
export default router