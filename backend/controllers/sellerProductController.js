const xlsx = require('xlsx');
const fs = require('fs');
const db = require('../config/db');

// Helper: Filter orders by date range
const filterOrdersByDate = (orders, filter, startDate, endDate) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(order => {
        const orderDate = new Date(order.delivered_at || order.created_at);
        
        switch (filter) {
            case 'Today': {
                return orderDate >= today;
            }
            case 'Yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return orderDate >= yesterday && orderDate < today;
            }
            case 'Last 7 Days': {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return orderDate >= sevenDaysAgo;
            }
            case 'Last 30 Days': {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return orderDate >= thirtyDaysAgo;
            }
            case 'Custom Date Range': {
                if (!startDate || !endDate) return true;
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return orderDate >= start && orderDate <= end;
            }
            default:
                return true;
        }
    });
};

// Helper: Calculate Sales Stats for each seller product
const calculateSalesStats = async (shopId, products) => {
    const ordersResult = await db.query(
        "SELECT modified_item_list, delivered_at, created_at FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
        [shopId]
    );
    const orderRows = ordersResult.rows;

    const statsMap = new Map();

    for (const order of orderRows) {
        if (!order.modified_item_list) continue;
        let items = [];
        try {
            items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
        } catch (e) {
            continue;
        }
        if (!Array.isArray(items)) continue;

        const soldDate = order.delivered_at || order.created_at || new Date();

        for (const item of items) {
            const name = item.name || item.itemName;
            if (!name) continue;
            const key = name.trim().toLowerCase();
            const price = parseFloat(item.price || 0);
            const qty = parseFloat(item.quantity || 1);
            const revenue = price * qty;

            if (!statsMap.has(key)) {
                statsMap.set(key, {
                    last_selling_price: price,
                    total_quantity_sold: qty,
                    total_revenue_generated: revenue,
                    last_sold_date: soldDate
                });
            } else {
                const stats = statsMap.get(key);
                stats.total_quantity_sold += qty;
                stats.total_revenue_generated += revenue;
                if (new Date(soldDate) > new Date(stats.last_sold_date)) {
                    stats.last_selling_price = price;
                    stats.last_sold_date = soldDate;
                }
            }
        }
    }

    return products.map(p => {
        const key = p.product_name.toLowerCase().trim();
        const stats = statsMap.get(key) || {
            last_selling_price: parseFloat(p.price || 0),
            total_quantity_sold: 0,
            total_revenue_generated: 0,
            last_sold_date: null
        };
        return {
            ...p,
            last_selling_price: stats.last_selling_price,
            total_quantity_sold: stats.total_quantity_sold,
            total_revenue_generated: stats.total_revenue_generated,
            last_sold_date: stats.last_sold_date
        };
    });
};


