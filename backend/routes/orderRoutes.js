const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const verifiedSellerMiddleware = require('../middleware/verifiedSellerMiddleware');

// All order routes are protected by authMiddleware
router.use(authMiddleware);

// Get orders list (based on role)
router.get('/', orderController.getOrders);

// Place a new order (upload handwritten chitti)
router.post('/', upload.single('original_chitti'), orderController.createOrder);

// Update order status (Accept, Reject, progress state)
router.patch('/:id/status', verifiedSellerMiddleware, orderController.updateOrderStatus);

// Get market comparison for order
router.get('/:id/market-comparison', orderController.getMarketComparison);

// Seller uploads modified bill image + total amount
router.post('/:id/bill', verifiedSellerMiddleware, upload.single('modified_bill'), orderController.uploadBill);

// Seller requests payment
router.post('/:id/ask-payment', verifiedSellerMiddleware, orderController.askPayment);

// Customer confirms order + selects payment method + uploads screenshot receipt
router.post('/:id/confirm', upload.single('payment_proof_image'), orderController.confirmOrder);

// Customer submits UPI payment proof
router.post('/:id/submit-upi-payment', upload.single('payment_proof_image'), orderController.submitUpiPayment);

// Seller verifies direct UPI payment
router.post('/:id/verify-upi-payment', verifiedSellerMiddleware, orderController.verifyUpiPayment);

// Customer updates fulfillment options during payment verification
router.patch('/:id/fulfillment', orderController.updateOrderFulfillment);

// Customer edits/adds items in an order (till delivered)
router.put('/:id/edit-items', upload.single('new_chitti'), orderController.editOrderItems);

// Verify OTP to complete delivery
router.post('/:id/verify-otp', verifiedSellerMiddleware, orderController.verifyOTP);

// Communication (Chats)
router.get('/:id/chats', orderController.getChats);
router.post('/:id/chats', upload.single('attachment'), orderController.sendChat);

module.exports = router;
