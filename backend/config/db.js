const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool;
let isMock = false;

// ============================================================
// SEED DATA — Clean 1:1 mapping: Owner = Shop = Email
// Password for ALL accounts: "password"
// ============================================================
const HASHED_PASSWORD = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

const mockUsers = [
  // --- ADMIN (ID 1) ---
  { id: 1, role: 'admin',  name: 'Kiranam Admin',    email: 'admin@kiranam.in',     password: HASHED_PASSWORD, phone: '9000000000', profile_image: null, whatsapp_number: null, verified_whatsapp: false, pref_browser_notif: true, pref_sounds: true, pref_whatsapp: true, pref_email: true },
  { id: 2, role: 'admin',  name: 'Venkatesh Goud',   email: 'venkateshgoud224@gmail.com', password: HASHED_PASSWORD, phone: '9000000005', profile_image: null, whatsapp_number: null, verified_whatsapp: false, pref_browser_notif: true, pref_sounds: true, pref_whatsapp: true, pref_email: true }
];

// ============================================================
// SHOPS
// ============================================================
const mockShops = [];


// In-memory data store for fallback mode
const mockDb = {
  users: mockUsers,
  shops: mockShops,
  orders: [],  // Empty — shops are unverified. Sellers must verify first, then customers place fresh orders.
  notifications: [],
  customer_trust: {},
  seller_performance: {}
};

// Persistent fallback database on disk to survive server/nodemon restarts
const MOCK_DB_FILE = path.join(__dirname, '../uploads/mockDb.json');
let isMockDbDirty = false;

const saveMockDb = () => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(mockDb, null, 2), 'utf8');
    isMockDbDirty = false;
  } catch (err) {
    console.error('❌ Error saving mock database:', err.message);
  }
};

const loadMockDb = () => {
  try {
    if (fs.existsSync(MOCK_DB_FILE)) {
      const data = fs.readFileSync(MOCK_DB_FILE, 'utf8');
      const loaded = JSON.parse(data);
      // Merge keys to preserve references and structure
      Object.assign(mockDb, loaded);
      console.log('📁 Loaded persistent mock database from uploads/mockDb.json');
    } else {
      saveMockDb();
    }

    // Ensure venkateshgoud224@gmail.com is an admin in the mock database
    let adminUser = mockDb.users.find(u => u.email && typeof u.email === 'string' && u.email.toLowerCase() === 'venkateshgoud224@gmail.com');
    if (!adminUser) {
      adminUser = {
        id: mockDb.users.length + 1,
        role: 'admin',
        name: 'Venkatesh Goud',
        email: 'venkateshgoud224@gmail.com',
        password: HASHED_PASSWORD,
        phone: '9000000005',
        profile_image: null,
        whatsapp_number: null,
        verified_whatsapp: false,
        pref_browser_notif: true,
        pref_sounds: true,
        pref_whatsapp: true,
        pref_email: true,
        created_at: new Date()
      };
      mockDb.users.push(adminUser);
      isMockDbDirty = true;
    } else if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      isMockDbDirty = true;
    }
  } catch (err) {
    console.error('⚠️ Error loading mock database, using defaults:', err.message);
  }
};

// Start persistence
loadMockDb();

// Periodic autosave every 2 seconds if changed
setInterval(() => {
  if (isMockDbDirty) {
    saveMockDb();
  }
}, 2000);

// Initialize connection
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('⚠️ No DATABASE_URL specified in env. Using In-Memory fallback database.');
  isMock = true;
}

// Custom query helper that wraps PostgreSQL pool or redirects to mock handlers
const query = async (text, params) => {
  if (isMock) {
    return mockQuery(text, params);
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('❌ Database Query Error:', err.message);
    throw err;
  }
};

