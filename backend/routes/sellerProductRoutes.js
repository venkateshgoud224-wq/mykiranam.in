const express = require('express');
const router = express.Router();
const sellerProductController = require('../controllers/sellerProductController');
const authMiddleware = require('../middleware/authMiddleware');
const verifiedSellerMiddleware = require('../middleware/verifiedSellerMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Seller-only endpoints
router.post('/upload', authMiddleware, verifiedSellerMiddleware, upload.single('file'), sellerProductController.uploadCatalog);
router.get('/my-products', authMiddleware, verifiedSellerMiddleware, sellerProductController.getSellerProducts);
router.get('/sales-analytics', authMiddleware, verifiedSellerMiddleware, sellerProductController.getSalesAnalytics);
router.get('/download-report', authMiddleware, verifiedSellerMiddleware, sellerProductController.downloadExcelReport);
router.post('/', authMiddleware, verifiedSellerMiddleware, sellerProductController.addSellerProduct);
router.put('/:id', authMiddleware, verifiedSellerMiddleware, sellerProductController.updateSellerProduct);
router.delete('/:id', authMiddleware, verifiedSellerMiddleware, sellerProductController.deleteSellerProduct);

// Customer public endpoint
router.get('/shop/:shop_id', sellerProductController.getShopCatalog);

module.exports = router;
