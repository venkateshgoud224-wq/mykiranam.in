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
        <a href="http://localhost:5173" class="btn">Explore Marketplace</a>
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

const sendOrderTransactionEmails = async (order, customer, shop, seller) => {
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
      customerSubject = `Order #${orderId} Placed Successfully!`;
      customerTitle = `Order Received!`;
      customerText = `Your order #${orderId} has been successfully placed at ${shop.shop_name}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Your order has been successfully placed at <strong>${shop.shop_name}</strong>.</p>
        <div class="content-box">
          <strong>Order Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Preferred Pickup Time: <strong>${pickupTimeStr}</strong><br>
          • Notes: <em>${notesStr}</em><br>
          • Status: <strong>Waiting for Seller Review</strong>
        </div>
        <p>The merchant is now reviewing your grocery list and preparing a digital bill. We will email you the second it is ready.</p>
        <center>
          <a href="http://localhost:5173/orders" class="btn">Track Your Order</a>
        </center>
      `;

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
        <p>Please log in to your merchant dashboard to review the chitti/grocery list, update pricing, and upload the final bill to progress the order.</p>
        <center>
          <a href="http://localhost:5173/seller/dashboard" class="btn">Process Order</a>
        </center>
      `;
      break;

    case 'Accepted':
      customerSubject = `Order #${orderId} Accepted!`;
      customerTitle = `Order Accepted!`;
      customerText = `Your order #${orderId} has been accepted by ${shop.shop_name}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Great news! <strong>${shop.shop_name}</strong> has accepted your order <strong>#${orderId}</strong>.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Status: <strong>Accepted & Preparing Bill</strong>
        </div>
        <p>The merchant is currently calculating item weights and pricing. We will notify you once the bill is ready for your confirmation.</p>
      `;

      sellerSubject = `Order #${orderId} Accepted Confirmation`;
      sellerTitle = `Order Accepted`;
      sellerText = `You accepted Order #${orderId} from ${customer.name}.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>You have successfully accepted order <strong>#${orderId}</strong> from <strong>${customer.name}</strong>.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Status: <strong>Accepted</strong>
        </div>
        <p>Please ensure you upload the final digital or physical bill with correct pricing to start packing.</p>
      `;
      break;

    case 'Bill Uploaded':
      customerSubject = `Action Required: Bill Uploaded for Order #${orderId}`;
      customerTitle = `New Bill Uploaded!`;
      customerText = `The seller at ${shop.shop_name} has uploaded the bill for Order #${orderId}. Total: ${amountStr}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p><strong>${shop.shop_name}</strong> has uploaded the digital bill/invoice for order <strong>#${orderId}</strong>.</p>
        <div class="content-box">
          <strong>Bill Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Total Amount: <strong style="color: ${THEME_COLOR}; font-size: 18px;">${amountStr}</strong><br>
          • Merchant Notes: <em>${notesStr}</em><br>
          • Status: <strong>Bill Uploaded - Awaiting Confirmation</strong>
        </div>
        <p>Please log in to your dashboard to review item substitutions, confirm your order, and choose your payment method.</p>
        <center>
          <a href="http://localhost:5173/orders" class="btn">Confirm & Pay</a>
        </center>
      `;

      sellerSubject = `Bill Uploaded for Order #${orderId}`;
      sellerTitle = `Bill Uploaded Successfully`;
      sellerText = `You uploaded the bill for Order #${orderId}. Total: ${amountStr}.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>You have successfully uploaded the bill for order <strong>#${orderId}</strong> of customer <strong>${customer.name}</strong>.</p>
        <div class="content-box">
          <strong>Bill Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Total Amount: <strong>${amountStr}</strong><br>
          • Your Notes: <em>${notesStr}</em><br>
          • Status: <strong>Waiting for Customer Confirmation</strong>
        </div>
        <p>We have notified the customer to review the bill and select a payment mode. You will receive an update as soon as they confirm.</p>
      `;
      break;

    case 'Confirmed':
      customerSubject = `Order #${orderId} Confirmed!`;
      customerTitle = `Order Confirmed!`;
      customerText = `Your order #${orderId} at ${shop.shop_name} is confirmed.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Your order <strong>#${orderId}</strong> at <strong>${shop.shop_name}</strong> has been successfully confirmed.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Total Amount: <strong>${amountStr}</strong><br>
          • Payment Method: <strong>${order.payment_method || 'Selected'}</strong><br>
          • Payment Status: <strong>${order.payment_status || 'Pending'}</strong><br>
          • Status: <strong>Confirmed & Packing</strong>
        </div>
        <p>The seller is now packing your groceries. We will alert you the moment your bag is ready for pickup.</p>
      `;

      sellerSubject = `Order #${orderId} Confirmed & Paid`;
      sellerTitle = `Order Confirmed by Customer`;
      sellerText = `Customer ${customer.name} confirmed Order #${orderId}.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>Customer <strong>${customer.name}</strong> has confirmed order <strong>#${orderId}</strong>.</p>
        <div class="content-box">
          <strong>Confirmation Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Total Amount: <strong>${amountStr}</strong><br>
          • Payment Method: <strong>${order.payment_method || 'Selected'}</strong><br>
          • Payment Status: <strong>${order.payment_status || 'Pending'}</strong><br>
          • Status: <strong>Confirmed - Ready for Packing</strong>
        </div>
        <p>Please proceed to pack the groceries and mark the order as "Ready for Pickup" when completed.</p>
        <center>
          <a href="http://localhost:5173/seller/dashboard" class="btn">View Order Dashboard</a>
        </center>
      `;
      break;

    case 'Packing Started':
      customerSubject = `Packing Started for Order #${orderId}`;
      customerTitle = `Packing Started!`;
      customerText = `${shop.shop_name} has started packing your order #${orderId}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Excellent! <strong>${shop.shop_name}</strong> has started packing your groceries for order <strong>#${orderId}</strong>.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Status: <strong>Packing in Progress</strong>
        </div>
        <p>We will send you another email alert once the items are bagged and ready to be collected.</p>
      `;

      sellerSubject = `Packing Started for Order #${orderId}`;
      sellerTitle = `Packing Started`;
      sellerText = `You started packing Order #${orderId} for ${customer.name}.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>You have marked order <strong>#${orderId}</strong> from <strong>${customer.name}</strong> as **Packing Started**.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Status: <strong>Packing Started</strong>
        </div>
        <p>Please bag all items neatly and mark the order as **Packing Completed** or **Ready for Pickup** once ready.</p>
      `;
      break;

    case 'Packing Completed':
      customerSubject = `Packing Completed for Order #${orderId}`;
      customerTitle = `Groceries Packed!`;
      customerText = `Packing is complete for order #${orderId} at ${shop.shop_name}.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Your groceries for order <strong>#${orderId}</strong> at <strong>${shop.shop_name}</strong> have been fully packed.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Status: <strong>Packing Completed - Waiting for Pickup Ready State</strong>
        </div>
        <p>Please wait for the merchant to mark it as ready for pickup before heading to the store.</p>
      `;

      sellerSubject = `Packing Completed for Order #${orderId}`;
      sellerTitle = `Packing Completed`;
      sellerText = `You completed packing for Order #${orderId}.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>You have successfully completed packing order <strong>#${orderId}</strong> for <strong>${customer.name}</strong>.</p>
        <div class="content-box">
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Status: <strong>Packing Completed</strong>
        </div>
        <p>Make sure the bag is placed on your active pickup shelves and mark it as **Ready For Pickup** so the customer can collect it.</p>
      `;
      break;

    case 'Ready For Pickup':
      customerSubject = `Order #${orderId} is Ready for Pickup! 🎒`;
      customerTitle = `Bag Ready for Pickup!`;
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
          <a href="http://localhost:5173/orders" class="btn">Show Pickup Details</a>
        </center>
      `;

      sellerSubject = `Order #${orderId} Marked Ready for Pickup`;
      sellerTitle = `Ready for Pickup Activated`;
      sellerText = `Order #${orderId} is marked ready for pickup.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>Order <strong>#${orderId}</strong> for customer <strong>${customer.name}</strong> has been marked as **Ready For Pickup**.</p>
        <div class="content-box" style="background-color: #ecfdf5; border-left: 4px solid #10b981;">
          <strong>Order Summary:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Total Amount: <strong>${amountStr}</strong><br>
          • Status: <strong style="color: #10b981;">Ready For Pickup</strong>
        </div>
        <p>Please keep the bag handy on your quick-collection counter so the customer can collect it instantly by showing their Order ID.</p>
      `;
      break;

    case 'Delivered':
      customerSubject = `Order #${orderId} Delivered! Thank you!`;
      customerTitle = `Order Delivered!`;
      customerText = `Your order #${orderId} has been successfully delivered. Thank you!`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Thank you for shopping at <strong>${shop.shop_name}</strong> through Kiranam.in! Your order <strong>#${orderId}</strong> has been successfully collected and marked as delivered.</p>
        <div class="content-box" style="background-color: #f8fafc; border-left: 4px solid #64748b;">
          <strong>Receipt Summary:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Paid Amount: <strong style="font-size: 16px;">${amountStr}</strong><br>
          • Payment Status: <strong>Paid</strong><br>
          • Date: <strong>${new Date().toLocaleDateString()}</strong>
        </div>
        <p>Skipping physical lines helps keep the community fast, structured, and efficient. We look forward to serving you again!</p>
        <center>
          <a href="http://localhost:5173" class="btn">Shop Again</a>
        </center>
      `;

      sellerSubject = `Order #${orderId} Delivered & Closed`;
      sellerTitle = `Order Delivered Successfully`;
      sellerText = `Order #${orderId} has been marked as delivered.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>Congratulations! Order <strong>#${orderId}</strong> for customer <strong>${customer.name}</strong> has been marked as **Delivered**.</p>
        <div class="content-box" style="background-color: #f8fafc; border-left: 4px solid #64748b;">
          <strong>Transaction Details:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Total Earnings: <strong style="font-size: 16px;">${amountStr}</strong><br>
          • Status: <strong>Completed</strong>
        </div>
        <p>This completion has been factored into your seller performance metrics. Keep up the prompt queue-management service!</p>
      `;
      break;

    case 'Cancelled':
      customerSubject = `Order #${orderId} Cancelled`;
      customerTitle = `Order Cancelled`;
      customerText = `Your order #${orderId} has been cancelled.`;
      customerHtml = `
        <p>Namaskaram <strong>${customer.name}</strong>,</p>
        <p>Please note that your order <strong>#${orderId}</strong> at <strong>${shop.shop_name}</strong> has been cancelled.</p>
        <div class="content-box" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
          <strong>Cancellation Info:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Store Name: <strong>${shop.shop_name}</strong><br>
          • Reason/Notes: <em>${notesStr}</em><br>
          • Status: <strong style="color: #ef4444;">Cancelled</strong>
        </div>
        <p>If you have any questions or feel this was a mistake, please reach out to the store or place a new order.</p>
      `;

      sellerSubject = `Order #${orderId} Cancelled`;
      sellerTitle = `Order Cancelled`;
      sellerText = `Order #${orderId} has been cancelled.`;
      sellerHtml = `
        <p>Namaskaram <strong>${seller.name}</strong>,</p>
        <p>Please note that order <strong>#${orderId}</strong> for customer <strong>${customer.name}</strong> has been cancelled.</p>
        <div class="content-box" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
          <strong>Cancellation Info:</strong><br>
          • Order ID: <strong>#${orderId}</strong><br>
          • Customer Name: <strong>${customer.name}</strong><br>
          • Reason/Notes: <em>${notesStr}</em><br>
          • Status: <strong style="color: #ef4444;">Cancelled</strong>
        </div>
        <p>This transaction has been closed and removed from your active packing queue.</p>
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
  sendOrderPlacedEmail,
  sendBillUploadedEmail,
  sendOrderConfirmedEmail,
  sendPickupReadyEmail,
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
  sendOrderTransactionEmails,
  sendMail
};
