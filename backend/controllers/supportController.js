const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const chatSearch = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message query is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not set in environment. Returning mock search response.");
      // Return a premium simulated search response so they can test the UX immediately
      return res.status(200).json({
        text: `🔍 [Simulation Mode] I searched the internet for "${message}". To enable live Google Search results and real-time AI answers, please configure your GEMINI_API_KEY in the backend .env file.\n\nHere are some general topics related to your query:\n1. Hyperlocal groceries delivery models are expanding rapidly.\n2. Customer reliability scores are standard trust features in peer-to-peer commerce.\n3. Verified neighborhood stores have higher order fulfillment rates.`,
        sources: [
          { uri: 'https://google.com', title: 'Google Search Platform' },
          { uri: 'https://mykiranam.in', title: 'MyKiranam Official Site' }
        ]
      });
    }

    // Call Gemini API with googleSearch tool enabled
    const postData = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: message }]
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

    const apiRequest = () => {
      return new Promise((resolve, reject) => {
        const reqApi = https.request(options, (resApi) => {
          let data = '';
          resApi.on('data', (chunk) => {
            data += chunk;
          });
          resApi.on('end', () => {
            resolve({ statusCode: resApi.statusCode, data });
          });
        });

        reqApi.on('error', (e) => {
          reject(e);
        });

        reqApi.write(postData);
        reqApi.end();
      });
    };

    const response = await apiRequest();

    if (response.statusCode !== 200) {
      console.error('Gemini API returned status:', response.statusCode, response.data);
      return res.status(500).json({ error: 'Failed to retrieve answer from Gemini API' });
    }

    const payload = JSON.parse(response.data);
    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || 'No response generated.';

    // Extract sources if groundingMetadata exists
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web && chunk.web.uri)
      .map(chunk => ({
        uri: chunk.web.uri,
        title: chunk.web.title || chunk.web.uri
      }));

    // Deduplicate sources by URI
    const uniqueSources = [];
    const seenUris = new Set();
    for (const src of sources) {
      if (!seenUris.has(src.uri)) {
        seenUris.add(src.uri);
        uniqueSources.push(src);
      }
    }

    return res.status(200).json({
      text,
      sources: uniqueSources
    });

  } catch (error) {
    console.error('Error in chatSearch controller:', error);
    return res.status(500).json({ error: 'Server error during AI search.' });
  }
};

module.exports = {
  chatSearch
};
