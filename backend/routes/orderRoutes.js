const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All order routes are protected by authMiddleware
router.use(authMiddleware);

// Get orders list (based on role)
router.get('/', orderController.getOrders);

// Place a new order (upload handwritten chitti)
router.post('/', upload.single('original_chitti'), orderController.createOrder);

// Update order status (Accept, Reject, progress state)
router.patch('/:id/status', orderController.updateOrderStatus);

// Get market comparison for order
router.get('/:id/market-comparison', orderController.getMarketComparison);

// Seller uploads modified bill image + total amount
router.post('/:id/bill', upload.single('modified_bill'), orderController.uploadBill);
router.post('/:id/commitment', orderController.requestCommitment);
router.post('/:id/verify-commitment', orderController.verifyCommitment);

// Customer confirms order + selects payment method + uploads screenshot receipt
router.post('/:id/confirm', upload.single('payment_proof_image'), orderController.confirmOrder);

// Verify OTP to complete delivery
router.post('/:id/verify-otp', orderController.verifyOTP);

// Communication (Chats)
router.get('/:id/chats', orderController.getChats);
router.post('/:id/chats', upload.single('attachment'), orderController.sendChat);

module.exports = router;
