const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// PhonePe Routes
router.post('/phonepe/create-order', protect, paymentController.createPhonePeOrder);
router.post('/phonepe/verify', protect, paymentController.verifyPhonePePayment);
router.post('/phonepe/webhook', paymentController.handlePhonePeWebhook);

// UPI Deep Link Log Route
router.post('/upi-log', protect, paymentController.logUpiError);

module.exports = router;
