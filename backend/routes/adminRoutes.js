const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Custom admin check middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden. Access restricted to administrator accounts.' });
  }
};

// Protect all admin endpoints
router.use(authMiddleware);
router.use(requireAdmin);

// Fetch applications listing
router.get('/sellers', adminController.getSellersList);

// Modify shop status (Verify, Reject, Suspend)
router.patch('/sellers/:id/verify', adminController.updateVerificationStatus);

// Fetch admin analytics
router.get('/analytics', adminController.getAnalytics);

// Fetch all complaints
router.get('/complaints', adminController.getComplaints);

// Verify a complaint and trigger suspension logic
router.patch('/complaints/:id/verify', adminController.verifyComplaint);

// Reject a complaint and recalculate seller metrics
router.patch('/complaints/:id/reject', adminController.rejectComplaint);

// Fetch trust and safety dashboard data
router.get('/trust-dashboard', adminController.getTrustDashboard);

// Upload prices CSV
router.post('/upload-prices', upload.single('file'), adminController.uploadPricesCsv);

// Fetch customers list
router.get('/customers', adminController.getCustomersList);

// Fetch completed/cancelled orders list
router.get('/completed-orders', adminController.getCompletedOrdersList);

// Fetch seller KYC details for a specific shop
router.get('/sellers/:id/kyc', adminController.getSellerKyc);

module.exports = router;
