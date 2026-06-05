/**
 * WhatsApp Service - Kiranam.in
 * 
 * Uses whatsapp-web.js (unofficial) for sending real WhatsApp messages
 * via browser automation. Gracefully degrades to terminal simulation
 * if the library is not installed or Puppeteer fails to initialize.
 * 
 * SETUP: Run `npm install whatsapp-web.js qrcode-terminal` in /backend
 * then restart the server and scan the QR code that appears in the terminal.
 */

let client = null;
let clientReady = false;
let clientInitializing = false;

// ── Lazy initializer ────────────────────────────────────────────────────────
const initWhatsAppClient = () => {
  if (clientInitializing || clientReady) return;
  clientInitializing = true;

  try {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');

    client = new Client({
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

    client.on('qr', (qr) => {
      console.log('\n\n💬 [WHATSAPP GATEWAY] ──────────────────────────────────────');
      console.log('   Scan this QR code with your phone → WhatsApp → Linked Devices');
      console.log('───────────────────────────────────────────────────────────────\n');
      qrcode.generate(qr, { small: true });
      console.log('───────────────────────────────────────────────────────────────\n');

      // Save QR code as PNG to both backend directory and artifacts directory
      try {
        const QRCodeLib = require('qrcode');
        const fs = require('fs');
        const path = require('path');
        
        // Save to backend folder
        const localPath = path.join(__dirname, '../whatsapp_qr.png');
        QRCodeLib.toFile(localPath, qr, { width: 300, margin: 2 }, (err) => {
          if (err) console.error('❌ Error saving QR PNG locally:', err.message);
          else console.log('💾 WhatsApp QR code saved as PNG to backend/whatsapp_qr.png');
        });

        // Save to artifacts folder
        const artifactDir = 'C:/Users/Navi/.gemini/antigravity-ide/brain/0dba7bb1-bbda-43b8-bba0-408d6b849719';
        if (fs.existsSync(artifactDir)) {
          const artifactPath = path.join(artifactDir, 'whatsapp_qr.png');
          QRCodeLib.toFile(artifactPath, qr, { width: 300, margin: 2 }, (err) => {
            if (err) console.error('❌ Error saving QR PNG to artifacts:', err.message);
            else console.log('💾 WhatsApp QR code saved to artifacts folder for display!');
          });
        }
      } catch (err) {
        console.error('❌ Error generating QR PNG:', err.message);
      }
    });

    client.on('ready', () => {
      clientReady = true;
      clientInitializing = false;
      console.log('\n🟢 [WHATSAPP GATEWAY] Client authenticated and ready to send messages!\n');
    });

    client.on('auth_failure', (msg) => {
      clientReady = false;
      clientInitializing = false;
      console.error('❌ [WHATSAPP GATEWAY] Authentication failure:', msg);
    });

    client.on('disconnected', (reason) => {
      clientReady = false;
      clientInitializing = false;
      console.log('🔴 [WHATSAPP GATEWAY] Client disconnected:', reason);
    });

    console.log('💬 [WHATSAPP GATEWAY] Initializing browser engine… (QR code will appear shortly)');
    client.initialize().catch(err => {
      clientInitializing = false;
      console.error('❌ [WHATSAPP GATEWAY] Failed to initialize:', err.message);
      console.log('ℹ️  [WHATSAPP GATEWAY] Falling back to terminal simulation mode.');
    });
  } catch (loadErr) {
    clientInitializing = false;
    console.warn('⚠️  [WHATSAPP GATEWAY] whatsapp-web.js not installed. Running in simulation mode.');
    console.warn('   To enable real WhatsApp: run `npm install whatsapp-web.js qrcode-terminal` in /backend');
  }
};

// Start initialization in background (non-blocking)
// Wrapped in setImmediate so it doesn't block server boot
// Force restart trigger: 2026-05-26T20:50:00
setImmediate(() => {
  initWhatsAppClient();
});

// ── Visual terminal fallback log ─────────────────────────────────────────────
const logVisualWhatsApp = (to, title, message) => {
  const border = '═'.repeat(60);
  const timeStr = new Date().toLocaleTimeString();
  console.log(`
\x1b[32m╔${border}╗
║ 💬 WHATSAPP [${timeStr}] — SIMULATION MODE
╠${border}╣
║ To:      +${to}
║ Event:   ${title.toUpperCase()}
║
║ "${message}"
╚${border}╝\x1b[0m
`);
};

// ── Core message sender ──────────────────────────────────────────────────────
const sendWhatsAppMessage = async (to, title, bodyText) => {
  if (!to) return { success: false, error: 'No phone number provided' };

  const cleanPhone = to.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappTo = `${formattedPhone}@c.us`;

  const messageBody = `*${title.toUpperCase()}*\n\n${bodyText}\n\n_Sent via https://mykiranam.in_`;

  if (clientReady && client) {
    try {
      await client.sendMessage(whatsappTo, messageBody);
      console.log(`✅ [WHATSAPP] Message delivered to +${formattedPhone}`);
      return { success: true, mock: false };
    } catch (err) {
      console.error(`❌ [WHATSAPP] Send failed to +${formattedPhone}:`, err.message);
      logVisualWhatsApp(formattedPhone, title, bodyText);
      return { success: false, error: err.message, fallback: true };
    }
  } else {
    // Simulation mode - log to terminal
    logVisualWhatsApp(formattedPhone, title, bodyText);
    return { success: true, mock: true };
  }
};

// ── Order ID formatter ───────────────────────────────────────────────────────
const formatOrderId = (id) => {
  if (!id) return '';
  if (/^\d+$/.test(String(id))) return `KRN${id}`;
  return String(id);
};

// ── Event-specific senders ───────────────────────────────────────────────────

const sendSellerNewOrderWhatsApp = async (sellerPhone, orderId, customerName, timeStr = '') => {
  const time = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const text = `New order received!\n\n📦 Order ID: ${formatOrderId(orderId)}\n👤 Customer: ${customerName}\n🕐 Time: ${time}\n\nPlease log in to https://mykiranam.in/seller/dashboard to review and publish the rewritten bill.`;
  return sendWhatsAppMessage(sellerPhone, '🆕 New Customer Order', text);
};

const sendCustomerBillUploadedWhatsApp = async (customerPhone, orderId, amount, shopName) => {
  const text = `Your order bill has been updated!\n\n📦 Order ID: ${formatOrderId(orderId)}\n🏪 Shop: ${shopName}\n💰 Amount: ₹${amount}\n\nPlease log in to https://mykiranam.in/orders to review the bill and select a payment method.`;
  return sendWhatsAppMessage(customerPhone, '📋 Bill Uploaded', text);
};

const sendCustomerUpdateWhatsApp = async (customerPhone, orderId, eventType, text) => {
  return sendWhatsAppMessage(customerPhone, `📦 Order Update: ${eventType}`, text);
};

// ── OTP Verification sender ──────────────────────────────────────────────────
const sendWhatsAppOTP = async (phone, otp) => {
  const text = `Your Kiranam.in verification code is:\n\n*${otp}*\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone.`;
  return sendWhatsAppMessage(phone, '🔐 WhatsApp Verification OTP', text);
};

module.exports = {
  sendWhatsAppMessage,
  sendSellerNewOrderWhatsApp,
  sendCustomerBillUploadedWhatsApp,
  sendCustomerUpdateWhatsApp,
  sendWhatsAppOTP,
  getClientStatus: () => ({ ready: clientReady, initializing: clientInitializing })
};
