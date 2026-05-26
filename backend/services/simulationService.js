const db = require('../config/db');
const socketService = require('./socketService');

let simulationInterval = null;
let isSimulationRunning = false; // Disabled — shops start unverified. Enable from Admin console once shops are live.
let simulationLog = [];


const addLog = (message) => {
  const logEntry = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString(),
    message
  };
  simulationLog.unshift(logEntry);
  if (simulationLog.length > 50) {
    simulationLog.pop();
  }
  console.log(`🤖 [MARKETPLACE SIMULATOR]: ${message}`);
};

// 1. Generate a single mock order at a random store
const generateMockOrder = async (targetShopId = null) => {
  try {
    // Fetch all active verified shops
    let shops;
    if (db.getIsMock()) {
      shops = db.getMockDb().shops.filter(s => s.verification_status === 'Verified' && s.availability_status !== 'Offline');
    } else {
      const res = await db.query("SELECT * FROM shops WHERE verification_status = 'Verified' AND availability_status != 'Offline'");
      shops = res.rows;
    }

    if (shops.length === 0) return;

    // Pick random shop (or use target)
    const shop = targetShopId 
      ? (shops.find(s => s.id === Number(targetShopId)) || shops[Math.floor(Math.random() * shops.length)])
      : shops[Math.floor(Math.random() * shops.length)];

    // Pick random demo customer (ids 1, 2, 3)
    let customers;
    if (db.getIsMock()) {
      customers = db.getMockDb().users.filter(u => u.role === 'customer');
    } else {
      const res = await db.query("SELECT * FROM users WHERE role = 'customer'");
      customers = res.rows;
    }

    if (customers.length === 0) return;
    const customer = customers[Math.floor(Math.random() * customers.length)];

    // Create mock order
    const notesOptions = [
      'Pack only standard items.', 'Please deliver as soon as possible.',
      'Add 1kg Tata salt if available.', 'Call if items are not in stock.',
      'Add a box of matchsticks.', 'Keep packet sizes small.'
    ];
    const pickupOptions = ['10 mins', '20 mins', 'Flexible', 'In 1 hour'];

    const notes = notesOptions[Math.floor(Math.random() * notesOptions.length)];
    const preferredPickup = pickupOptions[Math.floor(Math.random() * pickupOptions.length)];
    const mockChittiImage = '/uploads/mock_chitti.jpg'; // Dummy placeholder URL

    let order;
    const getCustomerPrefix = (name) => {
      if (!name) return 'Krn';
      const cleanName = name.trim().replace(/[^a-zA-Z]/g, '');
      if (cleanName.length === 0) return 'Krn';
      const prefix = cleanName.substring(0, 3);
      const titleCased = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      return titleCased.padEnd(3, 'x');
    };
    const prefix = getCustomerPrefix(customer.name);

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`; // DDMMYY

    if (db.getIsMock()) {
      const mockDbInstance = db.getMockDb();
      const count = mockDbInstance.orders.filter(o => {
        const oDate = new Date(o.created_at);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return oDate >= todayStart;
      }).length;
      const customOrderId = `${prefix}${dateStr}${String(count + 1).padStart(2, '0')}`;

      order = {
        id: mockDbInstance.orders.length + 1,
        customer_id: customer.id,
        shop_id: shop.id,
        original_chitti: mockChittiImage,
        modified_bill: null,
        amount: null,
        payment_method: null,
        payment_status: 'Pending',
        payment_proof_image: null,
        notes: notes,
        preferred_pickup_time: preferredPickup,
        order_status: 'Waiting For Seller',
        created_at: new Date(),
        updated_at: new Date(),
        customer_name: customer.name,
        customer_phone: customer.phone,
        custom_order_id: customOrderId
      };
      mockDbInstance.orders.push(order);

      // Increment shop queue count
      const dbShop = mockDbInstance.shops.find(s => s.id === shop.id);
      if (dbShop) {
        dbShop.active_orders += 1;
        dbShop.waiting_time = dbShop.active_orders * 5;
        if (dbShop.active_orders >= dbShop.max_active_orders) {
          dbShop.availability_status = 'Busy';
        }
        socketService.emitShopStatus(dbShop.id, dbShop.availability_status, dbShop.active_orders, dbShop.waiting_time);
      }
      db.markMockDbDirty();
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const countRes = await db.query('SELECT COUNT(*) FROM orders WHERE created_at >= $1', [todayStart]);
      const count = countRes.rows && countRes.rows.length > 0 ? parseInt(countRes.rows[0].count) : 0;
      const customOrderId = `${prefix}${dateStr}${String(count + 1).padStart(2, '0')}`;

      const res = await db.query(
        `INSERT INTO orders (customer_id, shop_id, original_chitti, notes, preferred_pickup_time, order_status, custom_order_id)
         VALUES ($1, $2, $3, $4, $5, 'Waiting For Seller', $6) RETURNING *`,
        [customer.id, shop.id, mockChittiImage, notes, preferredPickup, customOrderId]
      );
      order = res.rows[0];
      order.customer_name = customer.name;
      order.customer_phone = customer.phone;

      // Trigger queue recalculation
      const queueCountRes = await db.query("SELECT COUNT(*) FROM orders WHERE shop_id = $1 AND order_status IN ('Waiting For Seller', 'Accepted', 'Bill Uploaded', 'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed')", [shop.id]);
      const queueCount = parseInt(queueCountRes.rows[0].count);
      let newStatus = shop.availability_status;
      if (queueCount >= shop.max_active_orders && shop.availability_status === 'Available') {
        newStatus = 'Busy';
      }
      await db.query('UPDATE shops SET active_orders = $1, availability_status = $2 WHERE id = $3', [queueCount, newStatus, shop.id]);
      socketService.emitShopStatus(shop.id, newStatus, queueCount, queueCount * 5);
    }

    // Realtime alert
    socketService.alertNewOrder(shop.id, order);
    socketService.emitOrderStatus(order, customer.id, shop.id);
    
    // Notify seller via multi-channel notification engine
    const notificationEngine = require('./notificationEngine');
    notificationEngine.dispatchNotification(
      shop.owner_id,
      'New Order Received',
      `New order received from customer ${customer.name}! Order ID: ${order.custom_order_id || 'KRN' + order.id}`,
      'new_order',
      {
        orderId: order.id,
        customOrderId: order.custom_order_id,
        customerName: customer.name,
        shopName: shop.shop_name
      }
    ).catch(err => console.error('Simulated seller notify error:', err.message));

    // Send transactional emails to both customer and seller for simulated order
    notificationEngine.dispatchOrderTransactionEmails(order.id).catch(err => console.error('Simulated order placement email error:', err.message));

    addLog(`🛒 Simulated Order #${order.custom_order_id || order.id} placed by ${customer.name} at ${shop.shop_name}`);
  } catch (err) {
    console.error('Error generating mock order:', err);
  }
};

