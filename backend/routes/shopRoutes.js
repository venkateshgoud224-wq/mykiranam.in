const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Define multi-upload fields for the 5 mandatory shop images
const verificationUploads = upload.fields([
  { name: 'image_front', maxCount: 1 },
  { name: 'image_counter', maxCount: 1 },
  { name: 'image_inside1', maxCount: 1 },
  { name: 'image_inside2', maxCount: 1 },
  { name: 'image_additional', maxCount: 1 }
]);

// Define multi-upload fields for KYC identity documents
const kycUploads = upload.fields([
  { name: 'aadhaar_image', maxCount: 1 },
  { name: 'pan_image', maxCount: 1 }
]);

// Public route to list verified shops
router.get('/', shopController.getShops);

// Get specific shop by ID
router.get('/:id', shopController.getShopById);

// OTP Simulation (Send Simulated SMS Code)
router.post('/send-otp', shopController.sendOtp);

// Protected routes
router.get('/my-shop/profile', authMiddleware, shopController.getMyShop);
router.patch('/settings', authMiddleware, shopController.updateShopSettings);
router.post('/payment', authMiddleware, upload.single('qr_code_image'), shopController.updateShopPayment);
router.post('/banner', authMiddleware, upload.single('image_banner'), shopController.updateShopBanner);

const verifiedSellerMiddleware = require('../middleware/verifiedSellerMiddleware');

// OTP Phone Verification Confirm
router.post('/verify-otp', authMiddleware, shopController.verifyOtp);

// Upload 5 verification images and submit shop for Under Review status
router.post('/verify', authMiddleware, verificationUploads, shopController.verifyShop);

// Submit KYC identity verification details (Aadhaar + PAN + bank details)
router.post('/kyc', authMiddleware, kycUploads, shopController.submitSellerKyc);

// Premium Seller Analytics
router.get('/premium-analytics', authMiddleware, verifiedSellerMiddleware, shopController.getPremiumAnalytics);

module.exports = router;
