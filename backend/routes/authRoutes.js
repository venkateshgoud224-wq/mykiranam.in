const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require JWT verification)
router.patch('/role', authMiddleware, authController.updateRole);
router.get('/profile', authMiddleware, authController.getProfile);
router.patch('/profile/details', authMiddleware, authController.updateProfileDetails);
router.patch('/profile/settings', authMiddleware, authController.updateSettings);
router.post('/profile/whatsapp/send-otp', authMiddleware, authController.sendWhatsAppOTP);
router.post('/profile/whatsapp/verify-otp', authMiddleware, authController.verifyWhatsAppOTP);

module.exports = router;
