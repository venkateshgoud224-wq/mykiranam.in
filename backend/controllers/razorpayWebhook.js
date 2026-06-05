const db = require('../config/db');
const { verifySignature } = require('../utils/razorpay');

/**
 * Razorpay webhook handler.
 * Expects raw body middleware to have populated req.rawBody.
 */
exports.handle = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!verifySignature(req.body, signature, secret)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  try {
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      await db.query(
        `UPDATE orders SET payment_status = 'Paid', razorpay_payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE razorpay_order_id = $2`,
        [payment.id, payment.order_id]
      );
    } else if (event === 'payment.refunded') {
      const payment = payload.payment.entity;
      await db.query(
        `UPDATE orders SET payment_status = 'Refunded', refund_status = 'Processed', refund_id = $1, updated_at = CURRENT_TIMESTAMP WHERE razorpay_payment_id = $2`,
        [payment.id, payment.id]
      );
    } else if (event === 'refund.processed') {
      const refund = payload.refund.entity;
      await db.query(
        `UPDATE orders SET refund_status = 'Credited', updated_at = CURRENT_TIMESTAMP WHERE refund_id = $1`,
        [refund.id]
      );
    } else if (event === 'transfer.processed') {
      const transfer = payload.transfer.entity;
      await db.query(
        `UPDATE commitment_payments SET status = 'credited', updated_at = CURRENT_TIMESTAMP WHERE razorpay_payment_id = $1`,
        [transfer.source]
      );
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
