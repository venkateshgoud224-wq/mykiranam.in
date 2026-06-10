const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const db = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const AI_SYSTEM_PROMPT = `
You are the "MyKiranam AI Support Assistant". 
Your goal is to automatically resolve 80-90% of support requests, collect evidence for disputes, and escalate complex cases.
You NEVER modify financial records, refund directly, or suspend accounts automatically.

### Categories
1. Order Related: Order Status, Order Delayed, Seller Not Responding, Order Not Ready.
2. Product Related: Wrong Product, Missing Product, Poor Quality Product, Expired Product, Price Mismatch.
3. Payment Related: Payment Verification, UTR Verification, Payment Not Reflected, Refund Questions.
4. Pickup Related: Cannot Find Store, Store Closed, Pickup Issues, OTP Problems.
5. Account Related: Login Problems, Trust Score, Ratings.

### Investigation Steps
Step 1. Understand customer issue.
Step 2. Identify category.
Step 3. Collect Evidence: If it's a dispute (Wrong Product, Missing Product, Expired Product, Price Mismatch), ask the user for the Order Number and to upload a Photo via the 'Raise Ticket' tab.
Step 4. Decide: If FAQ/simple tracking, auto-resolve it. If dispute/serious, use escalate_dispute tool.

### Auto-Resolvable Tickets
Fully answer and resolve FAQ questions (How to place order, pickup, cancellation policy, security deposit, etc.) and Navigation help.

### Escalation Rules (escalate_dispute tool)
Escalate the following issues to Admin:
- Fraud Claims (High Priority)
- Legal Issues/Threats (High Priority)
- Account Suspension Appeals (High Priority)
- High Value Disputes (High Priority)
- Expired Products (High Priority)
- Price Mismatch (High Priority)
- Payment Issues (High Priority)
- Wrong Product (Medium Priority)
- Missing Product (Medium Priority)

Your Recommendations must be one of: [Manual Investigation, Refund Review, Seller Warning, Customer Warning, Trust Score Reduction, Ticket Closure].
`;

const supportTools = {
  functionDeclarations: [
    {
      name: "get_user_context",
      description: "Get the customer's open orders, trust score, and open tickets to provide context for the investigation.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "escalate_dispute",
      description: "Escalate a serious issue to Admins. Call this when a dispute (Wrong product, expired, refund, fraud) is identified.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "integer",
            description: "The ID of the ticket/complaint (if the user already raised one). If they haven't raised one yet, pass 0."
          },
          category: {
            type: "string",
            description: "The category of the issue (e.g. 'Wrong Product', 'Expired Product', 'Fraud')."
          },
          priority: {
            type: "string",
            description: "Priority level: 'Low', 'Medium', or 'High'."
          },
          recommendation: {
            type: "string",
            description: "AI's recommendation: e.g., 'Manual Investigation', 'Refund Review', 'Seller Warning'."
          },
          risk_score: {
            type: "integer",
            description: "AI's estimated risk score from 1-100."
          }
        },
        required: ["ticket_id", "category", "priority", "recommendation", "risk_score"]
      }
    },
    {
      name: "auto_resolve_faq",
      description: "Call this tool if the customer's issue was just a general question or FAQ that you successfully answered without needing a ticket.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The topic that was resolved (e.g., 'Cancellation Policy')."
          }
        },
        required: ["topic"]
      }
    }
  ]
};

const chatSearch = async (req, res) => {
  try {
    const { message } = req.body;
    const customer_id = req.user?.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message query is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not set. Returning mock search response.");
      return res.status(200).json({
        text: `🔍 [Simulation Mode] Received: "${message}". Please configure GEMINI_API_KEY.`,
        sources: []
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [supportTools],
      systemInstruction: AI_SYSTEM_PROMPT
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(message);
    let response = result.response;

    while (response.functionCalls && response.functionCalls().length > 0) {
      const call = response.functionCalls()[0];
      let functionResult = {};

      if (call.name === "get_user_context") {
        if (!customer_id) {
           functionResult = { error: "User not authenticated." };
        } else {
           const trustCheck = await db.query(`SELECT trust_score, cancellations FROM customer_trust WHERE customer_id = $1`, [customer_id]);
           const orders = await db.query(`SELECT id, order_status, shop_id FROM orders WHERE customer_id = $1 AND order_status NOT IN ('Completed', 'Delivered', 'Cancelled')`, [customer_id]);
           const complaints = await db.query(`SELECT id, issue_type, status FROM complaints WHERE customer_id = $1 AND status != 'Closed'`, [customer_id]);
           
           functionResult = { 
             trust_info: trustCheck.rows[0] || { trust_score: 100 },
             open_orders: orders.rows,
             open_complaints: complaints.rows
           };
        }
      } 
      else if (call.name === "escalate_dispute") {
        const { ticket_id, category, priority, recommendation, risk_score } = call.args;
        if (!customer_id) {
           functionResult = { error: "User not authenticated." };
        } else {
           if (ticket_id === 0) {
             functionResult = { success: false, message: "Tell the user to please go to the 'Raise Ticket' tab to upload evidence and create a ticket first. We need a ticket ID to escalate." };
           } else {
             // Escalate the ticket
             const check = await db.query(`SELECT id FROM complaints WHERE id = $1 AND customer_id = $2`, [ticket_id, customer_id]);
             if (check.rows.length === 0) {
                functionResult = { error: "Ticket not found or does not belong to user." };
             } else {
                await db.query(
                  `UPDATE complaints SET status = 'Escalated', ai_priority = $1, ai_recommendation = $2, ai_risk_score = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
                  [priority, recommendation, risk_score, ticket_id]
                );
                functionResult = { success: true, message: `Ticket ${ticket_id} escalated to Admin. Priority: ${priority}.` };
             }
           }
        }
      }
      else if (call.name === "auto_resolve_faq") {
        const { topic } = call.args;
        // In a real system, you might log this to a stats table.
        functionResult = { success: true, message: `Logged FAQ resolution for ${topic}.` };
      }

      result = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResult
        }
      }]);
      response = result.response;
    }

    const text = response.text();

    return res.status(200).json({
      text: text || 'No response generated.',
      sources: [] 
    });

  } catch (error) {
    console.error('Error in chatSearch controller:', error);
    return res.status(500).json({ error: 'Server error during AI search.' });
  }
};

module.exports = {
  chatSearch
};
