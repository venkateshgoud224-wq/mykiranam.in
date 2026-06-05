const db = require('../config/db');
const Cashfree = require('../utils/cashfree');

/**
 * Cashfree webhook handler.
 * Expects raw body middleware to have populated req.rawBody or parses req.body string.
 */
exports.handle = async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  try {
    // Throws an error if invalid
    Cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
  } catch (err) {
    console.error('Cashfree Webhook Signature Error:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const payload = req.body;
  const event = payload.type; // Cashfree uses 'type' for the event name (e.g., PAYMENT_SUCCESS_WEBHOOK)

  try {
    if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
      const payment = payload.data.payment;
      const order = payload.data.order;
      await db.query(
        `UPDATE orders SET payment_status = 'Paid', cashfree_session_id = $1, updated_at = CURRENT_TIMESTAMP WHERE cashfree_order_id = $2`,
        [payment.cf_payment_id, order.order_id]
      );
    } else if (event === 'PAYMENT_FAILED_WEBHOOK') {
      const order = payload.data.order;
      await db.query(
        `UPDATE orders SET payment_status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE cashfree_order_id = $1`,
        [order.order_id]
      );
    } else if (event === 'REFUND_WEBHOOK') {
      const refund = payload.data.refund;
      if (refund.refund_status === 'SUCCESS') {
        await db.query(
          `UPDATE orders SET refund_status = 'Credited', updated_at = CURRENT_TIMESTAMP WHERE refund_id = $1`,
          [refund.refund_id]
        );
      }
    } else if (event === 'SETTLEMENT_RECON_WEBHOOK') {
      // Used for vendor settlement/split success
      const settlement = payload.data.settlement;
      await db.query(
        `UPDATE commitment_payments SET status = 'credited', updated_at = CURRENT_TIMESTAMP WHERE cashfree_order_id = $1`,
        [settlement.order_id]
      );
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Cashfree webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
