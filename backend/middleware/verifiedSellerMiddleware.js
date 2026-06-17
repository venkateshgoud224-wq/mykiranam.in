const db = require('../config/db');

const verifiedSellerMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Unauthorized.' });
  }

  // Admin bypass
  if (req.user.role === 'admin') {
    return next();
  }

  // Customers are allowed to access public/shared endpoints
  if (req.user.role === 'customer') {
    return next();
  }

  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Access denied. Sellers only.' });
  }

  try {
    const shopResult = await db.query(
      'SELECT verification_status FROM shops WHERE owner_id = $1',
      [req.user.id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. Shop profile not found.' });
    }

    const { verification_status } = shopResult.rows[0];
    if (verification_status !== 'Verified') {
      return res.status(403).json({ 
        error: 'Access denied. Your shop must be verified by an admin to perform this action.' 
      });
    }

    next();
  } catch (err) {
    console.error('Error in verifiedSellerMiddleware:', err);
    return res.status(500).json({ error: 'Server error checking shop verification.' });
  }
};

module.exports = verifiedSellerMiddleware;