exports.uploadCatalog = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a catalog file.' });
    }

    const filePath = req.file.path;
    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'No shop profile found. Please configure your shop settings first.' });
        }
        const shopId = shopResult.rows[0].id;
        const sellerId = req.user.id;

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'The uploaded file is empty.' });
        }

        const keys = Object.keys(data[0]);
        const headerMap = {
            name: keys.find(k => k.trim().toLowerCase() === 'product name' || k.trim().toLowerCase() === 'product_name'),
            category: keys.find(k => k.trim().toLowerCase() === 'category'),
            price: keys.find(k => k.trim().toLowerCase() === 'price'),
            quantity: keys.find(k => k.trim().toLowerCase() === 'quantity'),
            unit: keys.find(k => k.trim().toLowerCase() === 'unit')
        };

        if (!headerMap.name || !headerMap.price || !headerMap.quantity || !headerMap.unit) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                error: 'Invalid column headers. Columns must include: Product Name, Category, Price, Quantity, Unit'
            });
        }

        const errors = [];
        const validRows = [];

        data.forEach((row, index) => {
            const rowNumber = index + 2; 
            const name = row[headerMap.name]?.toString().trim();
            const category = row[headerMap.category]?.toString().trim() || 'General';
            const priceVal = row[headerMap.price];
            const qtyVal = row[headerMap.quantity];
            const unit = row[headerMap.unit]?.toString().trim();

            if (!name) {
                errors.push(`Row ${rowNumber}: Product Name is required.`);
                return;
            }
            if (!unit) {
                errors.push(`Row ${rowNumber}: Unit is required.`);
                return;
            }

            const price = parseFloat(priceVal);
            if (isNaN(price) || price < 0) {
                errors.push(`Row ${rowNumber}: Price must be a valid non-negative number.`);
                return;
            }

            const quantity = parseFloat(qtyVal);
            if (isNaN(quantity) || quantity < 0) {
                errors.push(`Row ${rowNumber}: Quantity must be a valid non-negative number.`);
                return;
            }

            validRows.push({
                product_name: name,
                category,
                price,
                quantity,
                unit
            });
        });

        if (errors.length > 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        for (const row of validRows) {
            const existCheck = await db.query(
                'SELECT id FROM seller_products WHERE shop_id = $1 AND LOWER(product_name) = LOWER($2)',
                [shopId, row.product_name]
            );

            if (existCheck.rows.length > 0) {
                const productId = existCheck.rows[0].id;
                await db.query(
                    'UPDATE seller_products SET category=$1, price=$2, quantity=$3, unit=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5',
                    [row.category, row.price, row.quantity, row.unit, productId]
                );
            } else {
                await db.query(
                    'INSERT INTO seller_products (shop_id, seller_id, product_name, category, price, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [shopId, sellerId, row.product_name, row.category, row.price, row.quantity, row.unit]
                );
            }
        }

        fs.unlinkSync(filePath);
        return res.status(200).json({ message: 'Catalog uploaded and updated successfully!', count: validRows.length });
    } catch (err) {
        console.error('Error uploading catalog:', err);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return res.status(500).json({ error: 'Server error processing product catalog upload.' });
    }
};

exports.getSellerProducts = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(200).json({ products: [], total: 0, page: 1, totalPages: 0, categories: [] });
        }
        const shopId = shopResult.rows[0].id;

        const result = await db.query('SELECT * FROM seller_products WHERE shop_id = $1 ORDER BY id DESC', [shopId]);
        let allProducts = result.rows;

        // Auto generate products from previously sold items if catalog is empty
        if (allProducts.length === 0) {
            const ordersResult = await db.query(
                "SELECT modified_item_list, delivered_at, created_at FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
                [shopId]
            );
            const orderRows = ordersResult.rows;
            const uniqueItems = new Map();

            for (const order of orderRows) {
                if (!order.modified_item_list) continue;
                let items = [];
                try {
                    items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
                } catch (e) {
                    continue;
                }
                if (!Array.isArray(items)) continue;

                const soldDate = order.delivered_at || order.created_at || new Date();

                for (const item of items) {
                    const name = item.name || item.itemName;
                    if (!name) continue;
                    const key = name.trim().toLowerCase();
                    const price = parseFloat(item.price || 0);
                    const qty = parseFloat(item.quantity || 1);
                    const unit = item.unit || 'unit';

                    if (!uniqueItems.has(key)) {
                        uniqueItems.set(key, {
                            product_name: name.trim(),
                            category: item.category || 'General',
                            price: price,
                            quantity: qty,
                            unit: unit,
                            last_sold_date: soldDate
                        });
                    } else {
                        const existing = uniqueItems.get(key);
                        if (new Date(soldDate) > new Date(existing.last_sold_date)) {
                            existing.price = price;
                            existing.quantity = qty;
                            existing.unit = unit;
                            existing.last_sold_date = soldDate;
                        }
                    }
                }
            }

            for (const item of uniqueItems.values()) {
                await db.query(
                    'INSERT INTO seller_products (shop_id, seller_id, product_name, category, price, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [shopId, req.user.id, item.product_name, item.category, item.price, item.quantity, item.unit]
                );
            }

            if (uniqueItems.size > 0) {
                const refetch = await db.query('SELECT * FROM seller_products WHERE shop_id = $1 ORDER BY id DESC', [shopId]);
                allProducts = refetch.rows;
            }
        }

        // Calculate sales stats and enrich products
        allProducts = await calculateSalesStats(shopId, allProducts);

        const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

        const { search, category, page = 1, limit = 10 } = req.query;
        let filtered = [...allProducts];

        if (search) {
            const queryStr = search.toLowerCase().trim();
            filtered = filtered.filter(p => p.product_name.toLowerCase().includes(queryStr));
        }

        if (category && category !== 'All') {
            filtered = filtered.filter(p => p.category === category);
        }

        const total = filtered.length;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const totalPages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const paginated = filtered.slice(startIndex, startIndex + limitNum);

        return res.status(200).json({
            products: paginated,
            total,
            page: pageNum,
            totalPages,
            categories
        });
    } catch (err) {
        console.error('Error fetching seller products:', err);
        return res.status(500).json({ error: 'Server error retrieving products.' });
    }
};

