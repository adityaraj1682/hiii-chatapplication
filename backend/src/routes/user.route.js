import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { acceptFriendRequest, dismissNotification, getFriendRequests, getMyFriends, getOutgoingFriendReqs, getRecommendedUsers, rejectFriendRequest, removeFriend, searchUsers, sendFriendRequest } from '../controllers/user.controller.js'
const router = express.Router()

router.use(protectRoute)

router.get('/',getRecommendedUsers)
router.get('/friends',getMyFriends)

router.post('/friend-request/:id',sendFriendRequest);
router.put('/friend-request/:id/accept',acceptFriendRequest);
router.delete('/friend-request/:id/reject',rejectFriendRequest);
router.put('/friend-request/:id/dismiss', dismissNotification);
router.delete('/friends/:friendId', removeFriend);
router.get("/search", searchUsers);
router.get('/friend-requests',getFriendRequests)
router.get('/outgoing-friend-requests',getOutgoingFriendReqs)
 

export default router