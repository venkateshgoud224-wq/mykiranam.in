const express = require('express');
const router = express.Router();
const sellerProtectionController = require('../controllers/sellerProtectionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Seller Protection Endpoints
router.post('/block', sellerProtectionController.blockCustomer);
router.post('/report', sellerProtectionController.reportCustomer);

// Mark order as No Pickup (uses order ID)
router.post('/order/:id/no-pickup', sellerProtectionController.markNoPickup);

module.exports = router;
