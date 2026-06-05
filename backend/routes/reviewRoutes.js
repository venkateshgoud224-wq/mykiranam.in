const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Get shop reviews (public)
router.get('/shop/:shopId', reviewController.getShopReviews);

// Protected routes
router.use(authMiddleware);

// Create a review
router.post('/', reviewController.createReview);

module.exports = router;