exports.addSellerProduct = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    const { product_name, category, price, quantity, unit } = req.body;

    if (!product_name || !product_name.trim()) {
        return res.status(400).json({ error: 'Product Name is required.' });
    }
    if (!unit || !unit.trim()) {
        return res.status(400).json({ error: 'Unit is required.' });
    }
    const priceNum = parseFloat(price);
    const qtyNum = parseFloat(quantity);
    if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }
    if (isNaN(qtyNum) || qtyNum < 0) {
        return res.status(400).json({ error: 'Quantity must be a valid non-negative number.' });
    }

    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(400).json({ error: 'No shop profile found. Please configure your shop settings first.' });
        }
        const shopId = shopResult.rows[0].id;
        const sellerId = req.user.id;

        const existCheck = await db.query(
            'SELECT id FROM seller_products WHERE shop_id = $1 AND LOWER(product_name) = LOWER($2)',
            [shopId, product_name.trim()]
        );
        if (existCheck.rows.length > 0) {
            return res.status(400).json({ error: 'A product with this name already exists in your catalog.' });
        }

        const insertResult = await db.query(
            'INSERT INTO seller_products (shop_id, seller_id, product_name, category, price, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [shopId, sellerId, product_name.trim(), category || 'General', priceNum, qtyNum, unit.trim()]
        );

        return res.status(201).json({ message: 'Product added successfully!', product: insertResult.rows[0] });
    } catch (err) {
        console.error('Error adding product:', err);
        return res.status(500).json({ error: 'Server error adding product.' });
    }
};

exports.updateSellerProduct = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    const { id } = req.params;
    const { product_name, category, price, quantity, unit } = req.body;

    if (!product_name || !product_name.trim()) {
        return res.status(400).json({ error: 'Product Name is required.' });
    }
    if (!unit || !unit.trim()) {
        return res.status(400).json({ error: 'Unit is required.' });
    }
    const priceNum = parseFloat(price);
    const qtyNum = parseFloat(quantity);
    if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }
    if (isNaN(qtyNum) || qtyNum < 0) {
        return res.status(400).json({ error: 'Quantity must be a valid non-negative number.' });
    }

    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(400).json({ error: 'Shop not found.' });
        }
        const shopId = shopResult.rows[0].id;

        const existCheck = await db.query('SELECT id FROM seller_products WHERE id = $1 AND shop_id = $2', [id, shopId]);
        if (existCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or access denied.' });
        }

        const nameCheck = await db.query(
            'SELECT id FROM seller_products WHERE shop_id = $1 AND LOWER(product_name) = LOWER($2) AND id != $3',
            [shopId, product_name.trim(), id]
        );
        if (nameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Another product with this name already exists in your catalog.' });
        }

        const updateResult = await db.query(
            'UPDATE seller_products SET product_name = $1, category = $2, price = $3, quantity = $4, unit = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [product_name.trim(), category || 'General', priceNum, qtyNum, unit.trim(), id]
        );

        return res.status(200).json({ message: 'Product updated successfully!', product: updateResult.rows[0] });
    } catch (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ error: 'Server error updating product.' });
    }
};

