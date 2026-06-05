const db = require('../config/db');

exports.createComplaint = async (req, res) => {
  try {
    const { order_id, shop_id, issue_type, description } = req.body;
    const customer_id = req.user.id;

    if (!order_id || !shop_id || !issue_type || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process uploaded images
    const evidence_images = [];
    if (req.files) {
      if (req.files.image_product) {
        evidence_images.push(`/uploads/${req.files.image_product[0].filename}`);
      }
      if (req.files.image_expiry) {
        evidence_images.push(`/uploads/${req.files.image_expiry[0].filename}`);
      }
      if (req.files.image_bill) {
        evidence_images.push(`/uploads/${req.files.image_bill[0].filename}`);
      }
    }

    const newComplaintResult = await db.query(
      `INSERT INTO complaints (order_id, customer_id, shop_id, issue_type, description, evidence_images, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open')
       RETURNING *`,
      [order_id, customer_id, shop_id, issue_type, description, JSON.stringify(evidence_images)]
    );

    res.status(201).json(newComplaintResult.rows[0]);
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const complaintsResult = await db.query(
      `SELECT c.*, s.shop_name, o.custom_order_id
       FROM complaints c
       JOIN shops s ON c.shop_id = s.id
       JOIN orders o ON c.order_id = o.id
       WHERE c.customer_id = $1
       ORDER BY c.created_at DESC`,
      [customer_id]
    );

    res.status(200).json(complaintsResult.rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};
