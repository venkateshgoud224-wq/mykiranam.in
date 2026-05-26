const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

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

// --- SIMULATION ENDPOINTS ---
router.get('/simulate', adminController.getSimulationStatus);
router.post('/simulate/toggle', adminController.toggleSimulation);
router.post('/simulate/peak', adminController.triggerPeakTraffic);
router.post('/simulate/clear', adminController.clearActiveQueues);
router.post('/simulate/step', adminController.stepSimulation);

module.exports = router;
