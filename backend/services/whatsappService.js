require('dotenv').config();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

let client = null;

// Initialize Twilio client if keys are present
if (twilioAccountSid && twilioAuthToken) {
  try {
    const twilio = require('twilio');
    client = twilio(twilioAccountSid, twilioAuthToken);
    console.log('💬 WhatsApp Service: Twilio API client initialized.');
  } catch (err) {
    console.error('❌ Failed to load twilio SDK:', err.message);
  }
} else {
  console.log('💬 WhatsApp Service: Twilio credentials not found in env. Running in Sandbox Visual Logger Mode.');
}

// Log a nice ascii template box on backend terminal
const logVisualWhatsApp = (to, title, message) => {
  const border = '═'.repeat(60);
  const timeStr = new Date().toLocaleTimeString();
  
  console.log(`
\x1b[32m╔${border}╗
║ 💬 WHATSAPP SIMULATION LOG [${timeStr}]
╠${border}╣
║ Recipient:  whatsapp:${to}
║ Event:      ${title.toUpperCase()}
║
║ TEXT MESSAGE:
║ "${message}"
╚${border}╝\x1b[0m
`);
};

// Send automated WhatsApp message
const sendWhatsAppMessage = async (to, title, bodyText) => {
  if (!to) return { success: false, error: 'No phone number provided' };

  // Strip non-numeric chars or format matching WhatsApp string
  const cleanPhone = to.replace(/\D/g, '');
  // Default India country code if not specified
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappTo = `whatsapp:+${formattedPhone}`;

  if (client) {
    try {
      const response = await client.messages.create({
        from: twilioPhoneNumber,
        to: whatsappTo,
        body: `${title.toUpperCase()}\n\n${bodyText}\n\nSent via Kiranam.in`
      });
      console.log(`💬 Twilio WhatsApp message sent: ${response.sid}`);
      return { success: true, sid: response.sid };
    } catch (err) {
      console.error('❌ Twilio WhatsApp Error:', err.message);
      // Fallback to log visual
      logVisualWhatsApp(formattedPhone, title, bodyText);
      return { success: false, error: err.message, fallback: true };
    }
  } else {
    logVisualWhatsApp(formattedPhone, title, bodyText);
    return { success: true, mock: true };
  }
};

// Helper to format order ID (prefixes KRN if purely numeric, otherwise keeps as is)
const formatOrderId = (id) => {
  if (!id) return '';
  if (/^\d+$/.test(String(id))) {
    return `KRN${id}`;
  }
  return String(id);
};

// Automated WhatsApp Event flows

const sendSellerNewOrderWhatsApp = async (sellerPhone, orderId, customerName, timeStr = '10:30 AM') => {
  const text = `New Order Received!\nOrder ID: ${formatOrderId(orderId)}\nCustomer: ${customerName}\nTime: ${timeStr}\n\nPlease login to Kiranam.in seller dashboard to review the chitti upload and publish the rewritten bill.`;
  return sendWhatsAppMessage(sellerPhone, 'New Customer Order', text);
};

const sendCustomerBillUploadedWhatsApp = async (customerPhone, orderId, amount, shopName) => {
  const text = `Your order has been updated.\nOrder ID: ${formatOrderId(orderId)}\nSeller uploaded modified bill.\nTotal amount: ₹${amount}\n\nPlease review your order and select a payment preference to finalize order processing.`;
  return sendCustomerUpdateWhatsApp(customerPhone, orderId, 'Bill Uploaded', text);
};

const sendCustomerUpdateWhatsApp = async (customerPhone, orderId, eventType, text) => {
  return sendWhatsAppMessage(customerPhone, `Order update: ${eventType}`, text);
};

// OTP Sender verification
const sendWhatsAppOTP = async (phone, otp) => {
  const text = `Your Kiranam.in verification code is: ${otp}.\n\nThis OTP is valid for 10 minutes. Do not share this with anyone.`;
  return sendWhatsAppMessage(phone, 'WhatsApp verification OTP', text);
};

module.exports = {
  sendWhatsAppMessage,
  sendSellerNewOrderWhatsApp,
  sendCustomerBillUploadedWhatsApp,
  sendCustomerUpdateWhatsApp,
  sendWhatsAppOTP
};