// 2. Advance active orders one step forward in their queue cycles
const progressQueues = async () => {
  try {
    let activeOrders = [];
    if (db.getIsMock()) {
      activeOrders = db.getMockDb().orders.filter(o => ![
        'Delivered', 'Cancelled'
      ].includes(o.order_status));
    } else {
      const res = await db.query(
        `SELECT o.*, u.name as customer_name, s.owner_id as seller_owner_id, s.shop_name 
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         JOIN shops s ON o.shop_id = s.id
         WHERE o.order_status NOT IN ('Delivered', 'Cancelled')`
      );
      activeOrders = res.rows;
    }

    if (activeOrders.length === 0) return;

    // Pick 1-3 random active orders to progress to keep updates realistic and gradual
    const batchSize = Math.min(3, activeOrders.length);
    const shuffled = activeOrders.sort(() => 0.5 - Math.random());
    const selectedOrders = shuffled.slice(0, batchSize);

    for (const order of selectedOrders) {
      let nextStatus = '';
      let updateFields = {};

      switch (order.order_status) {
        case 'Waiting For Seller':
          nextStatus = 'Packing Started';
          updateFields = {
            modified_bill: '/uploads/mock_bill.jpg',
            amount: parseFloat((150 + Math.random() * 850).toFixed(2)),
            notes: 'Calculated offline. Substituted soap brand.'
          };
          addLog(`📄 Seller uploaded invoice bill (₹${updateFields.amount}) and started packing for Order #${order.id}`);
          break;

        case 'Packing Started':
          nextStatus = 'Ready For Pickup';
          addLog(`📦 Packing completed. Order #${order.id} is Ready for Delivery!`);
          break;

        case 'Ready For Pickup':
          nextStatus = 'Delivered';
          updateFields = {
            payment_method: Math.random() > 0.5 ? 'Pay During Pickup' : 'Manual UPI Payment',
            payment_status: 'Paid'
          };
          addLog(`🏁 Customer paid bill and completed Order #${order.id} (Delivered)`);
          break;
      }

      if (nextStatus) {
        if (db.getIsMock()) {
          const dbInstance = db.getMockDb();
          const dbOrder = dbInstance.orders.find(o => o.id === order.id);
          if (dbOrder) {
            dbOrder.order_status = nextStatus;
            dbOrder.updated_at = new Date();
            Object.assign(dbOrder, updateFields);

            // Set simulated status timestamps
            if (nextStatus === 'Packing Started') dbOrder.packing_started_at = new Date();
            else if (nextStatus === 'Ready For Pickup') dbOrder.ready_for_pickup_at = new Date();
            else if (nextStatus === 'Delivered') dbOrder.delivered_at = new Date();

            // Handle completion queue decrement
            if (nextStatus === 'Delivered') {
              const dbShop = dbInstance.shops.find(s => s.id === order.shop_id);
              if (dbShop) {
                dbShop.active_orders = Math.max(0, dbShop.active_orders - 1);
                dbShop.waiting_time = dbShop.active_orders * 5;
                if (dbShop.active_orders < dbShop.max_active_orders && dbShop.availability_status === 'Busy') {
                  dbShop.availability_status = 'Available';
                }
                socketService.emitShopStatus(dbShop.id, dbShop.availability_status, dbShop.active_orders, dbShop.waiting_time);
              }
            }
            socketService.emitOrderStatus(dbOrder, order.customer_id, order.shop_id);
            db.markMockDbDirty();
          }
        } else {
          // SQL database update
          let setClause = 'order_status = $1, updated_at = CURRENT_TIMESTAMP';
          let paramsList = [nextStatus, order.id];
          
          if (nextStatus === 'Packing Started') {
            setClause += ', modified_bill = $3, amount = $4, notes = $5, packing_started_at = CURRENT_TIMESTAMP';
            paramsList.push(updateFields.modified_bill, updateFields.amount, updateFields.notes);
          } else if (nextStatus === 'Ready For Pickup') {
            setClause += ', ready_for_pickup_at = CURRENT_TIMESTAMP';
          } else if (nextStatus === 'Delivered') {
            setClause += ', payment_method = $3, payment_status = $4, delivered_at = CURRENT_TIMESTAMP';
            paramsList.push(updateFields.payment_method, updateFields.payment_status);
          }

          await db.query(`UPDATE orders SET ${setClause} WHERE id = $2`, paramsList);

          // Recalculate queue size
          const countRes = await db.query("SELECT COUNT(*) FROM orders WHERE shop_id = $1 AND order_status IN ('Waiting For Seller', 'Accepted', 'Bill Uploaded', 'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed')", [order.shop_id]);
          const count = parseInt(countRes.rows[0].count);
          
          // Get max capacity
          const shopRes = await db.query('SELECT max_active_orders, availability_status FROM shops WHERE id = $1', [order.shop_id]);
          const shop = shopRes.rows[0];
          let newStatus = shop.availability_status;
          if (nextStatus === 'Delivered' && count < shop.max_active_orders && shop.availability_status === 'Busy') {
            newStatus = 'Available';
          } else if (count >= shop.max_active_orders && shop.availability_status === 'Available') {
            newStatus = 'Busy';
          }

          await db.query('UPDATE shops SET active_orders = $1, availability_status = $2 WHERE id = $3', [count, newStatus, order.shop_id]);
          socketService.emitShopStatus(order.shop_id, newStatus, count, count * 5);
          
          const updatedOrderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order.id]);
          socketService.emitOrderStatus(updatedOrderRes.rows[0], order.customer_id, order.shop_id);
        }

        // Notify customer via multi-channel notification engine
        if (order.customer_id) {
          const notifyMsg = `Your order #${order.id} at ${order.shop_name || 'store'} is now: ${nextStatus}.`;
          const notifType = nextStatus === 'Ready For Pickup' ? 'pickup_ready' : 'order_status';
          const notificationEngine = require('./notificationEngine');
          
          notificationEngine.dispatchNotification(
            order.customer_id,
            `Order ${nextStatus}`,
            notifyMsg,
            notifType,
            {
              orderId: order.id,
              shopName: order.shop_name || 'Kirana Store',
              amount: order.amount
            }
          ).catch(err => console.error('Simulated customer notify error:', err.message));

          // Send transactional emails to both customer and seller for simulated progression
          notificationEngine.dispatchOrderTransactionEmails(order.id, order.order_status).catch(err => console.error('Simulated order progress email error:', err.message));
        }
      }
    }
  } catch (err) {
    console.error('Error progressing queues:', err);
  }
};

