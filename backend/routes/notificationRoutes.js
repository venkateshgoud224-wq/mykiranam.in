const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Mount routes protected by authMiddleware
router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/mark-read', authMiddleware, notificationController.markNotificationsAsRead);
router.post('/clear', authMiddleware, notificationController.clearNotifications);

module.exports = router;
