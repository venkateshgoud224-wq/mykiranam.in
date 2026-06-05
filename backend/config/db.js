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

const mockUsers = [];

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
  seller_performance: {},
  order_chats: [],
  products: [],
  product_aliases: [],
  historical_prices: [],
  shop_price_index: [],
  quote_history: [],
  price_analytics: []
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

    // Admin user logic removed to prevent seeded data
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
    if (normalizedText.includes('seller_customer_blocks')) {
      return { rows: [] };
    }

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
      if (normalizedText.includes('where whatsapp_number =')) {
        const whatsappNumber = params[0];
        const user = mockDb.users.find(u => u.whatsapp_number === whatsappNumber && u.verified_whatsapp === true);
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
      let trust = mockDb.customer_trust[customerId] || {
        customer_id: Number(customerId),
        successful_pickups: 3,
        cancellations: 0,
        no_show_count: 0,
        total_orders: 0,
        active_order_limit: 2,
        suspension_end_date: null,
        abandoned_orders: 0,
        cancellation_warnings: 0,
        no_pickup_warnings: 0,
        trust_score: 100,
        customer_level: 'Platinum Customer',
        fake_complaints: 0,
        abuse_reports: 0
      };
      if (!mockDb.customer_trust[customerId]) {
        mockDb.customer_trust[customerId] = trust;
        isMockDbDirty = true;
      }
      return { rows: [trust] };
    }

    if (normalizedText.includes('from seller_performance')) {
      const shopId = params[0];
      let perf = mockDb.seller_performance[shopId] || {
        shop_id: Number(shopId),
        response_time_avg: 5,
        order_completion_pct: 100,
        cancellation_pct: 0,
        total_completed_orders: 0,
        total_cancelled_orders: 0,
        trust_score: 100,
        seller_level: 'Platinum Seller',
        complaint_rate: 0,
        verified_complaints: 0
      };
      if (!mockDb.seller_performance[shopId]) {
        mockDb.seller_performance[shopId] = perf;
        isMockDbDirty = true;
      }
      return { rows: [perf] };
    }

    if (normalizedText.includes('from order_chats')) {
      const orderId = params[0];
      const chats = mockDb.order_chats.filter(c => Number(c.order_id) === Number(orderId));
      chats.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { rows: chats };
    }

    if (normalizedText.includes('from products')) {
      if (normalizedText.includes('where name =')) {
        const product = mockDb.products.find(p => p.name.toLowerCase() === params[0].toLowerCase());
        return { rows: product ? [product] : [] };
      }
      return { rows: mockDb.products };
    }

    if (normalizedText.includes('from product_aliases')) {
      if (normalizedText.includes('where alias_name =')) {
        const alias = mockDb.product_aliases.find(a => a.alias_name.toLowerCase() === params[0].toLowerCase());
        return { rows: alias ? [alias] : [] };
      }
      return { rows: mockDb.product_aliases };
    }

    if (normalizedText.includes('from historical_prices')) {
      let prices = mockDb.historical_prices;
      if (normalizedText.includes('where shop_id =')) {
        prices = prices.filter(p => Number(p.shop_id) === Number(params[0]));
      }
      return { rows: prices };
    }

    if (normalizedText.includes('from price_analytics')) {
      return { rows: mockDb.price_analytics };
    }
  }

  // INSERT queries
  if (normalizedText.startsWith('insert')) {
    isMockDbDirty = true;
  }
  if (normalizedText.startsWith('insert into customer_trust')) {
    const customerId = Number(params[0]);
    if (!mockDb.customer_trust[customerId]) {
      mockDb.customer_trust[customerId] = {
        customer_id: customerId,
        successful_pickups: 0,
        cancellations: 0,
        no_show_count: 0,
        total_orders: 0,
        active_order_limit: 2,
        suspension_end_date: null,
        abandoned_orders: 0,
        cancellation_warnings: 0,
        no_pickup_warnings: 0,
        trust_score: 100,
        customer_level: 'Platinum Customer',
        fake_complaints: 0,
        abuse_reports: 0
      };
    }
    const record = mockDb.customer_trust[customerId];
    
    if (normalizedText.includes('total_orders')) {
      record.total_orders = (record.total_orders || 0) + 1;
    }
    if (normalizedText.includes('successful_pickups')) {
      record.successful_pickups = (record.successful_pickups || 0) + 1;
      if (normalizedText.includes('trust_score')) {
        record.trust_score = Math.min(100, (record.trust_score || 100) + 1);
      }
    }
    if (normalizedText.includes('cancellations')) {
      record.cancellations = (record.cancellations || 0) + 1;
      if (normalizedText.includes('trust_score')) {
        record.trust_score = Math.max(0, (record.trust_score || 100) - 5);
      }
    }
    if (normalizedText.includes('abandoned_orders')) {
      record.abandoned_orders = (record.abandoned_orders || 0) + 1;
    }
    
    return { rows: [record] };
  }

  if (normalizedText.startsWith('insert into seller_performance')) {
    const shopId = Number(params[0]);
    if (!mockDb.seller_performance[shopId]) {
      mockDb.seller_performance[shopId] = {
        shop_id: shopId,
        response_time_avg: 5,
        order_completion_pct: 100.00,
        cancellation_pct: 0.00,
        total_completed_orders: 0,
        total_cancelled_orders: 0,
        trust_score: 100,
        seller_level: 'Platinum Seller',
        complaint_rate: 0.00,
        verified_complaints: 0
      };
    }
    const record = mockDb.seller_performance[shopId];
    
    if (normalizedText.includes('response_time_avg')) {
      const responseTimeSec = Number(params[1]) || 0;
      record.response_time_avg = Math.round(((record.response_time_avg || 5) * (record.total_completed_orders || 0) + responseTimeSec) / ((record.total_completed_orders || 0) + 1));
      record.total_completed_orders = (record.total_completed_orders || 0) + 1;
    }
    if (normalizedText.includes('total_cancelled_orders')) {
      record.total_cancelled_orders = (record.total_cancelled_orders || 0) + 1;
      if (normalizedText.includes('trust_score')) {
        record.trust_score = Math.max(0, (record.trust_score || 100) - 5);
      }
    }
    
    return { rows: [record] };
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
      verified_email: false,
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
    const colMatch = text.match(/\(([^)]+)\)/);
    const columns = colMatch ? colMatch[1].split(',').map(c => c.trim().toLowerCase()) : [];

    const newOrder = {
      id: mockDb.orders.length + 1,
      customer_id: null,
      shop_id: null,
      original_chitti: null,
      modified_bill: null,
      amount: null,
      payment_method: null,
      payment_status: 'Pending',
      payment_proof_image: null,
      notes: '',
      preferred_pickup_time: null,
      order_status: 'Waiting For Seller',
      created_at: new Date(),
      updated_at: new Date(),
      custom_order_id: null,
      accepted_at: null,
      packing_started_at: null,
      ready_for_pickup_at: null,
      confirmed_at: null,
      delivered_at: null,
      cancelled_at: null,
      order_type: 'handwritten',
      digital_item_list: null,
      modified_item_list: null,
      item_change_history: null
    };

    columns.forEach((col, idx) => {
      const val = params[idx];
      if (col === 'customer_id') newOrder.customer_id = val !== null && val !== undefined ? Number(val) : null;
      else if (col === 'shop_id') newOrder.shop_id = val !== null && val !== undefined ? Number(val) : null;
      else if (col === 'original_chitti') newOrder.original_chitti = val;
      else if (col === 'notes') newOrder.notes = val || '';
      else if (col === 'preferred_pickup_time') newOrder.preferred_pickup_time = val;
      else if (col === 'order_status') newOrder.order_status = val || 'Waiting For Seller';
      else if (col === 'custom_order_id') newOrder.custom_order_id = val;
      else if (col === 'order_type') newOrder.order_type = val || 'handwritten';
      else if (col === 'digital_item_list') newOrder.digital_item_list = val;
      else if (col === 'modified_item_list') newOrder.modified_item_list = val;
      else if (col === 'amount') newOrder.amount = val !== null && val !== undefined ? Number(val) : null;
      else if (col === 'gateway_fee') newOrder.gateway_fee = val !== null && val !== undefined ? Number(val) : 0;
      else if (col === 'item_change_history') newOrder.item_change_history = val;
    });

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

  if (normalizedText.startsWith('insert into order_chats')) {
    const newChat = {
      id: mockDb.order_chats.length + 1,
      order_id: Number(params[0]),
      sender_id: Number(params[1]),
      sender_role: params[2],
      message: params[3],
      created_at: new Date()
    };
    mockDb.order_chats.push(newChat);
    return { rows: [newChat] };
  }

  if (normalizedText.startsWith('insert into products')) {
    const newProduct = {
      id: mockDb.products.length + 1,
      name: params[0],
      category: params[1] || 'General',
      created_at: new Date()
    };
    mockDb.products.push(newProduct);
    return { rows: [newProduct] };
  }

  if (normalizedText.startsWith('insert into product_aliases')) {
    const newAlias = {
      id: mockDb.product_aliases.length + 1,
      product_id: Number(params[0]),
      alias_name: params[1],
      created_at: new Date()
    };
    mockDb.product_aliases.push(newAlias);
    return { rows: [newAlias] };
  }

  if (normalizedText.startsWith('insert into historical_prices')) {
    const newPrice = {
      id: mockDb.historical_prices.length + 1,
      product_id: Number(params[0]),
      shop_id: Number(params[1]),
      order_id: Number(params[2]),
      price_per_unit: parseFloat(params[3]),
      quantity: parseFloat(params[4]),
      unit: params[5] || 'unit',
      recorded_at: new Date()
    };
    mockDb.historical_prices.push(newPrice);
    return { rows: [newPrice] };
  }

  if (normalizedText.startsWith('insert into quote_history')) {
    const newHistory = {
      id: mockDb.quote_history.length + 1,
      customer_id: Number(params[0]),
      items_requested: params[1],
      generated_quotes: params[2],
      created_at: new Date()
    };
    mockDb.quote_history.push(newHistory);
    return { rows: [newHistory] };
  }

  if (normalizedText.includes('insert into price_analytics')) {
    // Basic mock upsert handling
    const existing = mockDb.price_analytics.find(pa => Number(pa.product_id) === Number(params[0]) && Number(pa.shop_id) === Number(params[1]));
    if (existing) {
      existing.average_7_day = params[2];
      existing.average_30_day = params[3];
      existing.average_90_day = params[4];
      existing.updated_at = new Date();
      return { rows: [existing] };
    } else {
      const newAnalytics = {
        id: mockDb.price_analytics.length + 1,
        product_id: Number(params[0]),
        shop_id: Number(params[1]),
        average_7_day: params[2],
        average_30_day: params[3],
        average_90_day: params[4],
        updated_at: new Date()
      };
      mockDb.price_analytics.push(newAnalytics);
      return { rows: [newAnalytics] };
    }
  }

  // UPDATE queries
  if (normalizedText.startsWith('update')) {
    isMockDbDirty = true;
    if (normalizedText.includes('update customer_trust')) {
      const customerId = Number(params[params.length - 1]);
      const record = mockDb.customer_trust[customerId];
      if (record) {
        if (normalizedText.includes('suspension_end_date')) {
          const date = new Date();
          date.setDate(date.getDate() + 7);
          record.suspension_end_date = date;
          record.active_order_limit = 2;
        }
        if (normalizedText.includes('no_pickup_warnings')) {
          record.no_pickup_warnings = (record.no_pickup_warnings || 0) + 1;
        }
        if (normalizedText.includes('abandoned_orders = 0')) {
          record.abandoned_orders = 0;
        }
      }
      return { rows: record ? [record] : [] };
    }
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
        else if (normalizedText.includes('upi_id = $1') || normalizedText.includes('set upi_id =')) {
          shop.upi_id = params[0];
          if (params[1]) shop.qr_code_image = params[1];
        }
        else if (normalizedText.includes('image_banner = $1') || normalizedText.includes('set image_banner =')) {
          shop.image_banner = params[0];
        }
        // 7. Razorpay Linked Account Setup
        else if (normalizedText.includes('razorpay_linked_account_id =')) {
          shop.bank_account_number = params[0];
          shop.bank_ifsc_code = params[1];
          shop.bank_beneficiary_name = params[2];
          shop.razorpay_linked_account_id = params[3];
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
      else if (normalizedText.includes('where id = $1')) orderId = params[0];

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
        if (normalizedText.includes('order_status = $1') && normalizedText.includes('where id = $2')) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          
          if (params[0] === 'Ready For Pickup' && params.length >= 4) {
            order.pickup_otp = params[2];
          }
          
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
        else if (normalizedText.includes('pickup_otp = $2') && normalizedText.includes('where id = $5')) {
          // UPDATE orders SET order_status = $1, pickup_otp = $2, otp_generated_at = $3, pickup_deadline = $4 WHERE id = $5
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          order.pickup_otp = params[1];
          order.otp_generated_at = params[2];
          order.pickup_deadline = params[3];
        }
        else if (normalizedText.includes('otp_verified_at = $2') && normalizedText.includes('where id = $3')) {
          // UPDATE orders SET order_status = $1, otp_verified_at = $2 WHERE id = $3
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          order.otp_verified_at = params[1];
          
          const shop = mockDb.shops.find(s => s.id === order.shop_id);
          if (shop) {
            shop.active_orders = Math.max(0, shop.active_orders - 1);
            shop.waiting_time = shop.active_orders * 5;
            if (shop.active_orders < shop.max_active_orders && shop.availability_status === 'Busy') {
              shop.availability_status = 'Available';
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
        } else if (normalizedText.includes('razorpay_order_id = $1')) {
          order.order_status = 'Confirmed';
          syncStatusTimestamp(order, 'Confirmed');
          order.payment_status = 'Paid';
          order.payment_method = 'Razorpay UPI';
          order.razorpay_order_id = params[0];
          order.razorpay_payment_id = params[1];
        } else if (normalizedText.includes('refund_id = $1')) {
          order.payment_status = 'Refunded';
          order.refund_id = params[0];
          order.refund_status = 'Processed';
        } else if (normalizedText.includes('set order_status = $1')) {
          order.order_status = params[0];
          syncStatusTimestamp(order, params[0]);
          
          if (params[0] === 'Ready For Pickup' && params.length >= 4) {
            order.pickup_otp = params[2];
          }
          
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

    // Admin user seeding removed to prevent dummy data in production
    
    // Safely add custom_order_id and transition timestamps to existing database schemas if not present
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_order_id VARCHAR(50);');
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS image_banner TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS packing_started_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_pickup_reminder_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;');
    
    // Add reset password tokens columns
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;');
    
    // Add analytics columns
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_email BOOLEAN DEFAULT false;');

    
    // Phase 5 migrations for digital / hybrid chitti updates
    await pool.query('ALTER TABLE orders ALTER COLUMN original_chitti DROP NOT NULL;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT \'handwritten\';');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS digital_item_list TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS modified_item_list TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_change_history TEXT;');
    
    // Phase 6A migrations
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(10);');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS otp_generated_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_deadline TIMESTAMP WITH TIME ZONE;');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_chats (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sender_role VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Phase 6B migrations
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS verified_complaints_count INT DEFAULT 0;');
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS warning_level VARCHAR(50) DEFAULT \'None\' CHECK (warning_level IN (\'None\', \'Warning\', \'Monitoring\', \'Final Warning\', \'Suspended\', \'Banned\'));');
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;');
    await pool.query('ALTER TABLE shops ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        issue_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        evidence_images JSONB,
        status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Seller Responded', 'Resolved', 'Closed')),
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        product_quality INT CHECK (product_quality BETWEEN 1 AND 5),
        service_quality INT CHECK (service_quality BETWEEN 1 AND 5),
        order_accuracy INT CHECK (order_accuracy BETWEEN 1 AND 5),
        overall_experience INT CHECK (overall_experience BETWEEN 1 AND 5),
        review_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suspension_history (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        warning_level VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        suspended_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
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
