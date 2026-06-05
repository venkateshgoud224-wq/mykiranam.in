const db = require('../config/db');

exports.searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        // Using ILIKE for case-insensitive search if PostgreSQL, or simple LIKE
        // We limit to 10 results for autocomplete
        let query = `
            SELECT id, product_name, category, quantity_desc, market_price, discounted_price 
            FROM products_dictionary 
            WHERE product_name ILIKE $1 
            ORDER BY product_name ASC 
            LIMIT 10
        `;
        let params = [`%${q}%`];

        if (db.getIsMock()) {
            // Mock mode handling
            return res.json([
                { id: 1, product_name: 'Mock Product A', category: 'General', quantity_desc: '1 kg', market_price: 100, discounted_price: 90 },
                { id: 2, product_name: 'Mock Product B', category: 'General', quantity_desc: '500 g', market_price: 50, discounted_price: 45 }
            ]);
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
};