// Simulated SQL interpreter for fallback mode
const mockQuery = async (text, params = []) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // SELECT queries
  if (normalizedText.startsWith('select')) {
    if (normalizedText.includes('select count(*) as count from orders')) {
      const shopId = params[0];
      const count = mockDb.orders.filter(o => Number(o.shop_id) === Number(shopId) && o.order_status === 'Delivered').length;
      return { rows: [{ count: count }] };
    }

    if (normalizedText.includes('coalesce(sum(amount), 0) as spend')) {
      const customerId = params[0];
      let orders = mockDb.orders.filter(o => Number(o.customer_id) === Number(customerId) && o.order_status === 'Delivered');

      if (normalizedText.includes("date_trunc('month'")) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        orders = orders.filter(o => new Date(o.created_at) >= startOfMonth);
      } else if (normalizedText.includes("interval '3 months'")) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        orders = orders.filter(o => new Date(o.created_at) >= threeMonthsAgo);
      }

      const total = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      return { rows: [{ spend: total }] };
    }

    if (normalizedText.includes('coalesce(sum(amount), 0) as revenue')) {
      const shopId = params[0];
      let orders = mockDb.orders.filter(o => Number(o.shop_id) === Number(shopId) && o.order_status === 'Delivered');

      if (normalizedText.includes('current_date') && !normalizedText.includes('interval')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        orders = orders.filter(o => new Date(o.created_at) >= today);
      } else if (normalizedText.includes("interval '7 days'")) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 7);
        orders = orders.filter(o => new Date(o.created_at) >= dateLimit);
      } else if (normalizedText.includes("interval '14 days'")) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 14);
        orders = orders.filter(o => new Date(o.created_at) >= dateLimit);
      } else if (normalizedText.includes("interval '30 days'")) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        orders = orders.filter(o => new Date(o.created_at) >= dateLimit);
      } else if (normalizedText.includes("interval '6 months'")) {
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - 6);
        orders = orders.filter(o => new Date(o.created_at) >= dateLimit);
      } else if (normalizedText.includes("interval '1 year'")) {
        const dateLimit = new Date();
        dateLimit.setFullYear(dateLimit.getFullYear() - 1);
        orders = orders.filter(o => new Date(o.created_at) >= dateLimit);
      }

      const total = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      return { rows: [{ revenue: total }] };
    }

    if (normalizedText.includes('select count(*) from orders')) {
      if (normalizedText.includes('created_at >=')) {
        const sinceDate = new Date(params[0]);
        const count = mockDb.orders.filter(o => new Date(o.created_at) >= sinceDate).length;
        return { rows: [{ count: count }] };
      }
      if (normalizedText.includes('shop_id =')) {
        const shopId = params[0];
        const activeStates = [
          'Waiting For Seller', 'Accepted', 'Bill Uploaded', 
          'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed'
        ];
        const count = mockDb.orders.filter(o => 
          Number(o.shop_id) === Number(shopId) && 
          activeStates.includes(o.order_status)
        ).length;
        return { rows: [{ count: count }] };
      }
      return { rows: [{ count: 0 }] };
    }

    if (normalizedText.includes('from users')) {
      if (normalizedText.includes('where email =')) {
        const email = params[0];
        const user = mockDb.users.find(u => u.email === email);
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('where phone =')) {
        const phone = params[0];
        const user = mockDb.users.find(u => u.phone === phone);
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('where id =')) {
        const id = params[0];
        const user = mockDb.users.find(u => Number(u.id) === Number(id));
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('where reset_token =')) {
        const token = params[0];
        const user = mockDb.users.find(u => u.reset_token === token);
        return { rows: user ? [user] : [] };
      }
      return { rows: mockDb.users };
    }

    if (normalizedText.includes('from shops')) {
      let shops = mockDb.shops.map(shop => {
        const owner = mockDb.users.find(u => Number(u.id) === Number(shop.owner_id)) || {};
        return {
          ...shop,
          owner_name: owner.name || 'Merchant Owner',
          owner_email: owner.email || '',
          owner_phone: owner.phone || ''
        };
      });

      if (normalizedText.includes("where verification_status = 'verified'") || normalizedText.includes("where s.verification_status = 'verified'")) {
        // Customer market listing
        return { rows: shops.filter(s => s.verification_status === 'Verified') };
      }
      if (normalizedText.includes('where owner_id =')) {
        const ownerId = params[0];
        const shopsList = shops.filter(s => Number(s.owner_id) === Number(ownerId));
        return { rows: shopsList };
      }
      if (normalizedText.includes('where id =')) {
        const id = params[0];
        const shop = shops.find(s => Number(s.id) === Number(id));
        return { rows: shop ? [shop] : [] };
      }
      return { rows: shops };
    }

    if (normalizedText.includes('from orders')) {
      let filteredOrders = [...mockDb.orders];
      if (normalizedText.includes('where o.id =') || normalizedText.includes('where id =')) {
        const orderId = params[0];
        filteredOrders = filteredOrders.filter(o => Number(o.id) === Number(orderId));
      } else if (normalizedText.includes('where o.customer_id =') || normalizedText.includes('where customer_id =')) {
        const customerId = params[0];
        filteredOrders = filteredOrders.filter(o => Number(o.customer_id) === Number(customerId));
      } else if (normalizedText.includes('where o.shop_id =') || normalizedText.includes('where shop_id =')) {
        const shopId = params[0];
        filteredOrders = filteredOrders.filter(o => Number(o.shop_id) === Number(shopId));
      }

      // Enrich orders with joined shop and user info
      const enrichedOrders = filteredOrders.map(o => {
        const shop = mockDb.shops.find(s => Number(s.id) === Number(o.shop_id)) || {};
        const customer = mockDb.users.find(u => Number(u.id) === Number(o.customer_id)) || {};
        return {
          ...o,
          shop_name: shop.shop_name || 'Sai Srinivasa Kirana Store',
          upi_id: shop.upi_id || '',
          qr_code_image: shop.qr_code_image || null,
          seller_user_id: shop.owner_id || null,
          customer_name: customer.name || 'Demo Customer',
          customer_phone: customer.phone || ''
        };
      });

      enrichedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: enrichedOrders };
    }

    if (normalizedText.includes('from notifications')) {
      const userId = params[0];
      const userNotifications = mockDb.notifications.filter(n => n.user_id === Number(userId));
      userNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: userNotifications };
    }

    if (normalizedText.includes('from customer_trust')) {
      const customerId = params[0];
      let trust = mockDb.customer_trust[customerId] || { customer_id: customerId, successful_pickups: 3, cancellations: 0, no_show_count: 0 };
      return { rows: [trust] };
    }
  }

  // INSERT queries
  if (normalizedText.startsWith('insert')) {
    isMockDbDirty = true;
  }
  if (normalizedText.startsWith('insert into users')) {
    const newUser = {
      id: mockDb.users.length + 1,
      role: params[0] || 'pending',
      name: params[1],
      email: params[2],
      password: params[3],
      phone: params[4] || null,
      profile_image: null,
      whatsapp_number: null,
      verified_whatsapp: false,
      pref_browser_notif: true,
      pref_sounds: true,
      pref_whatsapp: true,
      pref_email: true,
      created_at: new Date()
    };
    mockDb.users.push(newUser);
    return { rows: [newUser] };
  }

  if (normalizedText.startsWith('insert into shops')) {
    const newShop = {
      id: mockDb.shops.length + 1,
      owner_id: params[0],
      shop_name: params[1],
      address: params[2],
      latitude: Number(params[3]),
      longitude: Number(params[4]),
      rating: 4.0,
      active_orders: 0,
      waiting_time: 0,
      availability_status: 'Available',
      discounts: params[5] || 'No discounts',
      verified: false,
      verification_status: 'Pending',
      verified_by_admin: false,
      verified_by_seller: false,
      verification_date: null,
      working_hours: '08:00 - 22:00',
      shop_category: 'General Provisions',
      image_front: null, image_counter: null, image_inside1: null, image_inside2: null, image_additional: null, image_banner: null,
      max_active_orders: 10,
      online_start_time: '08:00',
      online_end_time: '22:00',
      upi_id: params[6] || null,
      qr_code_image: null,
      created_at: new Date()
    };
    mockDb.shops.push(newShop);
    return { rows: [newShop] };
  }

  if (normalizedText.startsWith('insert into orders')) {
    const newOrder = {
      id: mockDb.orders.length + 1,
      customer_id: Number(params[0]),
      shop_id: Number(params[1]),
      original_chitti: params[2],
      modified_bill: null,
      amount: null,
      payment_method: null,
      payment_status: 'Pending',
      payment_proof_image: null,
      notes: params[3] || '',
      preferred_pickup_time: params[4] || null,
      order_status: 'Waiting For Seller',
      created_at: new Date(),
      updated_at: new Date(),
      custom_order_id: params[5] || null,
      accepted_at: null,
      packing_started_at: null,
      ready_for_pickup_at: null,
      confirmed_at: null,
      delivered_at: null,
      cancelled_at: null,
      order_type: params[6] || 'handwritten',
      digital_item_list: params[7] || null,
      modified_item_list: params[8] || null,
      item_change_history: params[9] || null
    };
    mockDb.orders.push(newOrder);

    // Increment active orders
    const shop = mockDb.shops.find(s => s.id === newOrder.shop_id);
    if (shop) {
      shop.active_orders += 1;
      shop.waiting_time = shop.active_orders * 5;
      if (shop.active_orders >= shop.max_active_orders) {
        shop.availability_status = 'Busy';
      }
    }
    return { rows: [newOrder] };
  }

  if (normalizedText.startsWith('insert into notifications')) {
    // INSERT INTO notifications (user_id, title, message, type, channel, read_status, sent_status) VALUES ($1, $2, $3, $4, $5, $6, $7)
    // Or simpler insert: INSERT INTO notifications (user_id, title, message, type)
    const newNotif = {
      id: mockDb.notifications.length + 1,
      user_id: Number(params[0]),
      title: params[1] || 'Notification',
      message: params[2] || '',
      type: params[3] || 'general',
      channel: params[4] || 'Web',
      read_status: params[5] === true || params[5] === 'true' || false,
      sent_status: params[6] || 'Sent',
      created_at: new Date()
    };
    mockDb.notifications.push(newNotif);
    return { rows: [newNotif] };
  }

  // UPDATE queries
  if (normalizedText.startsWith('update')) {
    isMockDbDirty = true;
    if (normalizedText.includes('update users')) {
      if (normalizedText.includes('set reset_token =') || normalizedText.includes('reset_token =')) {
        const resetToken = params[0];
        const resetTokenExpiry = params[1];
        const identifier = params[2];
        const user = mockDb.users.find(u => 
          Number(u.id) === Number(identifier) || 
          (typeof identifier === 'string' && u.email === identifier)
        );
        if (user) {
          user.reset_token = resetToken;
          user.reset_token_expiry = resetTokenExpiry;
        }
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('set password =') && normalizedText.includes('reset_token =')) {
        const password = params[0];
        const userId = params[1];
        const user = mockDb.users.find(u => Number(u.id) === Number(userId));
        if (user) {
          user.password = password;
          user.reset_token = null;
          user.reset_token_expiry = null;
        }
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('set role =')) {
        const role = params[0];
        const userId = params[1];
        const user = mockDb.users.find(u => u.id === Number(userId));
        if (user) user.role = role;
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('set whatsapp_number =') && normalizedText.includes('verified_whatsapp =')) {
        const whatsappNumber = params[0];
        const verifiedWhatsapp = params[1];
        const hasPrefWhatsappParam = params.length >= 4;
        const prefWhatsapp = hasPrefWhatsappParam ? params[2] : true;
        const userId = hasPrefWhatsappParam ? params[3] : params[2];

        const user = mockDb.users.find(u => u.id === Number(userId));
        if (user) {
          user.whatsapp_number = whatsappNumber;
          user.verified_whatsapp = (verifiedWhatsapp === true || verifiedWhatsapp === 'true' || verifiedWhatsapp === 't');
          user.pref_whatsapp = (prefWhatsapp === true || prefWhatsapp === 'true' || prefWhatsapp === 't');
        }
        return { rows: user ? [user] : [] };
      }
      if (normalizedText.includes('set pref_browser_notif =') || normalizedText.includes('pref_browser_notif =')) {
        const pref_browser_notif = params[0];
        const pref_sounds = params[1];
        const pref_whatsapp = params[2];
        const pref_email = params[3];
        const userId = params[4];
        const user = mockDb.users.find(u => u.id === Number(userId));
        if (user) {
          user.pref_browser_notif = (pref_browser_notif === true || pref_browser_notif === 'true' || pref_browser_notif === 't');
          user.pref_sounds = (pref_sounds === true || pref_sounds === 'true' || pref_sounds === 't');
          user.pref_whatsapp = (pref_whatsapp === true || pref_whatsapp === 'true' || pref_whatsapp === 't');
          user.pref_email = (pref_email === true || pref_email === 'true' || pref_email === 't');
        }
        return { rows: user ? [user] : [] };
      }
    }

    if (normalizedText.includes('update notifications')) {
      if (normalizedText.includes('read_status =') && normalizedText.includes('where id =')) {
        const readStatus = params[0];
        const notifId = params[1];
        const notif = mockDb.notifications.find(n => n.id === Number(notifId));
        if (notif) notif.read_status = (readStatus === true || readStatus === 'true' || readStatus === 't');
        return { rows: notif ? [notif] : [] };
      }
      if (normalizedText.includes('read_status =') && normalizedText.includes('where user_id =')) {
        const readStatus = params[0];
        const userId = params[1];
        const userNotifs = mockDb.notifications.filter(n => n.user_id === Number(userId));
        userNotifs.forEach(n => {
          n.read_status = (readStatus === true || readStatus === 'true' || readStatus === 't');
        });
        return { rows: userNotifs };
      }
    }

    if (normalizedText.includes('update shops')) {
      let shop;
      const lastParam = params[params.length - 1];
      if (normalizedText.includes('where owner_id =')) {
        shop = mockDb.shops.find(s => Number(s.owner_id) === Number(lastParam));
      } else {
        shop = mockDb.shops.find(s => Number(s.id) === Number(lastParam));
      }

      if (shop) {
        // 1. verifyShop (5 images submission)
        if (normalizedText.includes('verification_status =') && normalizedText.includes('image_front =')) {
          shop.verification_status = 'Under Review';
          shop.verified_by_seller = true;
          shop.working_hours = params[0];
          shop.shop_category = params[1];
          shop.image_front = params[2];
          shop.image_counter = params[3];
          shop.image_inside1 = params[4];
          shop.image_inside2 = params[5];
          shop.image_additional = params[6];
        }
        // 2. updateVerificationStatus (Admin verify) — params: [status, verifiedByAdmin, isVerified, shopId]
        else if (normalizedText.includes('verification_status =') && normalizedText.includes('verified_by_admin =')) {
          const newStatus = params[0];
          const verifiedByAdmin = params[1] === true || params[1] === 'true' || params[1] === 't';
          const isVerified = params[2] === true || params[2] === 'true' || params[2] === 't' || newStatus === 'Verified';
          shop.verification_status = newStatus;
          shop.verified_by_admin = verifiedByAdmin;
          shop.verified = isVerified;
          if (isVerified) {
            shop.verification_date = new Date();
            // Auto-set shop to Available when verified
            shop.availability_status = 'Available';
          } else if (newStatus === 'Rejected' || newStatus === 'Suspended') {
            shop.availability_status = 'Offline';
            shop.verified = false;
          }
        }
        // 3. updateShopSettings
        else if (normalizedText.includes('shop_name = $1') && normalizedText.includes('address = $2')) {
          shop.shop_name = params[0];
          shop.address = params[1];
          shop.latitude = Number(params[2]);
          shop.longitude = Number(params[3]);
          shop.availability_status = params[4];
          shop.max_active_orders = Number(params[5]);
          shop.waiting_time = Number(params[6]);
          shop.discounts = params[7];
          shop.online_start_time = params[8];
          shop.online_end_time = params[9];
          shop.working_hours = params[10];
          shop.shop_category = params[11];
        }
        // 4. updateShopSettings (original simplified version)
        else if (normalizedText.includes('availability_status = $1') || normalizedText.includes('set availability_status =')) {
          shop.availability_status = params[0];
          shop.max_active_orders = Number(params[1]);
          shop.waiting_time = Number(params[2]);
          shop.discounts = params[3];
          shop.online_start_time = params[4];
          shop.online_end_time = params[5];
        }
        // 5. updateShopQueueCount
        else if (normalizedText.includes('set active_orders =')) {
          shop.active_orders = Number(params[0]);
          shop.waiting_time = Number(params[0]) * 5;
        }
        // 6. updateShopPayment
        else if (normalizedText.includes('upi_id = $1') || normalizedText.includes('set upi_id =')) {
          shop.upi_id = params[0];
          if (params[1]) shop.qr_code_image = params[1];
        }
        else if (normalizedText.includes('image_banner = $1') || normalizedText.includes('set image_banner =')) {
          shop.image_banner = params[0];
        }
      }
      return { rows: shop ? [shop] : [] };
    }

    if (normalizedText.includes('update orders')) {
      let orderId;
      if (normalizedText.includes('where id = $5')) orderId = params[4];
      else if (normalizedText.includes('where id = $4')) orderId = params[3];
      else if (normalizedText.includes('where id = $3')) orderId = params[2];
      else if (normalizedText.includes('where id = $2')) orderId = params[1];

      const order = mockDb.orders.find(o => Number(o.id) === Number(orderId));
      if (order) {
        order.updated_at = new Date();
        
        const syncStatusTimestamp = (ord, statusVal) => {
          if (statusVal === 'Accepted') ord.accepted_at = new Date();
          else if (statusVal === 'Packing Started') ord.packing_started_at = new Date();
          else if (statusVal === 'Ready For Pickup') ord.ready_for_pickup_at = new Date();
          else if (statusVal === 'Confirmed') ord.confirmed_at = new Date();
          else if (statusVal === 'Delivered') {
            ord.delivered_at = new Date();
            ord.payment_status = 'Paid';
          }
          else if (statusVal === 'Cancelled') ord.cancelled_at = new Date();
        };

        // 1. updateOrderStatus
        // UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
        if (normalizedText.includes('order_status = $1') && normalizedText.includes('where id = $2')) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          
          if (params[0] === 'Delivered' || params[0] === 'Cancelled') {
            const shop = mockDb.shops.find(s => s.id === order.shop_id);
            if (shop) {
              shop.active_orders = Math.max(0, shop.active_orders - 1);
              shop.waiting_time = shop.active_orders * 5;
              if (shop.active_orders < shop.max_active_orders && shop.availability_status === 'Busy') {
                shop.availability_status = 'Available';
              }
            }
          }
        }
        // 1.b Customer requests changes (Digital order revision)
        else if (normalizedText.includes('item_change_history = $3') || normalizedText.includes('item_change_history =')) {
          order.order_status = params[0]; // $1
          order.notes = params[1];        // $2
          order.item_change_history = params[2]; // $3
        }
        // 2. uploadBill (Handwritten or Digital)
        else if (normalizedText.includes('modified_item_list = $1') || normalizedText.includes('modified_item_list =')) {
          order.modified_item_list = params[0];
          order.amount = Number(params[1]);
          order.notes = params[2];
          order.order_status = 'Bill Uploaded';
          order.payment_method = null;
          order.payment_status = 'Pending';
          order.payment_proof_image = null;
        }
        else if (normalizedText.includes('modified_bill = $1') && normalizedText.includes('amount = $2')) {
          order.modified_bill = params[0];
          order.amount = Number(params[1]);
          order.notes = params[2];
          order.order_status = 'Bill Uploaded';
          order.payment_method = null;
          order.payment_status = 'Pending';
          order.payment_proof_image = null;
        }
        // 3. confirmOrder
        else if (normalizedText.includes('payment_method = $1') && normalizedText.includes('payment_status = $2')) {
          order.order_status = 'Confirmed';
          order.payment_method = params[0];
          order.payment_status = params[1];
          order.payment_proof_image = params[2] || null;
          order.confirmed_at = new Date();
        }
        // Fallbacks
        else if (normalizedText.includes('set order_status = $1') && normalizedText.includes('modified_bill = $2')) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          order.modified_bill = params[1];
          order.amount = Number(params[2]);
          order.notes = params[3];
        } else if (normalizedText.includes('set order_status = $1') && normalizedText.includes('payment_method = $2')) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          order.payment_method = params[1];
          order.payment_status = params[2];
          order.payment_proof_image = params[3] || null;
        } else if (normalizedText.includes('set order_status = $1') && params.length === 2) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          
          if (params[0] === 'Delivered' || params[0] === 'Cancelled') {
            const shop = mockDb.shops.find(s => s.id === order.shop_id);
            if (shop) {
              shop.active_orders = Math.max(0, shop.active_orders - 1);
              shop.waiting_time = shop.active_orders * 5;
              if (shop.active_orders < shop.max_active_orders && shop.availability_status === 'Busy') {
                shop.availability_status = 'Available';
              }
            }
          }
        }
      }
      return { rows: order ? [order] : [] };
    }
  }

  // DELETE queries
  if (normalizedText.startsWith('delete')) {
    isMockDbDirty = true;
    if (normalizedText.includes('from notifications')) {
      if (normalizedText.includes('where user_id =')) {
        const userId = params[0];
        mockDb.notifications = mockDb.notifications.filter(n => n.user_id !== Number(userId));
        return { rows: [] };
      }
      if (normalizedText.includes('where id =')) {
        const id = params[0];
        mockDb.notifications = mockDb.notifications.filter(n => n.id !== Number(id));
        return { rows: [] };
      }
    }
  }

  return { rows: [] };
};

