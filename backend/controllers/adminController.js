const db = require('../config/db');
const socketService = require('../services/socketService');
// 1. Get list of all shops/sellers for admin audits
const getSellersList = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone 
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       ORDER BY 
         CASE 
           WHEN s.verification_status = 'Under Review' THEN 1
           WHEN s.verification_status = 'Pending' THEN 2
           WHEN s.verification_status = 'Verified' THEN 3
           WHEN s.verification_status = 'Rejected' THEN 4
           ELSE 5
         END ASC, s.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching admin seller list:', err);
    return res.status(500).json({ error: 'Server error retrieving seller registrations.' });
  }
};

// 2. Perform Verification Action
const updateVerificationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status.' });
  }

  try {
    const shopResult = await db.query('SELECT owner_id, shop_name FROM shops WHERE id = $1', [id]);
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seller shop profile not found.' });
    }

    const shop = shopResult.rows[0];
    const isVerified = status === 'Verified';
    const verifiedByAdmin = isVerified;

    const updateResult = await db.query(
      `UPDATE shops 
       SET verification_status = $1, verified_by_admin = $2, verified = $3, 
           verification_date = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE verification_date END
       WHERE id = $4 
       RETURNING *`,
      [status, verifiedByAdmin, isVerified, id]
    );

    const updatedShop = updateResult.rows[0];

    const message = `Your shop verification status has been updated to: ${status}. ${notes ? `Comment: ${notes}` : ''}`;
    const notifResult = await db.query(
      'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3) RETURNING *',
      [shop.owner_id, message, 'verification_update']
    );

    socketService.sendNotification(shop.owner_id, {
      ...notifResult.rows[0],
      sound: true
    });

    socketService.emitShopStatus(
      updatedShop.id,
      updatedShop.availability_status,
      updatedShop.active_orders,
      updatedShop.waiting_time
    );

    return res.status(200).json({
      message: `Shop verification successfully updated to ${status}.`,
      shop: updatedShop
    });
  } catch (err) {
    console.error('Error updating shop verification status:', err);
    return res.status(500).json({ error: 'Server error updating seller profile status.' });
  }
};

module.exports = {
  getSellersList,
  updateVerificationStatus
};
