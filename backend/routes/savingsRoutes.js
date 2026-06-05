const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const authMiddleware = require('../middleware/authMiddleware');

const isCustomer = (req, res, next) => {
  if (req.user && req.user.role === 'customer') next();
  else return res.status(403).json({ error: 'Access denied. Customers only.' });
};

const isSeller = (req, res, next) => {
  if (req.user && req.user.role === 'seller') next();
  else return res.status(403).json({ error: 'Access denied. Sellers only.' });
};

// Customer specific routes
router.get('/customer', authMiddleware, isCustomer, savingsController.getCustomerSavings);

// Public / Global routes
router.get('/community', savingsController.getCommunitySavings);

module.exports = router;
