const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// PhonePe Routes
router.post('/phonepe/create-order', protect, paymentController.createPhonePeOrder);
router.post('/phonepe/verify', protect, paymentController.verifyPhonePePayment);

module.exports = router;
