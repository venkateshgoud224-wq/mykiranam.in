const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const cashfreeWebhook = require('../controllers/cashfreeWebhook');
const protect = require('../middleware/authMiddleware');

// Route for creating Cashfree Order
router.post('/create-order', protect, paymentController.createOrder);

// Route for verifying Cashfree payment
router.post('/verify-payment', protect, paymentController.verifyPayment);

router.post('/orders/:id/refund', protect, paymentController.refundPayment);

// Cashfree webhook endpoint (raw body required for signature verification)
router.post('/webhook/cashfree',
  require('body-parser').raw({ type: 'application/json' }),
  cashfreeWebhook.handle);

// PhonePe Routes
router.post('/phonepe/create-order', protect, paymentController.createPhonePeOrder);
router.post('/phonepe/verify', protect, paymentController.verifyPhonePePayment);

module.exports = router;