exports.deleteSellerProduct = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    const { id } = req.params;

    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(400).json({ error: 'Shop not found.' });
        }
        const shopId = shopResult.rows[0].id;

        const deleteResult = await db.query(
            'DELETE FROM seller_products WHERE id = $1 AND shop_id = $2 RETURNING *',
            [id, shopId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or access denied.' });
        }

        return res.status(200).json({ message: 'Product deleted successfully!', product: deleteResult.rows[0] });
    } catch (err) {
        console.error('Error deleting product:', err);
        return res.status(500).json({ error: 'Server error deleting product.' });
    }
};

exports.getShopCatalog = async (req, res) => {
    const { shop_id } = req.params;

    try {
        const result = await db.query('SELECT * FROM seller_products WHERE shop_id = $1 ORDER BY product_name ASC', [shop_id]);
        
        const categories = [...new Set(result.rows.map(p => p.category).filter(Boolean))];

        return res.status(200).json({
            products: result.rows,
            categories
        });
    } catch (err) {
        console.error('Error fetching shop catalog for customer:', err);
        return res.status(500).json({ error: 'Server error loading store catalog.' });
    }
};

exports.getSalesAnalytics = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    try {
        const shopResult = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(400).json({ error: 'Shop not found.' });
        }
        const shopId = shopResult.rows[0].id;

        // Fetch all delivered orders
        const ordersResult = await db.query(
            "SELECT id, modified_item_list, delivered_at, created_at, amount FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
            [shopId]
        );
        const allDeliveredOrders = ordersResult.rows;

        // 1. Calculate Today's Summary
        const todayOrdersList = filterOrdersByDate(allDeliveredOrders, 'Today');
        let todayProductsSold = 0;
        let todayRevenue = 0;
        const todayOrdersCount = todayOrdersList.length;

        for (const order of todayOrdersList) {
            if (order.modified_item_list) {
                let items = [];
                try {
                    items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
                } catch (e) {}
                if (Array.isArray(items)) {
                    for (const item of items) {
                        todayProductsSold += parseFloat(item.quantity || 1);
                        todayRevenue += parseFloat(item.price || 0) * parseFloat(item.quantity || 1);
                    }
                }
            }
        }

        // 2. Filter orders for report based on query
        const { dateFilter, startDate, endDate } = req.query;
        const filteredOrders = filterOrdersByDate(allDeliveredOrders, dateFilter || 'Today', startDate, endDate);

        // 3. Aggregate product sales for report
        const productReportMap = new Map();

        for (const order of filteredOrders) {
            if (!order.modified_item_list) continue;
            let items = [];
            try {
                items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
            } catch (e) {
                continue;
            }
            if (!Array.isArray(items)) continue;

            const soldDate = order.delivered_at || order.created_at || new Date();

            for (const item of items) {
                const name = item.name || item.itemName;
                if (!name) continue;
                const key = name.trim().toLowerCase();
                const price = parseFloat(item.price || 0);
                const qty = parseFloat(item.quantity || 1);
                const unit = item.unit || 'unit';
                const revenue = price * qty;

                if (!productReportMap.has(key)) {
                    productReportMap.set(key, {
                        product_name: name.trim(),
                        unit_price: price,
                        quantity_sold: qty,
                        unit: unit,
                        revenue: revenue,
                        order_count: 1,
                        last_sold_date: soldDate
                    });
                } else {
                    const rep = productReportMap.get(key);
                    rep.quantity_sold += qty;
                    rep.revenue += revenue;
                    rep.order_count += 1;
                    if (new Date(soldDate) > new Date(rep.last_sold_date)) {
                        rep.unit_price = price;
                        rep.last_sold_date = soldDate;
                    }
                }
            }
        }

        const reportRows = Array.from(productReportMap.values());
        reportRows.sort((a, b) => b.revenue - a.revenue);

        return res.status(200).json({
            todaySummary: {
                todayProductsSold,
                todayRevenue,
                todayOrders: todayOrdersCount
            },
            report: reportRows
        });
    } catch (err) {
        console.error('Error fetching sales analytics:', err);
        return res.status(500).json({ error: 'Server error fetching sales analytics.' });
    }
};

