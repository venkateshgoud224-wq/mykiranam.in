const db = require('../config/db');

exports.createReview = async (req, res) => {
  try {
    const { order_id, shop_id, product_quality, service_quality, order_accuracy, overall_experience, review_text } = req.body;
    const customer_id = req.user.id;

    if (!order_id || !shop_id || !product_quality || !service_quality || !order_accuracy || !overall_experience) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert review
    const newReviewResult = await db.query(
      `INSERT INTO reviews (order_id, customer_id, shop_id, product_quality, service_quality, order_accuracy, overall_experience, review_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [order_id, customer_id, shop_id, product_quality, service_quality, order_accuracy, overall_experience, review_text]
    );

    // Recalculate shop rating
    // Taking the average of all 4 sub-ratings for transparency
    const avgResult = await db.query(
      `SELECT AVG((product_quality + service_quality + order_accuracy + overall_experience) / 4.0) as new_rating, COUNT(*) as total_reviews
       FROM reviews WHERE shop_id = $1`,
      [shop_id]
    );

    if (avgResult.rows.length > 0) {
      const newRating = parseFloat(avgResult.rows[0].new_rating || 4.0).toFixed(1);
      const totalReviews = parseInt(avgResult.rows[0].total_reviews || 0);

      await db.query(
        `UPDATE shops SET rating = $1, total_reviews = $2 WHERE id = $3`,
        [newRating, totalReviews, shop_id]
      );
    }

    res.status(201).json(newReviewResult.rows[0]);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

exports.getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;
    const reviewsResult = await db.query(
      `SELECT r.*, u.name as customer_name 
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.shop_id = $1
       ORDER BY r.created_at DESC`,
      [shopId]
    );

    res.status(200).json(reviewsResult.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};
