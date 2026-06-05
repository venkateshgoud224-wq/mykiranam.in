const crypto = require('crypto');
const db = require('../config/db');

const createPhonePeOrder = async (req, res) => {
  const { amount, receipt, order_id, redirect_url } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1.00)' });
  }

  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const env = process.env.PHONEPE_ENV || 'UAT';

    const merchantTransactionId = receipt || `order_${Date.now()}`;
    const amountInPaise = amount;

    let customerId = `cust_${req.user ? req.user.id : Date.now()}`;
    let customerPhone = req.user && req.user.phone ? req.user.phone : "9999999999";

    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: customerId,
      amount: amountInPaise,
      redirectUrl: redirect_url || `http://localhost:5173/verification?order_id=${order_id}`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://your-domain.com/api/payment/phonepe/verify`, 
      mobileNumber: customerPhone,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    
    // X-VERIFY = SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + saltIndex;

    const url = env === 'PROD' 
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify
      },
      body: JSON.stringify({
        request: base64Payload
      })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (data && data.success) {
      res.status(200).json({
        success: true,
        redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        order_id: merchantTransactionId,
        amount: amount,
        currency: 'INR'
      });
    } else {
      res.status(400).json({ error: 'Failed to initiate PhonePe payment', details: data });
    }
  } catch (error) {
    console.error('PhonePe Create Order Error:', error.message);
    res.status(500).json({ error: 'Failed to create PhonePe order' });
  }
};

const verifyPhonePePayment = async (req, res) => {
  try {
    const { order_id } = req.body; 
    
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;
    const env = process.env.PHONEPE_ENV || 'UAT';
    
    // transactionId typically passed back from frontend
    const transactionId = req.body.transactionId || req.body.merchantTransactionId;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transaction details' });
    }

    const stringToHash = `/pg/v1/status/${merchantId}/${transactionId}` + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + saltIndex;

    const url = env === 'PROD' 
      ? `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${transactionId}` 
      : `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${transactionId}`;

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': merchantId
      }
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (data && data.code === 'PAYMENT_SUCCESS') {
      if (order_id) {
        await db.query(
          `UPDATE orders 
           SET order_status = 'Confirmed',
               payment_status = 'Paid', 
               payment_method = 'PhonePe UPI', 
               cashfree_order_id = $1, 
               confirmed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [transactionId, order_id]
        );
      }
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ success: false, error: 'Payment not successful', status: data.code });
    }
  } catch (error) {
    console.error('PhonePe Verification Error:', error.message);
    res.status(500).json({ error: 'Failed to verify PhonePe payment' });
  }
};

module.exports = {
  createPhonePeOrder,
  verifyPhonePePayment
};
