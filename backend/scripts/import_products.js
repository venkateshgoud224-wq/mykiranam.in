const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Since we are not using a third-party csv-parser library, we will use a regex
// to properly split CSV lines considering commas inside quotes.
function parseCSVLine(line) {
    const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return line.split(re).map(val => val.replace(/^"|"$/g, '').trim());
}

async function importData() {
    const csvFilePath = path.join(__dirname, 'data', 'products.csv');
    
    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ File not found at: ${csvFilePath}`);
        console.error('Please move your exported CSV (e.g., Grocery_data.csv) to backend/scripts/data/products.csv');
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env. Ensure PostgreSQL is configured.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('⚡ Connecting to database...');
    
    // Create tables if they don't exist
    const schemaPath = path.join(__dirname, '../models/phase6_migrations.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('✅ Phase 6 tables created or verified.');
    }

    const data = fs.readFileSync(csvFilePath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim().length > 0);
    
    // Assuming columns from Notebook:
    // Product Name,Category,Quantity,Original Price (Rs.),Discount,Discounted Price (Rs.)
    const headers = parseCSVLine(lines[0]);
    console.log(`Found headers: ${headers.join(', ')}`);
    console.log(`Starting import of ${lines.length - 1} products...`);

    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < 4) continue;

        const productName = row[0];
        const category = row[1];
        const quantity = row[2];
        const originalPrice = parseFloat(row[3]) || 0;
        const discountedPrice = parseFloat(row[5]) || originalPrice;

        if (!productName || originalPrice === 0) continue;

        try {
            await pool.query(
                `INSERT INTO products_dictionary (product_name, category, quantity_desc, market_price, discounted_price) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [productName, category, quantity, originalPrice, discountedPrice]
            );
            importedCount++;
            
            if (importedCount % 500 === 0) {
                console.log(`Imported ${importedCount} items...`);
            }
        } catch (err) {
            console.error(`Error importing ${productName}:`, err.message);
        }
    }

    console.log(`🎉 Import complete! Successfully inserted ${importedCount} items into products_dictionary.`);
    process.exit(0);
}

importData();
