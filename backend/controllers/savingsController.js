const db = require('../config/db');

// Customer specific methods
const getCustomerSavings = async (req, res) => {
    try {
        const customerId = req.user.id;
        
        // Fetch completed orders to construct savings list
        const ordersRes = await db.query(
            `SELECT o.*, s.shop_name 
             FROM orders o
             JOIN shops s ON o.shop_id = s.id
             WHERE o.customer_id = $1
             ORDER BY o.created_at DESC`,
            [customerId]
        );

        const completedOrdersRaw = ordersRes.rows.filter(o => o.order_status === 'Delivered');
        completedOrdersRaw.sort((a, b) => {
            const dateA = a.delivered_at ? new Date(a.delivered_at) : new Date(a.updated_at || 0);
            const dateB = b.delivered_at ? new Date(b.delivered_at) : new Date(b.updated_at || 0);
            return dateB - dateA;
        });

        const completedOrders = completedOrdersRaw.map(order => {
            const estimatedDeliverySavings = 35;
            const myKiranamPrice = parseFloat(order.amount || 0);
            const baseFee = myKiranamPrice * 0.02;
            const gst = baseFee * 0.18;
            const estimatedPlatformSavings = Math.round(baseFee + gst) + 10;
            
            let marketPriceTotal = 0;
            if (order.order_type === 'digital' && order.modified_item_list) {
              let items = [];
              try {
                items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
              } catch(e) {}
              
              for (const item of items) {
                 if (!item.name) continue;
                 const mPrice = parseFloat(item.price || 0) * 1.15;
                 marketPriceTotal += (mPrice * parseFloat(item.quantity || 1));
              }
            } else {
              marketPriceTotal = myKiranamPrice * 1.15;
            }
            
            let productSavings = marketPriceTotal - myKiranamPrice;
            if (productSavings < 0) productSavings = 0;

            const totalSavings = estimatedDeliverySavings + estimatedPlatformSavings + Math.round(productSavings);
            const timeSaved = 30; // 30 minutes

            return {
                id: order.id,
                custom_order_id: order.custom_order_id,
                shop_name: order.shop_name,
                amount: myKiranamPrice,
                delivered_at: order.delivered_at || order.updated_at,
                order_type: order.order_type,
                delivery_savings: estimatedDeliverySavings,
                platform_savings: estimatedPlatformSavings,
                grocery_savings: Math.round(productSavings),
                total_savings: totalSavings,
                time_saved: timeSaved
            };
        });

        // Compute dynamic stats from completed orders to ensure sync
        let dynamicTotalSavings = 0;
        let dynamicTotalTimeSaved = 0;
        const shopCounts = {};
        let dynamicFavoriteShopId = null;
        let maxCount = 0;

        completedOrders.forEach(o => {
            dynamicTotalSavings += o.total_savings;
            dynamicTotalTimeSaved += o.time_saved;
        });

        completedOrdersRaw.forEach(order => {
            if (order.shop_id) {
                shopCounts[order.shop_id] = (shopCounts[order.shop_id] || 0) + 1;
                if (shopCounts[order.shop_id] > maxCount) {
                    maxCount = shopCounts[order.shop_id];
                    dynamicFavoriteShopId = order.shop_id;
                }
            }
        });

        const savingsRes = await db.query(
            `SELECT * FROM customer_savings WHERE customer_id = $1`, 
            [customerId]
        );
        let savings = savingsRes.rows[0];
        if (!savings) {
            savings = {
                customer_id: customerId,
                total_orders: completedOrders.length,
                total_savings: dynamicTotalSavings.toFixed(2),
                total_time_saved: dynamicTotalTimeSaved,
                favorite_shop_id: dynamicFavoriteShopId
            };
        } else {
            // Override/sync values to ensure they match completed orders
            savings.total_orders = completedOrders.length;
            savings.total_savings = dynamicTotalSavings.toFixed(2);
            savings.total_time_saved = dynamicTotalTimeSaved;
            savings.favorite_shop_id = savings.favorite_shop_id || dynamicFavoriteShopId;
        }

        let favoriteShopName = 'None';
        const finalFavoriteShopId = savings.favorite_shop_id || dynamicFavoriteShopId;
        if (finalFavoriteShopId) {
            const shopRes = await db.query('SELECT shop_name FROM shops WHERE id = $1', [finalFavoriteShopId]);
            if (shopRes.rows.length > 0) {
                favoriteShopName = shopRes.rows[0].shop_name;
            }
        }

        res.json({
            savings,
            favoriteShopName,
            completedOrders,
            badges: [] // explicit empty badges list as fallback
        });
    } catch (err) {
        console.error('Error fetching customer savings:', err);
        res.status(500).json({ error: 'Failed to fetch customer savings' });
    }
};

// Global community stats
const getCommunitySavings = async (req, res) => {
    try {
        const commRes = await db.query(`SELECT * FROM community_savings LIMIT 1`);
        let stats = commRes.rows[0];
        if (!stats) {
            stats = { total_orders: 0, total_savings: 0, total_time_saved: 0 };
        }
        res.json(stats);
    } catch (err) {
        console.error('Error fetching community savings:', err);
        res.status(500).json({ error: 'Failed to fetch community savings' });
    }
};

module.exports = {
    getCustomerSavings,
    getCommunitySavings
};
