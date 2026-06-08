require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key:", apiKey);

const postData = JSON.stringify({
  contents: [
    {
      role: 'user',
      parts: [{ text: "hi" }]
    }
  ],
  tools: [
    {
      googleSearch: {}
    }
  ]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const reqApi = https.request(options, (resApi) => {
  let data = '';
  resApi.on('data', (chunk) => {
    data += chunk;
  });
  resApi.on('end', () => {
    console.log("Status Code:", resApi.statusCode);
    console.log("Response:", data);
  });
});

reqApi.on('error', (e) => {
  console.error("Error:", e);
});

reqApi.write(postData);
reqApi.end();
