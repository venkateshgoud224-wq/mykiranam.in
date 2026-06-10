require('dotenv').config();
const crypto = require('crypto');

const test = async () => {
  const payload = {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    merchantTransactionId: `order_${Date.now()}`,
    merchantUserId: `cust_${Date.now()}`,
    amount: 100, // 1 INR
    redirectUrl: `http://localhost:5173/verification?order_id=1`,
    redirectMode: "REDIRECT",
    callbackUrl: `https://your-domain.com/api/payment/phonepe/verify`,
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE"
    }
  };

  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX;

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
  const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
  const xVerify = sha256 + "###" + saltIndex;

  const url = process.env.PHONEPE_ENV === 'PROD' 
    ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

  console.log("URL:", url);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("X-VERIFY:", xVerify);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify
    },
    body: JSON.stringify({
      request: base64Payload
    })
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
};

test();