// 3. Shift shop availability status dynamically
const simulateShopAvailabilityShift = async () => {
  try {
    let shops = [];
    if (db.getIsMock()) {
      shops = db.getMockDb().shops.filter(s => s.verification_status === 'Verified');
    } else {
      const res = await db.query("SELECT * FROM shops WHERE verification_status = 'Verified'");
      shops = res.rows;
    }

    if (shops.length === 0) return;

    // Pick 1-2 random shops to toggle offline/online
    const shopToToggle = shops[Math.floor(Math.random() * shops.length)];
    if (shopToToggle.active_orders > 0) return; // Avoid taking offline active shops

    let nextStatus = 'Available';
    if (shopToToggle.availability_status === 'Available') {
      nextStatus = 'Offline';
    }

    if (db.getIsMock()) {
      const mockShop = db.getMockDb().shops.find(s => s.id === shopToToggle.id);
      if (mockShop) {
        mockShop.availability_status = nextStatus;
        socketService.emitShopStatus(mockShop.id, nextStatus, mockShop.active_orders, mockShop.waiting_time);
        db.markMockDbDirty();
      }
    } else {
      await db.query('UPDATE shops SET availability_status = $1 WHERE id = $2', [nextStatus, shopToToggle.id]);
      socketService.emitShopStatus(shopToToggle.id, nextStatus, shopToToggle.active_orders, shopToToggle.waiting_time);
    }

    addLog(`📢 Availability shift: "${shopToToggle.shop_name}" is now ${nextStatus.toUpperCase()}`);
  } catch (err) {
    console.error('Error shifting shop status:', err);
  }
};

