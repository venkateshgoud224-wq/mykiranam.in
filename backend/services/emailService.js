const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

// Warm golden-amber Kiranam styling tokens
const THEME_COLOR = '#d97706'; // Amber 600
const BACKGROUND_COLOR = '#fef3c7'; // Amber 100
const TEXT_MUTED = '#6b7280';
const CARD_BG = '#ffffff';

// Initialize the mail transporter
const initTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log('📬 Email Service: Initializing SMTP Transporter using custom credentials...');
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass }
    });
  } else {
    console.log('📬 Email Service: SMTP credentials not set. Generating Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`✉️ Ethereal Email Account generated: ${testAccount.user}`);
    } catch (err) {
      console.error('❌ Failed to generate Ethereal test email account:', err.message);
      // Create a dummy local log transporter fallback if internet is completely down
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n========================================');
          console.log('🔴 EMAIL DISPATCH LOGGER (OFFLINE MOCK)');
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Text: ${mailOptions.text}`);
          console.log('========================================\n');
          return { messageId: 'mock-offline-id-' + Date.now() };
        }
      };
    }
  }
  return transporter;
};

// Common HTML Template Wrapper
const getHtmlLayout = (title, content) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${CARD_BG};
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, ${THEME_COLOR}, #b45309);
            padding: 30px 20px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 0.5px;
          }
          .body {
            padding: 30px 20px;
            line-height: 1.6;
          }
          .content-box {
            background-color: #fffbeb;
            border-left: 4px solid ${THEME_COLOR};
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .btn {
            display: inline-block;
            background-color: ${THEME_COLOR};
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 30px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: ${TEXT_MUTED};
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏪 Kiranam.in</h1>
            <div style="font-size: 13px; margin-top: 5px; opacity: 0.9;">Hyperlocal Kirana Marketplace • Bangalore</div>
          </div>
          <div class="body">
            <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
            ${content}
          </div>
          <div class="footer">
            <p>You received this transactional update because you registered on Kiranam.in.</p>
            <p>© 2026 Kiranam.in. HSR Layout, Bangalore, Karnataka, India.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Send Transactional Email helper
const sendMail = async ({ to, subject, title, htmlContent, textFallback }) => {
  try {
    const mailTransporter = await initTransporter();
    const mailOptions = {
      from: `"Kiranam.in" <no-reply@kiranam.in>`,
      to,
      subject,
      text: textFallback,
      html: getHtmlLayout(title, htmlContent)
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`✉️ Email sent successfully! MessageID: ${info.messageId}`);
    
    // Log preview URL if sent to Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📬 Ethereal Mail Preview URL: \x1b[36m%s\x1b[0m`, previewUrl);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('❌ Failed to dispatch email:', err.message);
    return { success: false, error: err.message };
  }
};

// Email Event Templates
const sendSignupEmail = async (userEmail, userName) => {
  return sendMail({
    to: userEmail,
    subject: 'Welcome to Kiranam.in!',
    title: `Namaskaram, ${userName}!`,
    textFallback: `Welcome to Kiranam.in. Your account has been created successfully. Browse verified stores in Bangalore and upload grocery chittis from the comfort of your home!`,
    htmlContent: `
      <p>Thank you for signing up on <strong>Kiranam.in</strong>, Bangalore's premier hyperlocal queue-managed kirana marketplace.</p>
      <p>We are excited to help you skip the crowded lines at your local kirana shops!</p>
      <div class="content-box">
        <strong>Getting Started is Simple:</strong>
        <ul>
          <li>Find nearby verified kirana stores in Bangalore.</li>
          <li>Take a photo of your handwritten grocery list (Chitti) and upload it.</li>
          <li>The seller will upload a rewritten digital bill for your review.</li>
          <li>Pay online via UPI or choose Cash during pickup!</li>
          <li>Get notified when your order is packed and ready.</li>
        </ul>
      </div>
      <center>
        <a href="http://localhost:5173" class="btn">Explore Bangalore Marketplace</a>
      </center>
    `
  });
};

