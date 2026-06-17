const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('API Key:', process.env.GEMINI_API_KEY ? 'EXISTS' : 'UNDEFINED');
console.log('Value:', process.env.GEMINI_API_KEY);
console.log('PHONEPE_CLIENT_ID:', process.env.PHONEPE_CLIENT_ID);
console.log('PHONEPE_CLIENT_SECRET:', process.env.PHONEPE_CLIENT_SECRET);

