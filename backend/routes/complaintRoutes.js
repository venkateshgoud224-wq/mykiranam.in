const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Define multi-upload fields for complaint evidence
const evidenceUploads = upload.fields([
  { name: 'image_product', maxCount: 1 },
  { name: 'image_expiry', maxCount: 1 },
  { name: 'image_bill', maxCount: 1 }
]);

// Protected routes
router.use(authMiddleware);

// Create a complaint
router.post('/', evidenceUploads, complaintController.createComplaint);

// Get my complaints
router.get('/my', complaintController.getMyComplaints);

module.exports = router;
