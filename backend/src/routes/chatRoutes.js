const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Get or create chat for an order
router.get('/order/:orderId', auth, chatController.getOrCreateChat);

// Get all chats for a user
router.get('/user', auth, chatController.getUserChats);

// Get chat messages
router.get('/:chatId/messages', auth, chatController.getChatMessages);

// Get all messages for a chat (alternative route)
router.get('/messages/:chatId', auth, chatController.getChatMessages);

// Send message
router.post('/send', auth, chatController.sendMessage);

// Respond to offer
router.put('/offer/:messageId/respond', auth, chatController.respondToOffer);

module.exports = router;
