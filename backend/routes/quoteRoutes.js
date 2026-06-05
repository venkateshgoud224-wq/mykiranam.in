const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware, quoteController.generateQuotes);

module.exports = router;
