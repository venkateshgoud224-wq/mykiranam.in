const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

// Routes
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

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
  
  // Simulation service removed

  server.listen(PORT, () => {
    console.log(`🚀 Kiranam Backend Server is running on port ${PORT}`);
    console.log(`📡 WebSocket server initialized and broadcasting`);
  });
};

startServer();
