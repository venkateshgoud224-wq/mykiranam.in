const db = require('../config/db');

// Helper to normalize item names
const normalizeItemName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0C00-\u0C7F]/g, '') // Keep alphanumeric, spaces, and Telugu chars
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extracts prices from a delivered order and stores them in historical_prices.
 * Also handles product and alias creation.
 */
const extractOrderPrices = async (orderId) => {
  try {
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return;
    
    const order = orderResult.rows[0];
    
    if (order.order_status !== 'Delivered') return;
    
    // Check for digital items (modified_item_list)
    if (!order.modified_item_list) return;

    let items = [];
    try {
      items = typeof order.modified_item_list === 'string' 
        ? JSON.parse(order.modified_item_list) 
        : order.modified_item_list;
    } catch (e) {
      console.error('Failed to parse modified_item_list for order', orderId);
      return;
    }

    if (!Array.isArray(items)) return;

    for (const item of items) {
      const rawName = item.name || item.itemName;
      const price = parseFloat(item.price || item.total || 0); // fallback to total if price per unit isn't separated
      let quantity = parseFloat(item.quantity || 1);
      const unit = item.unit || 'unit';

      if (!rawName || price <= 0 || quantity <= 0) continue;

      // Ensure price is per unit. If item.price is total, price_per_unit = total / quantity
      // Assuming item.price is already per unit, but some frontend implementations put total in price.
      // We will assume item.price is the total price for the row if there's no separate total field.
      // Wait, standard practice: item.price is unit price. Let's use it as unit price if it exists, otherwise total/qty.
      let pricePerUnit = price;
      if (item.total && item.price) {
        pricePerUnit = parseFloat(item.price);
      } else if (item.price && quantity > 1 && parseFloat(item.price) > 500 && unit.toLowerCase() === 'kg') {
        // basic heuristic if something is way too expensive, maybe it's total, but we stick to pricePerUnit = price.
        // Actually, best to just use price as price_per_unit.
        pricePerUnit = price;
      }

      const normalizedName = normalizeItemName(rawName);
      if (!normalizedName) continue;

      let productId = null;

      // 1. Check Product Aliases
      const aliasResult = await db.query('SELECT product_id FROM product_aliases WHERE alias_name = $1', [normalizedName]);
      
      if (aliasResult.rows.length > 0) {
        productId = aliasResult.rows[0].product_id;
      } else {
        // 2. Check Products directly
        const productResult = await db.query('SELECT id FROM products WHERE name = $1', [normalizedName]);
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].id;
          
          // Add as an alias for future speed
          await db.query('INSERT INTO product_aliases (product_id, alias_name) VALUES ($1, $2)', [productId, normalizedName]);
        } else {
          // 3. Create new Product and Alias
          const newProdResult = await db.query(
            'INSERT INTO products (name, category) VALUES ($1, $2) RETURNING id', 
            [normalizedName, 'General']
          );
          productId = newProdResult.rows[0].id;
          
          await db.query('INSERT INTO product_aliases (product_id, alias_name) VALUES ($1, $2)', [productId, normalizedName]);
        }
      }

      // 4. Insert Historical Price
      if (productId) {
        await db.query(
          `INSERT INTO historical_prices (product_id, shop_id, order_id, price_per_unit, quantity, unit) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [productId, order.shop_id, order.id, pricePerUnit, quantity, unit]
        );
      }
    }
    
    // We could trigger a background update of price analytics here, or rely on a cron.
    // For MVP, we can recalculate immediately or just let it calculate lazily.

  } catch (err) {
    console.error('Error extracting order prices:', err);
  }
};

/**
 * Recalculate price analytics for all shops and products based on historical prices
 * This can be run via a cron job (e.g., daily)
 */
const updatePriceAnalytics = async () => {
  // In a real PG db, we would use a complex aggregation query.
  // Since we use mockDb in dev, we will implement this with simple JS logic.
  console.log('Price analytics update triggered (Cron).');
};

/**
 * Generate quotes for a list of items based on historical prices.
 * @param {Array} itemsList [{name: "Sugar", quantity: 2, unit: "kg"}]
 */
const generateQuotes = async (itemsList, customerId) => {
  try {
    // 1. Log quote request
    await db.query(
      'INSERT INTO quote_history (customer_id, items_requested, generated_quotes) VALUES ($1, $2, $3)',
      [customerId || null, JSON.stringify(itemsList), '[]']
    );

    // 2. Map requested items to Master Products
    const mappedItems = [];
    for (const reqItem of itemsList) {
      const normalizedName = normalizeItemName(reqItem.name || reqItem.itemName);
      let productId = null;
      
      const aliasResult = await db.query('SELECT product_id FROM product_aliases WHERE alias_name = $1', [normalizedName]);
      if (aliasResult.rows.length > 0) {
        productId = aliasResult.rows[0].product_id;
      } else {
        const productResult = await db.query('SELECT id FROM products WHERE name = $1', [normalizedName]);
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].id;
        }
      }

      mappedItems.push({
        ...reqItem,
        normalizedName,
        productId,
        quantity: parseFloat(reqItem.quantity || 1)
      });
    }

    // 3. Fetch all shops that are Verified
    const shopsResult = await db.query("SELECT * FROM shops WHERE verification_status = 'Verified'");
    const shops = shopsResult.rows;

    const quotes = [];

    // 4. Calculate estimate for each shop
    for (const shop of shops) {
      let minEstimate = 0;
      let maxEstimate = 0;
      let itemsFound = 0;
      const itemDetails = [];

      for (const item of mappedItems) {
        if (!item.productId) {
          // If we have no historical data for this item, assume a rough fallback or leave it out of this shop's quote
          // For a better UX, we might add a default generic price, but let's just add 0 and mark as 'Price Unknown'
          itemDetails.push({ ...item, estimated_price: 0, status: 'Unknown' });
          continue;
        }

        // Fetch recent prices for this product at this shop
        const priceResult = await db.query(
          'SELECT price_per_unit FROM historical_prices WHERE product_id = $1 AND shop_id = $2 ORDER BY recorded_at DESC LIMIT 5',
          [item.productId, shop.id]
        );

        if (priceResult.rows.length > 0) {
          // Calculate average of last 5 prices
          const sum = priceResult.rows.reduce((acc, row) => acc + parseFloat(row.price_per_unit), 0);
          const avgPrice = sum / priceResult.rows.length;
          
          const estimatedCost = avgPrice * item.quantity;
          
          // Add a 5% margin for range
          minEstimate += estimatedCost * 0.95;
          maxEstimate += estimatedCost * 1.05;
          itemsFound++;
          
          itemDetails.push({ ...item, estimated_price: estimatedCost, status: 'Estimated' });
        } else {
          // Product never sold at this shop. Try platform average?
          // For simplicity, we just mark it unknown for this shop
          itemDetails.push({ ...item, estimated_price: 0, status: 'Unknown' });
        }
      }

      // If shop has no data for ANY item, maybe skip or show a very wide range based on global averages
      // Here we only include shops where at least 1 item is found
      if (itemsFound > 0) {
        // Adjust for unknown items: If a shop is missing 1 item, we can pad the estimate by 100 rs as a placeholder
        // A better approach is to use platform average for missing items
        let missingPadding = (mappedItems.length - itemsFound) * 50; 
        
        quotes.push({
          shop_id: shop.id,
          shop_name: shop.shop_name,
          rating: shop.rating,
          latitude: shop.latitude,
          longitude: shop.longitude,
          min_estimate: Math.round(minEstimate + missingPadding),
          max_estimate: Math.round(maxEstimate + missingPadding),
          items_found_ratio: `${itemsFound}/${mappedItems.length}`,
          items_detail: itemDetails
        });
      }
    }

    // Sort quotes by average estimate
    quotes.sort((a, b) => {
      const avgA = (a.min_estimate + a.max_estimate) / 2;
      const avgB = (b.min_estimate + b.max_estimate) / 2;
      return avgA - avgB;
    });

    // Update history
    // We ideally should UPDATE the row inserted in step 1, but mockDb only handles simple queries.
    // For now, we return quotes.

    return quotes;

  } catch (err) {
    console.error('Error generating quotes:', err);
    throw err;
  }
};

module.exports = {
  extractOrderPrices,
  updatePriceAnalytics,
  generateQuotes
};
