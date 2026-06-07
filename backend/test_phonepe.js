const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env') });

const testPhonePe = async () => {
  const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
  const saltKey = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
  const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  const env = process.env.PHONEPE_ENV || 'UAT';

  console.log('Using credentials:');
  console.log('- Merchant ID:', merchantId);
  console.log('- Env:', env);

  const payload = {
    merchantId: merchantId,
    merchantTransactionId: `test_${Date.now()}`,
    merchantUserId: 'test_cust_1',
    amount: 100, // ₹1.00
    redirectUrl: 'http://localhost:5173/verification?order_id=1',
    redirectMode: 'REDIRECT',
    callbackUrl: 'https://your-domain.com/api/payment/phonepe/verify',
    mobileNumber: '9999999999',
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
  const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
  const xVerify = sha256 + '###' + saltIndex;

  const url = env === 'PROD' 
    ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

  console.log('\nSending request to:', url);

  try {
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

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch Error:', error);
  }
};

testPhonePe();
