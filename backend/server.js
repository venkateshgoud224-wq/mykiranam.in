const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');
const socketService = require('./services/socketService');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Uploaded Files Statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Analytics Hit Tracking Middleware
app.use(async (req, res, next) => {
  if (req.method !== 'OPTIONS' && req.originalUrl.startsWith('/api')) {
    try {
      if (!db.getIsMock()) {
        await db.query(`
          INSERT INTO platform_hits (hit_date, count) 
          VALUES (CURRENT_DATE, 1) 
          ON CONFLICT (hit_date) DO UPDATE SET count = platform_hits.count + 1
        `);
      }
    } catch (err) {
      console.error('Error tracking analytics hit:', err.message);
    }
  }
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const productRoutes = require('./routes/productRoutes');
const sellerProductRoutes = require('./routes/sellerProductRoutes');
const sellerProtectionRoutes = require('./routes/sellerProtectionRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/products', productRoutes);
app.use('/api/seller-products', sellerProductRoutes);
app.use('/api/seller-protection', sellerProtectionRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/support', supportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date(),
    databaseFallbackMode: db.getIsMock()
  });
});

// Fallback JSON 404 for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error Stack:', err.stack);
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again later.' });
});

// Setup Port
const PORT = process.env.PORT || 5000;

// Initialize Database & Run Server
const startServer = async () => {
  await db.initDb();
  socketService.init(server);
  
  // Pickup Reminder Background Worker (Phase 6A)
  setInterval(async () => {
    try {
      const now = new Date();
      if (db.getIsMock()) {
        const mockDb = db.getMockDb();

        // Auto-cancel stale orders in active states older than 24 hours
        const activeStates = [
          'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
          'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
        ];
        const staleLimitTime = new Date(now.getTime() - 24 * 60 * 60000);
        const staleOrders = mockDb.orders.filter(o => 
          activeStates.includes(o.order_status) && 
          new Date(o.updated_at || o.created_at) < staleLimitTime
        );

        for (let order of staleOrders) {
          order.order_status = 'Cancelled';
          order.notes = (order.notes ? order.notes + '\n' : '') + 'Auto-cancelled due to inactivity (over 24 hours).';
          order.updated_at = now;
          order.cancelled_at = now;
          db.markMockDbDirty();
          
          try {
            const orderController = require('./controllers/orderController');
            await orderController.updateShopQueueCount(order.shop_id);

            const notificationEngine = require('./services/notificationEngine');
            // Notify customer
            await notificationEngine.dispatchNotification(
              order.customer_id,
              'Order Auto-Cancelled',
              `Your order at ${order.shop_name || 'the shop'} has been auto-cancelled due to inactivity.`,
              'order_cancelled',
              { orderId: order.id }
            );
            // Notify seller
            const shop = mockDb.shops.find(s => s.id === order.shop_id);
            if (shop) {
              await notificationEngine.dispatchNotification(
                shop.owner_id,
                'Order Auto-Cancelled',
                `Order #${order.custom_order_id || order.id} was auto-cancelled due to inactivity (over 24 hours).`,
                'order_cancelled',
                { orderId: order.id }
              );
            }
            // Emit update via socket
            socketService.emitOrderStatus(order, order.customer_id, order.shop_id);
          } catch (err) {
            console.error('Error handling mock db auto-cancel:', err);
          }
        }

        const pendingOrders = mockDb.orders.filter(o => o.order_status === 'Ready For Pickup' && o.pickup_deadline);
        for (let order of pendingOrders) {
          const deadline = new Date(order.pickup_deadline);
          if (now > deadline) {
            order.order_status = 'Pickup Overdue';
            order.updated_at = new Date();
            db.markMockDbDirty();
            
            const notificationEngine = require('./services/notificationEngine');
            await notificationEngine.dispatchNotification(
              order.customer_id,
              'Pickup Overdue',
              `Your order at ${order.shop_name || 'the shop'} has expired and is now overdue. Please contact the seller.`,
              'pickup_overdue',
              { orderId: order.id }
            );
          } else {
             const hoursLeft = (deadline - now) / (1000 * 60 * 60);
             // Remind at 2 hours left
             if (hoursLeft > 1.9 && hoursLeft <= 2.1 && !order.reminded_2h) {
                order.reminded_2h = true;
                const notificationEngine = require('./services/notificationEngine');
                await notificationEngine.dispatchNotification(
                  order.customer_id,
                  'Pickup Reminder',
                  `Friendly reminder: Please pick up your order. Deadline is in approx 2 hours.`,
                  'pickup_reminder',
                  { orderId: order.id }
                );
             }
          }

          // New 3-Hour WhatsApp Reminder Logic
          const shop = mockDb.shops.find(s => s.id === order.shop_id);
          const isShopActive = shop && shop.availability_status !== 'Offline';
          if (isShopActive && order.ready_for_pickup_at) {
             const readyAt = new Date(order.ready_for_pickup_at);
             const lastReminderAt = order.last_pickup_reminder_at ? new Date(order.last_pickup_reminder_at) : readyAt;
             const hoursSinceLastReminder = (now - lastReminderAt) / (1000 * 60 * 60);

             if (hoursSinceLastReminder >= 3) {
               order.last_pickup_reminder_at = now;
               db.markMockDbDirty();
               
               const notificationEngine = require('./services/notificationEngine');
               await notificationEngine.dispatchNotification(
                 order.customer_id,
                 'Pickup Reminder',
                 `Your order at ${order.shop_name || 'the shop'} is ready for pickup! Please collect it before the shop closes.`,
                 'pickup_recurring_reminder',
                 { orderId: order.id, shopName: order.shop_name }
               );
             }
          }
        }
      } else {
        // Real DB Worker

        // Auto-cancel stale orders in active states older than 24 hours in Real DB
        const activeStates = [
          'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
          'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
        ];
        const staleOrdersResult = await db.query(
          `UPDATE orders 
           SET order_status = 'Cancelled', 
               notes = COALESCE(notes, '') || '\nAuto-cancelled due to inactivity (over 24 hours).', 
               updated_at = CURRENT_TIMESTAMP,
               cancelled_at = CURRENT_TIMESTAMP
           WHERE order_status = ANY($1::varchar[]) 
             AND COALESCE(updated_at, created_at) < CURRENT_TIMESTAMP - INTERVAL '24 hours'
           RETURNING *`,
          [activeStates]
        );

        if (staleOrdersResult.rows.length > 0) {
          try {
            const orderController = require('./controllers/orderController');
            const notificationEngine = require('./services/notificationEngine');
            
            for (let order of staleOrdersResult.rows) {
              await orderController.updateShopQueueCount(order.shop_id);
              
              // Notify customer
              await notificationEngine.dispatchNotification(
                order.customer_id,
                'Order Auto-Cancelled',
                `Your order has been auto-cancelled due to inactivity.`,
                'order_cancelled',
                { orderId: order.id }
              );
              
              // Notify seller
              const shopRes = await db.query('SELECT owner_id FROM shops WHERE id = $1', [order.shop_id]);
              if (shopRes.rows.length > 0) {
                await notificationEngine.dispatchNotification(
                  shopRes.rows[0].owner_id,
                  'Order Auto-Cancelled',
                  `Order #${order.custom_order_id || order.id} was auto-cancelled due to inactivity (over 24 hours).`,
                  'order_cancelled',
                  { orderId: order.id }
                );
              }
              
              // Emit update via socket
              socketService.emitOrderStatus(order, order.customer_id, order.shop_id);
            }
          } catch (err) {
            console.error('Error handling real db auto-cancel:', err);
          }
        }

        const overdueResult = await db.query(
          `UPDATE orders SET order_status = 'Pickup Overdue', updated_at = CURRENT_TIMESTAMP 
           WHERE order_status = 'Ready For Pickup' AND pickup_deadline < CURRENT_TIMESTAMP RETURNING *`
        );
        if (overdueResult.rows.length > 0) {
          const notificationEngine = require('./services/notificationEngine');
          for (let order of overdueResult.rows) {
            await notificationEngine.dispatchNotification(
              order.customer_id,
              'Pickup Overdue',
              `Your order has expired and is now overdue. Please contact the seller.`,
              'pickup_overdue',
              { orderId: order.id }
            );
          }
        }

        // 3-hour reminder logic for real DB
        const reminderResult = await db.query(`
          UPDATE orders o
          SET last_pickup_reminder_at = CURRENT_TIMESTAMP
          FROM shops s
          WHERE o.shop_id = s.id
            AND o.order_status = 'Ready For Pickup'
            AND s.availability_status != 'Offline'
            AND o.ready_for_pickup_at IS NOT NULL
            AND (
              (o.last_pickup_reminder_at IS NULL AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.ready_for_pickup_at))/3600 >= 3)
              OR 
              (o.last_pickup_reminder_at IS NOT NULL AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.last_pickup_reminder_at))/3600 >= 3)
            )
          RETURNING o.id, o.customer_id, s.shop_name
        `);

        if (reminderResult.rows.length > 0) {
          const notificationEngine = require('./services/notificationEngine');
          for (let order of reminderResult.rows) {
             await notificationEngine.dispatchNotification(
               order.customer_id,
               'Pickup Reminder',
               `Your order at ${order.shop_name || 'the shop'} is ready for pickup! Please collect it before the shop closes.`,
               'pickup_recurring_reminder',
               { orderId: order.id, shopName: order.shop_name }
             );
          }
        }
      }
    } catch(err) {
      console.error('Pickup Reminder worker error:', err.message);
    }
  }, 60000); // Check every minute


  server.listen(PORT, () => {
    console.log(`🚀 Kiranam Backend Server is running on port ${PORT}`);
    console.log(`📡 WebSocket server initialized and broadcasting`);
  });
};

startServer();
