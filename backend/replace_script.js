const fs = require('fs');
const file = 'c:/Users/Navi/Downloads/mykiranam.in-main/mykiranam.in-main/backend/controllers/shopController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, verified, verification_status, verified_by_admin, verified_by_seller, verification_date) VALUES ($1, $2, $3, $4, $5, true, \\'Verified\\', true, true, CURRENT_TIMESTAMP)'";
const replaceStr = "'INSERT INTO shops (owner_id, shop_name, address, latitude, longitude, verified, verification_status, verified_by_admin, verified_by_seller, verification_date) VALUES ($1, $2, $3, $4, $5, false, \\'Pending\\', false, false, NULL)'";

content = content.replace(targetStr, replaceStr);
content = content.replace(targetStr, replaceStr); // Run twice for both occurrences

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated shopController.js');