// --- SIMULATION CONTROL FUNCTIONS ---

const startSimulation = () => {
  if (simulationInterval) return;
  isSimulationRunning = true;
  addLog('🚀 Bangalore simulation loop STARTED');

  // Trigger loop every 20 seconds
  simulationInterval = setInterval(() => {
    if (!isSimulationRunning) return;

    const actionRoll = Math.random();
    if (actionRoll < 0.4) {
      // 40% chance of new order placing
      generateMockOrder();
    } else if (actionRoll < 0.85) {
      // 45% chance of queue progression
      progressQueues();
    } else {
      // 15% chance of shop status toggle
      simulateShopAvailabilityShift();
    }
  }, 20000);
};

const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isSimulationRunning = false;
  addLog('🛑 Bangalore simulation loop STOPPED');
};

const simulatePeakTraffic = async () => {
  addLog('⚠️ Peak traffic trigger ACTIVATED! Simulating massive rushes...');
  // Instantly place 15-20 mock orders across various shops
  const rushSize = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < rushSize; i++) {
    setTimeout(() => {
      generateMockOrder();
    }, i * 300); // space them out slightly
  }
};

const clearAllQueues = async () => {
  addLog('🧹 Clearing active queues and resetting capacities...');
  try {
    if (db.getIsMock()) {
      const mockDbInstance = db.getMockDb();
      mockDbInstance.orders = [];
      mockDbInstance.shops.forEach(shop => {
        shop.active_orders = 0;
        shop.waiting_time = 0;
        if (shop.availability_status === 'Busy') {
          shop.availability_status = 'Available';
        }
        socketService.emitShopStatus(shop.id, shop.availability_status, 0, 0);
      });
      db.markMockDbDirty();
    } else {
      // Clear orders in PG
      await db.query("UPDATE orders SET order_status = 'Delivered' WHERE order_status NOT IN ('Delivered', 'Cancelled')");
      // Reset shops active count
      await db.query("UPDATE shops SET active_orders = 0, waiting_time = 0, availability_status = 'Available' WHERE availability_status = 'Busy'");
      
      const shopsRes = await db.query('SELECT id FROM shops');
      shopsRes.rows.forEach(shop => {
        socketService.emitShopStatus(shop.id, 'Available', 0, 0);
      });
    }
    addLog('✅ All active queues flushed. Shops reset to Available.');
  } catch (err) {
    console.error('Error clearing queues:', err);
  }
};

// Simulation is OFF by default — shops must be verified first
// Admin can start it from the console: startSimulation()
// startSimulation();


module.exports = {
  startSimulation,
  stopSimulation,
  simulatePeakTraffic,
  clearAllQueues,
  stepSimulation: () => {
    addLog('⚡ Manual simulation step triggered');
    progressQueues();
  },
  getLogs: () => simulationLog,
  getIsRunning: () => isSimulationRunning
};