exports.downloadExcelReport = async (req, res) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Access denied. Sellers only.' });
    }

    try {
        const shopResult = await db.query('SELECT id, shop_name FROM shops WHERE owner_id = $1', [req.user.id]);
        if (shopResult.rows.length === 0) {
            return res.status(400).json({ error: 'Shop not found.' });
        }
        const shopId = shopResult.rows[0].id;
        const shopName = shopResult.rows[0].shop_name;

        // Fetch all delivered orders
        const ordersResult = await db.query(
            "SELECT id, modified_item_list, delivered_at, created_at FROM orders WHERE shop_id = $1 AND order_status = 'Delivered'",
            [shopId]
        );
        const allDeliveredOrders = ordersResult.rows;

        // Filter orders based on query
        const { dateFilter, startDate, endDate } = req.query;
        const filteredOrders = filterOrdersByDate(allDeliveredOrders, dateFilter || 'Today', startDate, endDate);

        // Aggregate product sales
        const productReportMap = new Map();

        for (const order of filteredOrders) {
            if (!order.modified_item_list) continue;
            let items = [];
            try {
                items = typeof order.modified_item_list === 'string' ? JSON.parse(order.modified_item_list) : order.modified_item_list;
            } catch (e) {
                continue;
            }
            if (!Array.isArray(items)) continue;

            const soldDate = order.delivered_at || order.created_at || new Date();

            for (const item of items) {
                const name = item.name || item.itemName;
                if (!name) continue;
                const key = name.trim().toLowerCase();
                const price = parseFloat(item.price || 0);
                const qty = parseFloat(item.quantity || 1);
                const unit = item.unit || 'unit';
                const revenue = price * qty;

                if (!productReportMap.has(key)) {
                    productReportMap.set(key, {
                        product_name: name.trim(),
                        unit_price: price,
                        quantity_sold: qty,
                        unit: unit,
                        revenue: revenue,
                        order_count: 1,
                        last_sold_date: soldDate
                    });
                } else {
                    const rep = productReportMap.get(key);
                    rep.quantity_sold += qty;
                    rep.revenue += revenue;
                    rep.order_count += 1;
                    if (new Date(soldDate) > new Date(rep.last_sold_date)) {
                        rep.unit_price = price;
                        rep.last_sold_date = soldDate;
                    }
                }
            }
        }

        const reportRows = Array.from(productReportMap.values());
        reportRows.sort((a, b) => b.revenue - a.revenue);

        // Calculate footer metrics
        const totalProductsSold = reportRows.reduce((sum, r) => sum + r.quantity_sold, 0);
        const totalOrders = filteredOrders.length;
        const totalRevenue = reportRows.reduce((sum, r) => sum + r.revenue, 0);

        // Format for excel sheet
        // Columns: Product Name, Price per Unit, Quantity Sold, Unit, Revenue, Order Count, Last Sold Date
        const excelRows = reportRows.map(row => ({
            'Product Name': row.product_name,
            'Price per Unit (₹)': row.unit_price,
            'Quantity Sold': row.quantity_sold,
            'Unit': row.unit,
            'Revenue (₹)': row.revenue,
            'Order Count': row.order_count,
            'Last Sold Date': row.last_sold_date ? new Date(row.last_sold_date).toLocaleDateString() : 'N/A'
        }));

        // Excel Footer Summary
        excelRows.push({}); // empty line
        excelRows.push({ 'Product Name': `Total Products Sold: ${totalProductsSold}` });
        excelRows.push({ 'Product Name': `Total Orders: ${totalOrders}` });
        excelRows.push({ 'Product Name': `Total Revenue: ₹${totalRevenue}` });
        excelRows.push({ 'Product Name': `Generated On: ${new Date().toLocaleString()}` });
        excelRows.push({ 'Product Name': `Shop Name: ${shopName}` });
        excelRows.push({ 'Product Name': `Shop ID: ${shopId}` });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelRows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${dateFilter || 'Report'}.xlsx`);
        res.send(buffer);

    } catch (err) {
        console.error('Error downloading Excel report:', err);
        return res.status(500).json({ error: 'Server error downloading report.' });
    }
};
