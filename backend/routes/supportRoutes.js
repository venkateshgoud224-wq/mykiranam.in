const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected route: only authenticated users can use the chatbot's internet search
router.post('/ai-search', authMiddleware, supportController.chatSearch);

module.exports = router;
