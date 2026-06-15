const express = require('express');
const router = express.Router();
const sellerProductController = require('../controllers/sellerProductController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Seller-only endpoints
router.post('/upload', authMiddleware, upload.single('file'), sellerProductController.uploadCatalog);
router.get('/my-products', authMiddleware, sellerProductController.getSellerProducts);
router.get('/sales-analytics', authMiddleware, sellerProductController.getSalesAnalytics);
router.get('/download-report', authMiddleware, sellerProductController.downloadExcelReport);
router.post('/', authMiddleware, sellerProductController.addSellerProduct);
router.put('/:id', authMiddleware, sellerProductController.updateSellerProduct);
router.delete('/:id', authMiddleware, sellerProductController.deleteSellerProduct);

// Customer public endpoint
router.get('/shop/:shop_id', sellerProductController.getShopCatalog);

module.exports = router;
