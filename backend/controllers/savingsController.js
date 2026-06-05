const db = require('../config/db');

// Customer specific methods
const getCustomerSavings = async (req, res) => {
    try {
        const customerId = req.user.id;
        
        const savingsRes = await db.query(
            `SELECT * FROM customer_savings WHERE customer_id = $1`, 
            [customerId]
        );
        
        let savings = savingsRes.rows[0];
        if (!savings) {
            savings = {
                total_orders: 0,
                total_savings: 0.00,
                total_time_saved: 0,
                favorite_shop_id: null
            };
        }

        let favoriteShopName = 'None';
        if (savings.favorite_shop_id) {
            const shopRes = await db.query('SELECT shop_name FROM shops WHERE id = $1', [savings.favorite_shop_id]);
            if (shopRes.rows.length > 0) {
                favoriteShopName = shopRes.rows[0].shop_name;
            }
        }

        res.json({
            savings,
            favoriteShopName
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
