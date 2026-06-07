const db = require('../config/db');

exports.createComplaint = async (req, res) => {
  try {
    const { order_id, shop_id, issue_type, description } = req.body;
    const customer_id = req.user.id;

    if (!issue_type || !description) {
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

    // Require evidence photos for product quality/accuracy complaints
    const qualityIssues = [
      'Expired Product', 
      'Poor Quality Product', 
      'Poor Quality', 
      'Wrong Product', 
      'Missing Product', 
      'Incorrect Quantity', 
      'Damaged Product'
    ];
    if (qualityIssues.includes(issue_type)) {
      if (evidence_images.length === 0) {
        return res.status(400).json({ error: 'Evidence photos are required for product quality or missing item complaints.' });
      }
    }

    const newComplaintResult = await db.query(
      `INSERT INTO complaints (order_id, customer_id, shop_id, issue_type, description, evidence_images, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING *`,
      [
        order_id ? Number(order_id) : null,
        customer_id,
        shop_id ? Number(shop_id) : null,
        issue_type,
        description,
        JSON.stringify(evidence_images)
      ]
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
       LEFT JOIN shops s ON c.shop_id = s.id
       LEFT JOIN orders o ON c.order_id = o.id
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

exports.getShopDisputes = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [sellerId]);
    if (shopResult.rows.length === 0) {
      return res.status(200).json([]);
    }
    const shopId = shopResult.rows[0].id;

    const disputesResult = await db.query(
      `SELECT c.*, u.name as customer_name, o.custom_order_id
       FROM complaints c
       JOIN users u ON c.customer_id = u.id
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.shop_id = $1
       ORDER BY c.created_at DESC`,
      [shopId]
    );

    res.status(200).json(disputesResult.rows);
  } catch (err) {
    console.error('Error fetching shop disputes:', err);
    res.status(500).json({ error: 'Failed to fetch disputes.' });
  }
};

exports.submitExplanation = async (req, res) => {
  const { id } = req.params;
  const { seller_explanation } = req.body;
  const sellerId = req.user.id;

  if (!seller_explanation) {
    return res.status(400).json({ error: 'Explanation is required.' });
  }

  try {
    const complaintCheck = await db.query(
      `SELECT c.*, s.owner_id 
       FROM complaints c 
       JOIN shops s ON c.shop_id = s.id 
       WHERE c.id = $1`,
      [id]
    );

    if (complaintCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const complaint = complaintCheck.rows[0];
    if (Number(complaint.owner_id) !== Number(sellerId)) {
      return res.status(403).json({ error: 'Unauthorized to respond to this dispute.' });
    }

    const result = await db.query(
      `UPDATE complaints 
       SET seller_explanation = $1, status = 'Seller Responded', seller_response_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [seller_explanation, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting seller explanation:', err);
    res.status(500).json({ error: 'Server error saving explanation.' });
  }
};

