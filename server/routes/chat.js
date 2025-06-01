const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

router.get('/messages/:chatId', async (req, res) => {
  try {
    const result = await chatService.getMessages(req.params.chatId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const result = await chatService.saveMessage(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: error.message || 'Failed to save message' });
  }
});

module.exports = router; 