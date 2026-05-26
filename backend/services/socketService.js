const socketIo = require('socket.io');

let io = null;
const userSockets = new Map(); // Map of userId -> Set of socketIds

const init = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle user authentication/registration on Socket
    socket.on('register', (userId) => {
      if (userId) {
        const uid = Number(userId);
        socket.userId = uid;
        
        if (!userSockets.has(uid)) {
          userSockets.set(uid, new Set());
        }
        userSockets.get(uid).add(socket.id);
        
        // Join individual room
        socket.join(`user_${uid}`);
        console.log(`👤 User registered on socket: ${uid} (Room: user_${uid})`);
      }
    });

    // Handle shop room subscription (Sellers join their shop room)
    socket.on('join_shop', (shopId) => {
      if (shopId) {
        socket.join(`shop_${shopId}`);
        console.log(`🏪 Socket ${socket.id} joined shop room: shop_${shopId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      if (socket.userId && userSockets.has(socket.userId)) {
        const sockets = userSockets.get(socket.userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
  });

  return io;
};

// Send real-time notification to a specific user
const sendNotification = (userId, notification) => {
  if (!io) return;
  const uid = Number(userId);
  io.to(`user_${uid}`).emit('notification', notification);
  console.log(`🔔 Sent notification event to user_${uid}:`, notification.message);
};

// Alert shop owner of a new order
const alertNewOrder = (shopId, order) => {
  if (!io) return;
  io.to(`shop_${shopId}`).emit('new_order', order);
  console.log(`📦 Sent new order alert to shop_${shopId}`);
};

// Broadcast order status updates
const emitOrderStatus = (order, customerId, shopId) => {
  if (!io) return;
  // Send to customer
  io.to(`user_${customerId}`).emit('order_status_updated', order);
  // Send to shop
  io.to(`shop_${shopId}`).emit('order_status_updated', order);
  console.log(`🔄 Broadcast order status update: Order ${order.id} is now ${order.order_status}`);
};

// Broadcast queue and availability status updates to everyone (hyperlocal)
const emitShopStatus = (shopId, availabilityStatus, activeOrders, waitingTime) => {
  if (!io) return;
  io.emit('shop_status_updated', {
    shopId: Number(shopId),
    availabilityStatus,
    activeOrders: Number(activeOrders),
    waitingTime: Number(waitingTime)
  });
  console.log(`📢 Broadcast shop state: Shop ${shopId} is ${availabilityStatus} (Queue: ${activeOrders}, Wait: ${waitingTime}m)`);
};

// Check active socket count for user offline fallback detection
const getActiveSocketCount = (userId) => {
  const uid = Number(userId);
  if (userSockets.has(uid)) {
    return userSockets.get(uid).size;
  }
  return 0;
};

module.exports = {
  init,
  sendNotification,
  alertNewOrder,
  emitOrderStatus,
  emitShopStatus,
  getActiveSocketCount
};
