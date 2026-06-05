// backend/services/commitmentPaymentService.js

const Razorpay = require('razorpay');
const db = require('../config/db');

class CommitmentPaymentService {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error('Razorpay credentials are missing in environment variables');
      throw new Error('Razorpay credentials not configured');
    }
    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  // orderAmount in paise
  calculateCommitment(orderAmount) {
    const tenPercent = Math.floor(orderAmount / 10);
    const cap = 5000; // ₹50 in paise
    return Math.min(tenPercent, cap);
  }

  async createPayment(orderId, amountPaise) {
    try {
      const razorOrder = await this.client.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `commitment_${orderId}_${Date.now()}`,
        payment_capture: 1,
      });
      // Insert commitment record
        // In mock mode, skip DB insert for commitment payments
        if (require('../config/db').getIsMock()) {
          console.log('Mock DB: Skipping commitment record insert');
        } else {
          await db.query(
            `INSERT INTO commitment_payments (order_id, amount, status) VALUES ($1, $2, $3)`,
            [orderId, amountPaise, 'pending']
          );
        }
      return razorOrder;
    } catch (err) {
      console.error('Error creating Razorpay payment for order', orderId, err);
      throw err;
    }
  }

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    return this.client.utility.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
  }

  async markPaid(orderId, razorpayPaymentId) {
    await db.query(
      `UPDATE commitment_payments SET status = 'paid', razorpay_payment_id = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $1 AND status = 'pending'`,
      [orderId, razorpayPaymentId]
    );
  }

  async processRefund(orderId, processingFeePaise = 1000) {
    const { rows } = await db.query(`SELECT * FROM commitment_payments WHERE order_id = $1`, [orderId]);
    const cp = rows[0];
    if (!cp || cp.status !== 'paid') throw new Error('Cannot refund non‑paid commitment');
    const refundAmount = Math.max(cp.amount - processingFeePaise, 0);
    
    // Call Razorpay refund
    if (cp.razorpay_payment_id) {
      try {
        await this.client.payments.refund(cp.razorpay_payment_id, {
          amount: refundAmount,
          speed: 'normal'
        });
      } catch (err) {
        console.error('Razorpay refund error:', err);
        throw new Error('Failed to process refund with payment gateway');
      }
    } else {
      console.warn(`No razorpay_payment_id found for commitment ${cp.id}, skipping actual refund call.`);
    }

    await db.query(
      `UPDATE commitment_payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [cp.id]
    );
    return refundAmount;
  }

  async settleToSeller(orderId) {
    const { rows } = await db.query(
      `SELECT cp.*, s.razorpay_linked_account_id 
       FROM commitment_payments cp
       JOIN orders o ON cp.order_id = o.id
       JOIN shops s ON o.shop_id = s.id
       WHERE cp.order_id = $1 AND cp.status = 'paid'`,
      [orderId]
    );
    const cp = rows[0];
    if (!cp) return null;

    // Razorpay standard gateway fee (approx 2.36%)
    const gatewayFeeRate = 0.0236; 
    const gatewayFee = Math.round(cp.amount * gatewayFeeRate);
    const sellerAmount = cp.amount - gatewayFee;
    const platformAmount = gatewayFee;

    // Execute transfer via Razorpay Route
    if (cp.razorpay_payment_id && cp.razorpay_linked_account_id) {
      try {
        await this.client.payments.transfer(cp.razorpay_payment_id, {
          transfers: [
            {
              account: cp.razorpay_linked_account_id,
              amount: sellerAmount,
              currency: 'INR',
              notes: { order_id: orderId },
              linked_account_notes: ['order_id'],
              on_hold: false
            }
          ]
        });
      } catch (err) {
        console.error('Razorpay split transfer error:', err);
      }
    } else {
      console.warn(`Cannot auto-settle commitment for order ${orderId}: Missing payment ID or seller linked account`);
    }

    await db.query(
      `UPDATE commitment_payments SET status = 'settled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [cp.id]
    );
    return { sellerAmount, platformAmount };
  }
}

module.exports = new CommitmentPaymentService();