const sendOrderPlacedEmail = async (userEmail, orderId, shopName) => {
  return sendMail({
    to: userEmail,
    subject: `Order #${orderId} Placed successfully`,
    title: 'Order Received!',
    textFallback: `Your order #${orderId} has been successfully placed at ${shopName}. We will notify you once the seller reviews your grocery chitti and uploads the bill.`,
    htmlContent: `
      <p>We have successfully sent your order request to <strong>${shopName}</strong>.</p>
      <p>Here are your order details:</p>
      <div class="content-box">
        <strong>Order Information:</strong><br>
        • Order ID: <strong>#${orderId}</strong><br>
        • Store Name: <strong>${shopName}</strong><br>
        • Status: <strong>Waiting For Seller Review</strong>
      </div>
      <p>What happens next? The merchant will calculate current item weights, update pricing, and upload a modified bill detailing what's in stock. We'll send you an alert the second it's ready.</p>
      <center>
        <a href="http://localhost:5173/orders" class="btn">Track Your Order</a>
      </center>
    `
  });
};

const sendBillUploadedEmail = async (userEmail, orderId, amount, shopName) => {
  return sendMail({
    to: userEmail,
    subject: `Review Bill for Order #${orderId}`,
    title: 'New Bill Uploaded',
    textFallback: `The seller at ${shopName} has uploaded the digital bill for Order #${orderId}. Total amount is ₹${amount}. Please review and confirm your order.`,
    htmlContent: `
      <p><strong>${shopName}</strong> has processed your order <strong>#${orderId}</strong> and uploaded the bill details.</p>
      <div class="content-box">
        <strong>Bill Calculation:</strong><br>
        • Order ID: <strong>#${orderId}</strong><br>
        • Total Amount: <strong style="color: ${THEME_COLOR}; font-size: 18px;">₹${amount}</strong><br>
        • Action Required: <strong>Confirm and Choose Payment Mode</strong>
      </div>
      <p>Please log in to your dashboard to review the list of available items, weight corrections, and finalize your pickup preference.</p>
      <center>
        <a href="http://localhost:5173/orders" class="btn">Review and Confirm Bill</a>
      </center>
    `
  });
};

const sendOrderConfirmedEmail = async (userEmail, orderId, shopName) => {
  return sendMail({
    to: userEmail,
    subject: `Order #${orderId} Confirmed`,
    title: 'Order Confirmed!',
    textFallback: `Your order #${orderId} at ${shopName} has been confirmed. The store is now packing your items.`,
    htmlContent: `
      <p>Great news! Your payment/confirmation has been received for order <strong>#${orderId}</strong> at <strong>${shopName}</strong>.</p>
      <div class="content-box">
        <strong>Status: Confirmed & Packing</strong><br>
        The seller has added your order to their active packing queue and is wrapping your grocery items.
      </div>
      <p>You will receive an update as soon as the merchant finishes bagging and tags your order as ready for pickup.</p>
    `
  });
};

const sendPickupReadyEmail = async (userEmail, orderId, shopName) => {
  return sendMail({
    to: userEmail,
    subject: `Order #${orderId} Ready for Pickup!`,
    title: 'Bag Ready for Pickup! 🎒',
    textFallback: `Your order #${orderId} at ${shopName} is fully packed and ready for pickup. Please head to the store now.`,
    htmlContent: `
      <p>Your grocery bag is packed and waiting for you at <strong>${shopName}</strong>!</p>
      <div class="content-box" style="background-color: #ecfdf5; border-left-color: #10b981;">
        <strong>Pickup Instructions:</strong><br>
        • Order ID: <strong>#${orderId}</strong><br>
        • Location: <strong>${shopName}</strong><br>
        • Status: <strong style="color: #10b981;">Ready For Pickup</strong>
      </div>
      <p>Please present your Order ID at the counter to retrieve your items instantly, skipping any checkout lines. Thank you for using Kiranam.in!</p>
      <center>
        <a href="http://localhost:5173/orders" class="btn">Show Pickup QR / Code</a>
      </center>
    `
  });
};

const sendAccountVerificationEmail = async (userEmail, token) => {
  return sendMail({
    to: userEmail,
    subject: 'Verify Your Kiranam Account',
    title: 'Verify Your Email Address',
    textFallback: `Please verify your email address by using this code: ${token}`,
    htmlContent: `
      <p>Thank you for registering. Please complete your email verification process.</p>
      <div class="content-box" style="text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
        ${token}
      </div>
      <p>Input this OTP into your login verification box to activate full marketplace privileges.</p>
    `
  });
};

module.exports = {
  sendSignupEmail,
  sendOrderPlacedEmail,
  sendBillUploadedEmail,
  sendOrderConfirmedEmail,
  sendPickupReadyEmail,
  sendAccountVerificationEmail,
  sendMail
};