// Initialize schema & check seeds
const initDb = async () => {
  if (isMock) {
    console.log('✅ In-memory database pre-loaded with Bangalore HSR Layout shops and demo users.');
    return;
  }

  try {
    console.log('⚡ Initializing PostgreSQL schema...');
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);

    // Make sure venkateshgoud224@gmail.com exists as an admin in PostgreSQL
    await pool.query(`
      INSERT INTO users (role, name, email, password, phone)
      VALUES ('admin', 'Venkatesh Goud', 'venkateshgoud224@gmail.com', $1, '9000000005')
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
    `, [HASHED_PASSWORD]);
    
    // Safely add custom_order_id and transition timestamps to existing database schemas if not present
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_order_id VARCHAR(50);');
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS image_banner TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS packing_started_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;');
    
    // Add reset password tokens columns
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;');
    
    // Phase 5 migrations for digital / hybrid chitti updates
    await pool.query('ALTER TABLE orders ALTER COLUMN original_chitti DROP NOT NULL;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT \'handwritten\';');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS digital_item_list TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS modified_item_list TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_change_history TEXT;');
    
    // Remove Bangalore seeding
    console.log('ℹ️ Startup complete.');
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL database or seeder:', err.message);
    console.log('⚠️ Falling back to In-Memory mock database for active sessions.');
    isMock = true;
  }
};

module.exports = {
  query,
  initDb,
  getIsMock: () => isMock,
  getMockDb: () => mockDb, // Expose mockDb to the simulation service
  saveMockDb,
  markMockDbDirty: () => { isMockDbDirty = true; }
};
