import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'

// Global fetch wrapper to gracefully handle HTML error pages (e.g., 502 Bad Gateway)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Intercept the json() method to catch HTML responses
  const originalJson = response.json.bind(response);
  response.json = async () => {
    try {
      const text = await response.clone().text();
      // If the response is HTML (starts with <)
      if (text && text.trim().startsWith('<')) {
        console.error("API returned HTML instead of JSON. URL:", args[0]);
        throw new Error(`Server returned an invalid HTML response (Status: ${response.status}). The server might be down or experiencing issues.`);
      }
      return JSON.parse(text);
    } catch (err) {
      if (err.message.includes("Unexpected token '<'") || err.name === 'SyntaxError') {
        throw new Error("Server is temporarily down or returned an invalid format. Please try again later.");
      }
      throw err;
    }
  };
  
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)
