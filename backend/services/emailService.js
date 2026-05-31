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
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
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
            <div style="font-size: 13px; margin-top: 5px; opacity: 0.9;">Hyperlocal Kirana Marketplace</div>
          </div>
          <div class="body">
            <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
            ${content}
          </div>
          <div class="footer">
            <p>You received this transactional update because you registered on Kiranam.in.</p>
            <p>© 2026 Kiranam.in. All rights reserved.</p>
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
    const senderEmail = process.env.SMTP_USER || 'no-reply@kiranam.in';
    const mailOptions = {
      from: `"Kiranam.in Support" <${senderEmail}>`,
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
    textFallback: `Welcome to Kiranam.in. Your account has been created successfully. Browse verified stores and upload grocery chittis from the comfort of your home!`,
    htmlContent: `
      <p>Thank you for signing up on <strong>Kiranam.in</strong>, your premier hyperlocal queue-managed kirana marketplace.</p>
      <p>We are excited to help you skip the crowded lines at your local kirana shops!</p>
      <div class="content-box">
        <strong>Getting Started is Simple:</strong>
        <ul>
          <li>Find nearby verified kirana stores.</li>
          <li>Take a photo of your handwritten grocery list (Chitti) and upload it.</li>
          <li>The seller will upload a rewritten digital bill for your review.</li>
          <li>Pay online via UPI or choose Cash during pickup!</li>
          <li>Get notified when your order is packed and ready.</li>
        </ul>
      </div>
      <center>
        <a href="https://kiranam.in" class="btn">Explore Marketplace</a>
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

const sendPasswordResetEmail = async (userEmail, resetLink) => {
  return sendMail({
    to: userEmail,
    subject: 'Kiranam.in - Password Reset Request',
    title: 'Password Reset',
    textFallback: `We received a request to reset your password. Click the following link to set a new password: ${resetLink}\n\nIf you did not request this, please ignore this email.`,
    htmlContent: `
      <p>We received a request to reset the password for your Kiranam.in account.</p>
      <p>Click the button below to securely set a new password:</p>
      <center>
        <a href="${resetLink}" class="btn">Reset Password</a>
      </center>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    `
  });
};

const sendOrderTransactionEmails = async (order, customer, shop, seller, originalStatus) => {
  const orderId = order.custom_order_id || `KRN${order.id}`;
  const amountStr = order.amount ? `₹${order.amount}` : 'Pending calculation';
  const notesStr = order.notes || 'None';
  const pickupTimeStr = order.preferred_pickup_time || 'Not specified';
  const status = order.order_status;

  let customerSubject = '';
  let customerTitle = '';
  let customerHtml = '';
  let customerText = '';

  let sellerSubject = '';
  let sellerTitle = '';
  let sellerHtml = '';
  let sellerText = '';

  switch (status) {
    case 'Waiting For Seller':
      if (originalStatus !== 'Bill Uploaded' && originalStatus !== 'Waiting For Customer Confirmation') {
        sellerSubject = `New Order #${orderId} Received!`;
        sellerTitle = `New Order Received`;
        sellerText = `New order #${orderId} received from customer ${customer.name}.`;
        sellerHtml = `
          <p>Namaskaram <strong>${seller.name}</strong>,</p>
          <p>You have received a new order from <strong>${customer.name}</strong> at your store <strong>${shop.shop_name}</strong>.</p>
          <div class="content-box">
            <strong>Order Details:</strong><br>
            • Order ID: <strong>#${orderId}</strong><br>
            • Customer Name: <strong>${customer.name}</strong><br>
            • Preferred Pickup Time: <strong>${pickupTimeStr}</strong><br>
            • Notes: <em>${notesStr}</em><br>
            • Status: <strong>Waiting for Seller Review</strong>
          </div>
          <p>Please log in to your merchant dashboard to review the grocery list, update pricing, and upload the bill.</p>
          <center>
            <a href="https://kiranam.in/seller/dashboard" class="btn">Process Order</a>
          </center>
        `;
      }
      break;

    case 'Bill Uploaded':
      customerSubject = `Action Required: Bill Generated for Order #${orderId}`;
      customerTitle = `Bill Generated!`;
      customerText = `The seller at ${shop.shop_name} has generated the bill for Order #${orderId}. Total: ${amountStr}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p><strong>${shop.shop_name}</strong> has accepted your order <strong>#${orderId}</strong> and generated the bill.</p>
        <div class="content-box">
          <strong>Bill Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Total Amount: <strong style="color: ${THEME_COLOR}; font-size: 18px;">${amountStr}</strong><br>
          • Merchant Notes: <em>${notesStr}</em><br>
          • Status: <strong>Bill Uploaded - Awaiting Confirmation</strong>
        </div>
        <p>Please log in to your dashboard to review items, select your payment method, and confirm your order.</p>
        <center>
          <a href="https://kiranam.in/orders" class="btn">Confirm & Pay</a>
        </center>
      `;
      break;



    case 'Ready For Pickup':
      customerSubject = `Order #${orderId} is Ready for Pickup! 🎒`;
      customerTitle = `Groceries Ready for Pickup!`;
      customerText = `Your order #${orderId} at ${shop.shop_name} is packed and ready for pickup.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Your grocery bag is fully packed and waiting for you at <strong>${shop.shop_name}</strong>!</p>
        <div class="content-box" style="background-color: #ecfdf5; border-left: 4px solid #10b981;">
          <strong>Pickup Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Location: <strong>${shop.shop_name}</strong><br>
          • Total Amount: <strong>${amountStr}</strong><br>
          • Status: <strong style="color: #10b981;">Ready For Pickup</strong>
        </div>
        <p>Please present your Order ID at the counter to retrieve your items instantly, skipping any queue. Thank you for using Kiranam.in!</p>
        <center>
          <a href="https://kiranam.in/orders" class="btn">Show Pickup Details</a>
        </center>
      `;
      break;
  }

  const dispatches = [];

  if (customerSubject && customer.email) {
    console.log(`✉️ Dispatching Transaction Email to Customer: ${customer.email} (Status: ${status})`);
    dispatches.push(sendMail({
      to: customer.email,
      subject: customerSubject,
      title: customerTitle,
      htmlContent: customerHtml,
      textFallback: customerText
    }));
  }

  if (sellerSubject && seller.email) {
    console.log(`✉️ Dispatching Transaction Email to Seller: ${seller.email} (Status: ${status})`);
    dispatches.push(sendMail({
      to: seller.email,
      subject: sellerSubject,
      title: sellerTitle,
      htmlContent: sellerHtml,
      textFallback: sellerText
    }));
  }

  if (dispatches.length > 0) {
    await Promise.all(dispatches);
  }
};

module.exports = {
  sendSignupEmail,
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
  sendOrderTransactionEmails,
  sendMail
};
