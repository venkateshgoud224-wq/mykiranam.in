const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let clientReady = false;

// Initialize WhatsApp Web Client using LocalAuth (stores session to avoid re-scans)
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp_session'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// Event hook: Generate QR code in the terminal logs when starting up
client.on('qr', (qr) => {
  console.log('\n💬 [WHATSAPP GATEWAY] SCAN THIS QR CODE WITH YOUR PHONE LINKED DEVICES:');
  qrcode.generate(qr, { small: true });
});

// Event hook: Log when client is connected and ready to send messages
client.on('ready', () => {
  clientReady = true;
  console.log('\n🟢 [WHATSAPP GATEWAY] Client is fully authenticated and ready to dispatch messages!\n');
});

// Event hook: handle authentication failures
client.on('auth_failure', (msg) => {
  console.error('❌ [WHATSAPP GATEWAY] Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
  clientReady = false;
  console.log('🔴 [WHATSAPP GATEWAY] Client was disconnected:', reason);
});

// Initialize client
console.log('💬 [WHATSAPP GATEWAY] Initializing browser-automation engine...');
client.initialize().catch(err => {
  console.error('❌ [WHATSAPP GATEWAY] Failed to initialize client:', err.message);
});

// Log a nice ascii template box on backend terminal as a visual fallback
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
  const whatsappTo = `${formattedPhone}@c.us`; // target formatted phone JID

  const messageBody = `*${title.toUpperCase()}*\n\n${bodyText}\n\nSent via Kiranam.in`;

  if (clientReady) {
    try {
      await client.sendMessage(whatsappTo, messageBody);
      console.log(`💬 Unofficial WhatsApp message sent to ${formattedPhone}`);
      return { success: true, mock: false };
    } catch (err) {
      console.error(`❌ Unofficial WhatsApp Error sending to ${formattedPhone}:`, err.message);
      logVisualWhatsApp(formattedPhone, title, bodyText);
      return { success: false, error: err.message, fallback: true };
    }
  } else {
    console.log(`ℹ️ [WHATSAPP GATEWAY] Client not logged in yet. Logging visually to terminal.`);
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
