import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, Search, Send, HelpCircle, ArrowRight, X, Check, 
  ChevronDown, ChevronUp, AlertCircle, FileText, Upload, Trash2, Plus, History, LifeBuoy
} from 'lucide-react';

// Knowledge Base Definition
const KNOWLEDGE_BASE = [
  {
    id: 'what_is_mykiranam',
    title: 'What is MyKiranam?',
    category: 'General',
    content: 'MyKiranam connects customers with nearby local kirana stores. Through the platform, customers can submit grocery lists, receive transparent price quotations, physically verify products at the store before making any payment, and pick up orders at their convenience during the day.',
    keywords: ['what is mykiranam', 'about mykiranam', 'how does it work', 'explain mykiranam', 'what does it do', 'introduction']
  },
  {
    id: 'how_to_order',
    title: 'How To Place An Order',
    category: 'Ordering',
    content: 'Follow these step-by-step instructions to place your order:\n\nStep 1: Login to your account using mobile OTP.\nStep 2: Select a nearby kirana store from the list of shops.\nStep 3: Enter grocery items manually or type your grocery list (Chitti).\nStep 4: Submit your order.\nStep 5: The seller reviews your order and sends back a price quotation.\nStep 6: Review the quotation sent by the seller.\nStep 7: Approve the quotation if you are satisfied.\nStep 8: The seller prepares and packs your order.\nStep 9: Visit the shop.\nStep 10: Verify the products (quality, quantity, brand, and expiry date).\nStep 11: Pay the seller directly.\nStep 12: Provide the completion OTP to the seller.\nStep 13: Your order is completed!',
    keywords: ['place order', 'how to place an order', 'how to order', 'ordering process', 'order steps', 'buy groceries', 'chitti']
  },
  {
    id: 'how_pickup_works',
    title: 'How Pickup Works',
    category: 'Pickup',
    content: 'The manual pickup process is simple and secure:\n1. Place your order and wait for the seller to prepare it.\n2. Once ready, visit the store at any time during the day.\n3. Before paying, verify the physical products, quantities, brands, and expiry dates at the counter.\n4. Pay the seller (via Cash or UPI).\n5. Provide the OTP received on your mobile to the seller.\n6. The seller enters the OTP, completing the order.',
    keywords: ['how pickup works', 'pickup process', 'collect order', 'manual pickup', 'visit shop', 'store pickup', 'otp handoff']
  },
  {
    id: 'why_verify',
    title: 'Why Verify Before Payment?',
    category: 'Quality',
    content: 'Unlike standard delivery apps, MyKiranam allows you to fully inspect products before paying. This enables you to verify quality, quantity, brand, and expiry dates personally. There are no refund waiting times or replacement delays because you can reject incorrect or damaged items at the counter before completing the transaction.',
    keywords: ['why verify', 'verify before payment', 'inspection', 'inspect products', 'no refund waiting', 'expiry date', 'check quality']
  },
  {
    id: 'cancellation_policy',
    title: 'Cancellation Policy & Stage Rules',
    category: 'Policies',
    content: 'Customers can cancel orders depending on the stage:\n1. Before Bill is Updated: Unlimited cancellations are allowed without warnings or reliability score penalties.\n2. After Bill is Updated / After Pickup: These are serious warnings and count directly towards your account limits.\n3. Quality dissatisfaction at store: If you visit the store and find product issues, you can cancel at the counter. To waive the warning, raise a support ticket. Admin will verify if you visited, and if the seller approves, the cancellation is not counted.',
    keywords: ['cancellation policy', 'cancel order', 'cancellation rules', 'refund rules for cancellation', 'can i cancel', 'cancel order after pickup', 'cancel before bill updated', 'cancel after bill updated']
  },
  {
    id: 'warning_systems_cancellation_limits',
    title: 'Warning System & Cancellation Limits',
    category: 'Policies',
    content: 'MyKiranam enforces a balanced trust and warning system to protect local sellers from unnecessary cancellations:\n\n1. Reliability/Trust Score: Every customer cancellation after the bill is updated reduces your reliability score by 5%.\n2. Cancellation Warning Limit (Phase 7A):\n   - 1 to 2 cancellations: Reliability score deduction only.\n   - 3 cancellations: A formal warning ("Warning: Frequent Cancellations") is issued.\n   - 4 cancellations: Temporary account suspension for 7 days and active order limit restricted to 2.\n   - Security Deposit: After the 3rd cancellation (3 or more cancellations), customers must pay a refundable ₹50 security deposit online via the PhonePe payment gateway to place or confirm "Pay During Pickup" orders. This deposit is credited directly to the Kiranam platform account.\n3. Cancellation Stages:\n   - Before Bill is Updated: Unlimited cancellations (no warning, no deduction).\n   - After Bill is Updated / After Pickup: Serious warning.\n4. Dissatisfaction at Store: If you cancel due to quality issues at the counter, raise a support ticket. Upon verification, the warning will not be counted.',
    keywords: ['warning system', 'warning systems', 'warnings', 'account restricted', 'suspension', 'excessive cancellations', 'how many times can i cancel', 'cancellation limit', 'cancel order after pickup', 'cancel after pickup', 'suspended']
  },
  {
    id: 'no_pickup_policy',
    title: 'No Pickup Policy',
    category: 'Policies',
    content: 'If a customer repeatedly approves quotations and does not collect their ready order from the store:\n- A warning is issued.\n- The customer trust score is reduced.\n- Future orders may require a refundable security deposit or upfront wallet commitment to protect sellers.',
    keywords: ['no pickup', 'did not collect', 'no show', 'forget order', 'pickup penalty', 'no show count']
  },
  {
    id: 'security_deposit_policy',
    title: 'Security Deposit Policy',
    category: 'Policies',
    content: 'Security deposits help protect local sellers from repeated no-pickup behavior. Customers with repeated violations or low trust scores may be asked to maintain a refundable security deposit or pay a ₹50 wallet-based security deposit prior to confirming their orders.',
    keywords: ['security deposit', 'refundable deposit', 'wallet deposit', '50 rupees', 'deposit policy', 'penalty deposit']
  },
  {
    id: 'quality_complaints',
    title: 'Product Quality Complaints',
    category: 'Quality',
    content: 'If products are expired, damaged, incorrect, or different from what was ordered, you should reject them at the store before making payment. If a quality issue is discovered post-purchase or a payment dispute arises, please raise a support ticket immediately. MyKiranam will investigate the complaint and take necessary action against violating stores.',
    keywords: ['product quality', 'quality complaints', 'damaged items', 'expired products', 'wrong item', 'raise complaint', 'disputes']
  },
  {
    id: 'seller_rules',
    title: 'Seller Rules & Policies',
    category: 'Policies',
    content: 'Sellers on MyKiranam must provide accurate quotations, supply the correct brands and quantities, maintain high product quality, and avoid misleading pricing. Repeated violations will reduce the seller trust score, trigger warnings, and can lead to store suspension.',
    keywords: ['seller rules', 'rules for shops', 'seller policies', 'misleading price', 'store guidelines', 'seller violations']
  },
  {
    id: 'customer_rules',
    title: 'Customer Rules & Trust Score',
    category: 'Policies',
    content: 'Customers should place genuine orders, avoid repeated cancellations, collect ready orders promptly, and provide accurate details. Violations reduce your reliability/trust score, trigger system warnings, or restrict account activity.',
    keywords: ['customer rules', 'buyer conduct', 'rules for customers', 'trust score reduction', 'reliability score']
  },
  {
    id: 'refund_policy',
    title: 'Refund Policy',
    category: 'Policies',
    content: 'Most issues are resolved before payment because customers verify products at pickup. If you made an online pre-payment and decide to cancel because you are not satisfied with the products upon visiting the store, you MUST collect the refund amount directly from the seller in cash or direct transfer at the store counter. Tracing and refunding transactions offline through support tickets raised post-cancellation is extremely difficult, so we strictly instruct users to collect refunds from the seller directly at the store. Raise a support ticket only to waive the cancellation warning, not for monetary refunds. For automated online cancellations (e.g., seller cancels before acceptance), refunds are processed to your original payment source within 3-5 business days.',
    keywords: ['refund policy', 'refunds', 'get money back', 'payment error', 'refund status', 'transaction issue', 'pre-paid refund', 'collect refund from seller']
  },
  {
    id: 'vs_delivery_apps',
    title: 'MyKiranam vs Delivery Apps',
    category: 'Comparison',
    content: 'Compared to delivery apps, MyKiranam offers:\n- No delivery charges or surge fees.\n- No long waiting times; pick up on your own schedule.\n- Verify quality, brand, and expiry dates before paying.\n- Direct support for local stores.\n- No refund delays since disputes are resolved before transaction.',
    keywords: ['delivery apps', 'vs delivery', 'how is mykiranam different', 'delivery comparison', 'delivery charges', 'surge pricing']
  },
  {
    id: 'vs_supermarkets',
    title: 'MyKiranam vs Supermarkets',
    category: 'Comparison',
    content: 'Compared to supermarkets, MyKiranam provides:\n- No long checkout or billing queues.\n- No parking hassles.\n- No impulse shopping traps (snacks placed near checkout to entice you).\n- No surprise bills; know the exact quotation before you visit.\n- A faster, streamlined shopping experience.',
    keywords: ['supermarkets', 'vs supermarkets', 'comparison supermarket', 'no queues', 'billing line', 'impulse buying']
  },
  {
    id: 'main_benefits',
    title: 'Main Benefits of MyKiranam',
    category: 'General',
    content: 'Key benefits of MyKiranam:\n1. Buy only what you need (no forced bulk packaging).\n2. Save valuable time (ready-for-pickup orders).\n3. Save money (no convenience, platform, or delivery charges).\n4. Verify before payment (inspect goods at checkout).\n5. Pick up anytime during shop hours.\n6. Support and empower local kirana stores.',
    keywords: ['benefits', 'advantages', 'why use mykiranam', 'save time', 'save money', 'support local']
  },
  {
    id: 'ratings_reviews',
    title: 'Ratings and Reviews',
    category: 'General',
    content: 'Ratings promote trust on MyKiranam. Customers can rate shops based on pricing accuracy, item quality, and packaging. Sellers also rate customers based on pickup reliability. Higher ratings lead to priority queue processing and earlier order acceptances.',
    keywords: ['ratings', 'reviews', 'profile score', 'stars', 'shop feedback', 'customer rating']
  },
  {
    id: 'otp_verification',
    title: 'OTP Verification',
    category: 'Ordering',
    content: 'OTP verification secure the handover process. When you pick up your order and pay the seller, you must share the OTP sent to your registered mobile number. The seller enters this OTP to confirm the order completion. Never share this OTP before inspecting and paying for your items!',
    keywords: ['otp verification', 'completion code', 'security code', 'verify order', 'handover otp', 'received otp']
  }
];

const QUICK_QUESTIONS = [
  'How do I place an order?',
  'How does pickup work?',
  'What if I cancel my order?',
  'How is MyKiranam different?',
  'What if I receive poor quality products?'
];

const FOLLOW_UP_QUESTIONS = [
  'How do I place an order?',
  'How does pickup work?',
  'Cancellation policy',
  'Refund policy',
  'Contact support'
];

const SupportAssistant = () => {
  const { token, apiUrl, user } = useAuth();
  
  // Tab states: 'chat' or 'articles' or 'ticket'
  const [activeTab, setActiveTab] = useState('chat');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Chatbot states
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  
  // Support ticket form states
  const [issueType, setIssueType] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [ticketSubmitLoading, setTicketSubmitLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ticketError, setTicketError] = useState(null);

  const messagesEndRef = useRef(null);

  // Initialize and load chat sessions
  useEffect(() => {
    const savedHistory = localStorage.getItem('kirana_support_chat_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed);
        if (parsed.length > 0) {
          // Load most recent session
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        } else {
          startNewChat();
        }
      } catch (e) {
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, []);

  // Fetch customer orders when raising a ticket
  useEffect(() => {
    if (activeTab === 'ticket' && token) {
      setLoadingOrders(true);
      fetch(`${apiUrl}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoadingOrders(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setLoadingOrders(false);
      });
    }
  }, [activeTab, token, apiUrl]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const matched = KNOWLEDGE_BASE.filter(article => {
      const titleMatch = article.title.toLowerCase().includes(query);
      const categoryMatch = article.category.toLowerCase().includes(query);
      const contentMatch = article.content.toLowerCase().includes(query);
      const keywordMatch = article.keywords.some(kw => kw.includes(query) || query.includes(kw));
      return titleMatch || categoryMatch || contentMatch || keywordMatch;
    });
    setSearchResults(matched);
  }, [searchQuery]);

  // Helper to start fresh session
  const startNewChat = () => {
    const sessionId = Date.now().toString();
    const welcomeMsg = {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Welcome to MyKiranam Support. Ask me anything about ordering, payments, pickup, cancellations, refunds, seller policies, ratings, and platform rules.",
      timestamp: new Date().toISOString()
    };
    const newSession = {
      id: sessionId,
      title: 'Chat Session ' + new Date().toLocaleDateString(),
      timestamp: new Date().toISOString(),
      messages: [welcomeMsg]
    };

    setMessages([welcomeMsg]);
    setCurrentSessionId(sessionId);

    // Save to state and localStorage
    const updatedHistory = [newSession, ...chatHistory.filter(h => h.id !== sessionId)];
    setChatHistory(updatedHistory);
    localStorage.setItem('kirana_support_chat_history', JSON.stringify(updatedHistory));
  };

  // Switch chat session
  const selectSession = (id) => {
    const session = chatHistory.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
    }
  };

  // Delete chat session
  const deleteSession = (e, id) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(s => s.id !== id);
    setChatHistory(updatedHistory);
    localStorage.setItem('kirana_support_chat_history', JSON.stringify(updatedHistory));
    
    if (currentSessionId === id) {
      if (updatedHistory.length > 0) {
        setCurrentSessionId(updatedHistory[0].id);
        setMessages(updatedHistory[0].messages);
      } else {
        startNewChat();
      }
    }
  };

  // Save current messages to current session in localStorage
  const saveCurrentMessages = (updatedMsgs) => {
    const updatedHistory = chatHistory.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          timestamp: new Date().toISOString(),
          messages: updatedMsgs
        };
      }
      return session;
    });
    setChatHistory(updatedHistory);
    localStorage.setItem('kirana_support_chat_history', JSON.stringify(updatedHistory));
  };

  // Typo correction and text normalization
  const normalizeAndCorrectText = (text) => {
    let clean = text.toLowerCase();
    
    const replacements = {
      'cacel': 'cancel',
      'quetiosn': 'question',
      'quetion': 'question',
      'boat': 'bot',
      'warning systems': 'warning system',
      'may time': 'many times',
      'may times': 'many times',
      'how may': 'how many',
      'pick up': 'pickup',
      'picup': 'pickup',
      'refunds': 'refund',
      'cancellations': 'cancel',
      'cancellation': 'cancel'
    };
    
    Object.entries(replacements).forEach(([typo, correction]) => {
      const regex = new RegExp(`\\b${typo}\\b`, 'g');
      clean = clean.replace(regex, correction);
    });
    
    return clean.replace(/[?.,!/]/g, '').trim();
  };

  // Smart AI query matcher and response generator
  const matchQuestion = (rawText) => {
    const cleanText = normalizeAndCorrectText(rawText);

    // Greetings & Intro intent
    if (cleanText === 'hi' || cleanText === 'hello' || cleanText === 'hey' || cleanText === 'yo' || cleanText.startsWith('hi ') || cleanText.startsWith('hello ') || cleanText.startsWith('hey ') || cleanText.includes('who are you') || cleanText.includes('who is this')) {
      return {
        text: "Hello! I am your MyKiranam Support Assistant 🤖. I am here to help you navigate our platform guidelines, ordering flows, and trust rules.\n\nAsk me anything like:\n- How do I place an order?\n- How does the warning system work?\n- What if I cancel an order after pickup?\n- Why verify before payment?\n\nHow can I help you today?"
      };
    }
    
    // Check for combined cancellation limit, warning systems, or after-pickup cancellation questions
    const mentionsWarning = cleanText.includes('warning') || cleanText.includes('suspension') || cleanText.includes('suspend') || cleanText.includes('restrict') || cleanText.includes('limit') || cleanText.includes('chance') || cleanText.includes('trust score') || cleanText.includes('reliability');
    const mentionsCancel = cleanText.includes('cancel') || cleanText.includes('cancellation');
    const mentionsPickup = cleanText.includes('pickup') || cleanText.includes('pick up') || cleanText.includes('after pickup');

    if (mentionsCancel && (mentionsWarning || mentionsPickup)) {
      let response = "Based on MyKiranam guidelines:\n\n";
      let matchedId = 'cancellation_policy';
      
      if (mentionsWarning || cleanText.includes('warning')) {
        response += "⚠️ Warning & Suspension System (Phase 7A):\n";
        response += "- Reliability Score: Each cancelled order (after the bill is updated) reduces your customer trust/reliability score by 5%.\n";
        response += "- Warning Limit: You can cancel up to 2 times without restrictions. On the 3rd cancellation, a formal warning is issued.\n";
        response += "- Suspension: On the 4th cancellation, your account will be temporarily suspended for 7 days and restricted to a maximum of 2 active orders.\n";
        response += "- Security Deposit: After the 3rd cancellation (3 or more cancellations), a refundable ₹50 security deposit online via PhonePe is required to place or confirm 'Pay During Pickup' orders. This deposit is credited to the Kiranam linked account.\n\n";
        response += "🔔 Cancellation Stage Rules:\n";
        response += "- Before Bill is Updated: Unlimited cancellations allowed (free/no score impact).\n";
        response += "- After Bill is Updated: Serious warning counts toward limits.\n";
        response += "- Unsatisfied at Store: If you visit the store and cancel due to dissatisfaction, raise a support ticket. Upon admin/seller verification, the cancellation warning is waived and not counted.\n\n";
      }
      
      if (mentionsPickup || cleanText.includes('after pickup')) {
        response += "📦 Cancellation After Pickup:\n";
        response += "- You cannot cancel an order after it has been picked up (once the OTP is verified and status is marked 'Delivered').\n";
        response += "- Inspect Before Paying: Always verify the brand, quantities, quality, and expiry dates of items at the store counter before paying the seller and sharing the completion OTP.\n";
        response += "- Disputes: If you discover a quality or billing issue after leaving the shop, please raise a support ticket immediately. Our team will review the issue and initiate refunds within 3-5 business days if verified.\n";
        matchedId = 'cancellation_policy';
      }
      
      return {
        text: response.trim(),
        articleId: matchedId
      };
    }

    // Exact maps checks (supporting spell-corrected variations)
    if (cleanText.includes('how do i place') || cleanText.includes('how to place') || cleanText.includes('place an order') || cleanText.includes('how to order')) {
      const art = KNOWLEDGE_BASE.find(a => a.id === 'how_to_order');
      return { text: art.content, articleId: art.id };
    }
    if (cleanText.includes('how does pickup') || cleanText.includes('how pickup works') || cleanText.includes('pickup process')) {
      const art = KNOWLEDGE_BASE.find(a => a.id === 'how_pickup_works');
      return { text: art.content, articleId: art.id };
    }
    if (cleanText.includes('cancellation policy') || cleanText.includes('refund policy for cancellation') || cleanText.includes('can i cancel')) {
      const art = KNOWLEDGE_BASE.find(a => a.id === 'cancellation_policy');
      return { text: art.content, articleId: art.id };
    }

    // Default: Fallback to general keyword matching
    let bestMatch = null;
    let maxOverlapScore = 0;

    KNOWLEDGE_BASE.forEach(article => {
      let score = 0;
      
      article.keywords.forEach(keyword => {
        if (cleanText.includes(keyword)) {
          score += 4;
        }
      });

      const words = cleanText.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          if (article.title.toLowerCase().includes(word)) score += 2;
          if (article.content.toLowerCase().includes(word)) score += 0.5;
        }
      });

      if (score > maxOverlapScore) {
        maxOverlapScore = score;
        bestMatch = article;
      }
    });

    if (maxOverlapScore >= 1.5 && bestMatch) {
      return {
        text: bestMatch.content,
        articleId: bestMatch.id
      };
    }

    return null;
  };

  // Submit message in chat window
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString()
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputText('');
    setIsTyping(true);
    setIsSearchingWeb(false);

    saveCurrentMessages(newMsgs);

    const match = matchQuestion(text);

    if (match) {
      // If it matches local KB, reply after a short delay
      setTimeout(() => {
        const botMsg = {
          id: Date.now().toString(),
          sender: 'bot',
          text: match.text,
          articleId: match.articleId || null,
          timestamp: new Date().toISOString(),
          showFollowUps: true
        };

        const finalMsgs = [...newMsgs, botMsg];
        setMessages(finalMsgs);
        setIsTyping(false);
        saveCurrentMessages(finalMsgs);
      }, 800);
    } else {
      // Local KB didn't match. Query backend Gemini Google Search Grounded AI
      setIsSearchingWeb(true);
      try {
        const response = await fetch(`${apiUrl}/support/ai-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: text })
        });

        if (response.ok) {
          const data = await response.json();
          const botMsg = {
            id: Date.now().toString(),
            sender: 'bot',
            text: data.text,
            sources: data.sources || [],
            timestamp: new Date().toISOString(),
            showFollowUps: true
          };

          const finalMsgs = [...newMsgs, botMsg];
          setMessages(finalMsgs);
          saveCurrentMessages(finalMsgs);
        } else {
          throw new Error('Web search failed');
        }
      } catch (err) {
        console.error('Error fetching search results:', err);
        const botMsg = {
          id: Date.now().toString(),
          sender: 'bot',
          text: "I couldn't find that information locally, and encountered an error connecting to our web search server. Please raise a support ticket or try again later.",
          timestamp: new Date().toISOString(),
          showFollowUps: true
        };
        const finalMsgs = [...newMsgs, botMsg];
        setMessages(finalMsgs);
        saveCurrentMessages(finalMsgs);
      } finally {
        setIsTyping(false);
        setIsSearchingWeb(false);
      }
    }
  };

  // Handle follow up question click
  const handleFollowUpClick = (question) => {
    if (question === 'Contact support') {
      setActiveTab('ticket');
    } else {
      handleSendMessage(question);
    }
  };

  // Handle ticket file attachment
  const handleTicketFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEvidenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEvidencePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Submit support ticket to backend
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description) {
      setTicketError('Please select an issue type and fill in the description.');
      return;
    }

    setTicketSubmitLoading(true);
    setTicketError(null);

    try {
      const formData = new FormData();
      if (selectedOrderId && selectedOrderId !== 'general') {
        const orderObj = orders.find(o => String(o.id) === String(selectedOrderId));
        if (orderObj) {
          formData.append('order_id', orderObj.id);
          formData.append('shop_id', orderObj.shop_id);
        }
      }
      formData.append('issue_type', issueType);
      formData.append('description', description);
      if (evidenceImage) {
        formData.append('image_product', evidenceImage);
      }

      const response = await fetch(`${apiUrl}/complaints`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setTicketSuccess(true);
        // Add notification message in chatbot
        const ticketSuccessMsg = {
          id: Date.now().toString(),
          sender: 'bot',
          text: `🎫 Support Ticket Submitted successfully!\n\nCategory: ${issueType}\nDescription: ${description}\n\nOur operations team will investigate and contact you shortly.`,
          timestamp: new Date().toISOString()
        };
        const updatedMsgs = [...messages, ticketSuccessMsg];
        setMessages(updatedMsgs);
        saveCurrentMessages(updatedMsgs);
        
        // Reset form
        setIssueType('');
        setSelectedOrderId('');
        setDescription('');
        setEvidenceImage(null);
        setEvidencePreview(null);
      } else {
        const data = await response.json();
        setTicketError(data.error || 'Failed to submit support ticket.');
      }
    } catch (err) {
      console.error(err);
      setTicketError('Server network error. Please try again later.');
    } finally {
      setTicketSubmitLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-145px)] md:h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 md:gap-6 animate-fadeIn pb-0">
      
      {/* LEFT COLUMN: Sidebar with Articles list and Chat History (Desktop: 1/3 width, Mobile: tabs/toggles) */}
      <div className="w-full md:w-80 flex flex-col gap-3 md:gap-4 flex-shrink-0">
        
        {/* Navigation Tabs (Quick Switcher) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          <button 
            onClick={() => { setActiveTab('chat'); setTicketSuccess(false); setShowMobileHistory(false); }}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
              activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-800'
            }`}
          >
            💬 Chatbot
          </button>
          <button 
            onClick={() => { setActiveTab('articles'); setTicketSuccess(false); setShowMobileHistory(false); }}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
              activeTab === 'articles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-800'
            }`}
          >
            📚 Articles
          </button>
          <button 
            onClick={() => { setActiveTab('ticket'); setTicketSuccess(false); setShowMobileHistory(false); }}
            className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all ${
              activeTab === 'ticket' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-800'
            }`}
          >
            🎫 Raise Ticket
          </button>
        </div>

        {/* Section 1: Search Help Articles */}
        <div className="hidden md:flex bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex-col gap-3">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Search Help Center</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search policies, refunds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-kirana-500 focus:bg-white transition-all text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search dropdown results */}
          {searchQuery && (
            <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1 border-t border-slate-100 divide-y divide-slate-100">
              {searchResults.length > 0 ? (
                searchResults.map(art => (
                  <button
                    key={art.id}
                    onClick={() => {
                      setSelectedArticle(art);
                      setActiveTab('articles');
                    }}
                    className="w-full text-left py-2 hover:bg-slate-50 px-2 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-between"
                  >
                    <span className="truncate">{art.title}</span>
                    <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded flex-shrink-0 ml-1">{art.category}</span>
                  </button>
                ))
              ) : (
                <div className="text-[10px] font-bold text-slate-400 text-center py-2">No matching help articles found</div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Conversation Sessions History */}
        <div className="hidden md:flex bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex-1 flex flex-col min-h-[160px] md:min-h-0 overflow-hidden">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Recent Chats
            </span>
            <button 
              onClick={startNewChat}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-kirana-600 hover:text-kirana-700 transition-colors flex items-center justify-center border border-dashed border-kirana-300"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {chatHistory.length > 0 ? (
              chatHistory.map(session => (
                <div
                  key={session.id}
                  onClick={() => {
                    selectSession(session.id);
                    setActiveTab('chat');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    currentSessionId === session.id 
                      ? 'bg-kirana-50 border-kirana-200/50 shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100/70 border-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center space-x-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${currentSessionId === session.id ? 'text-kirana-600' : 'text-slate-400'}`} />
                    <span className={`text-xs truncate block font-bold text-slate-700`}>
                      {(session.messages[session.messages.length - 1]?.text || session.title).replace(/\*\*?/g, '').substring(0, 30)}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-350 transition-colors ml-1 flex-shrink-0"
                    title="Delete Chat Log"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-400 font-bold text-center py-4 flex flex-col items-center justify-center gap-1">
                <span>No saved session logs</span>
                <button onClick={startNewChat} className="text-kirana-600 hover:underline">Start a chat</button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Chat Assistant Frame or Articles or Support Ticket */}
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-premium overflow-hidden flex flex-col min-h-0 md:min-h-[400px] relative">
        
        {/* Panel Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-kirana-500 flex items-center justify-center text-white shadow-premium">
              <LifeBuoy className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {activeTab === 'chat' && 'MyKiranam Assistant'}
                {activeTab === 'articles' && 'Knowledge Base & Help Center'}
                {activeTab === 'ticket' && 'Raise Support Complaint'}
              </h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
                {activeTab === 'chat' && (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span>AI Support Agent • Offline Mode Active</span>
                  </>
                )}
                {activeTab === 'articles' && 'Self-service Guides'}
                {activeTab === 'ticket' && 'Platform Support Desk'}
              </p>
            </div>
          </div>

          {/* Actions & Metrics */}
          <div className="flex items-center space-x-2">
            {activeTab === 'chat' && (
              <button 
                onClick={() => setShowMobileHistory(!showMobileHistory)}
                className="md:hidden p-1.5 hover:bg-slate-200 rounded-xl text-slate-550 hover:text-slate-900 transition-colors flex items-center justify-center border border-slate-200 bg-white"
                title="Chat History"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            {user && user.role === 'customer' && (
              <div className="hidden sm:flex items-center space-x-3 text-[10px] font-bold text-slate-500">
                <span className="bg-slate-200/50 px-2.5 py-1 rounded-full">Score: {user.reliability_score || 100}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Support Banner (Facing issues with orders or savings?) */}
        {activeTab === 'articles' && (
          <div className="hidden md:flex bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-md flex-row items-center justify-between gap-3 border-b border-slate-850 transition-all duration-300">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-kirana-400 flex items-center justify-center flex-shrink-0 border border-slate-700">
                <HelpCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-xs sm:text-sm">Facing any issues with orders or savings?</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Raise a support ticket, and our team will get back to you immediately.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('ticket')}
              className="w-full sm:w-auto px-4 py-2 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
            >
              Raise Support Ticket
            </button>
          </div>
        )}

        {/* Panel Body Content (Conditional Render) */}
        <div className="flex-1 overflow-hidden relative">

          {/* Mobile History Drawer overlay */}
          {showMobileHistory && activeTab === 'chat' && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden" onClick={() => setShowMobileHistory(false)}>
              <div 
                className="absolute left-0 right-0 top-0 bg-white border-b border-slate-200 p-4 shadow-xl max-h-[70%] flex flex-col rounded-b-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-kirana-600" />
                    Recent Chats
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => { startNewChat(); setShowMobileHistory(false); }}
                      className="p-1.5 bg-kirana-50 text-kirana-700 hover:bg-kirana-100 rounded-xl transition-colors flex items-center justify-center border border-dashed border-kirana-300 text-[10px] font-bold px-2.5"
                      title="New Chat"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      New Chat
                    </button>
                    <button 
                      onClick={() => setShowMobileHistory(false)}
                      className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
                  {chatHistory.length > 0 ? (
                    chatHistory.map(session => (
                      <div
                        key={session.id}
                        onClick={() => {
                          selectSession(session.id);
                          setShowMobileHistory(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all border ${
                          currentSessionId === session.id 
                            ? 'bg-kirana-50 border-kirana-200/50 shadow-sm' 
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center space-x-2">
                          <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-kirana-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate block font-bold text-slate-700">
                            {(session.messages[session.messages.length - 1]?.text || session.title).replace(/\*\*?/g, '').substring(0, 45)}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => deleteSession(e, session.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors ml-2"
                          title="Delete Chat Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 font-bold text-center py-6 flex flex-col items-center justify-center gap-1">
                      <span>No saved session logs</span>
                      <button onClick={startNewChat} className="text-kirana-600 hover:underline">Start a chat</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Chat Window */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col justify-between">
              
              {/* Message History area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={msg.id || index}
                    className={`flex items-start space-x-2.5 max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar representation */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                      msg.sender === 'user' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-kirana-500 text-slate-950'
                    }`}>
                      {msg.sender === 'user' ? (user?.name?.[0]?.toUpperCase() || 'U') : 'MK'}
                    </div>

                    <div className="space-y-1.5">
                      {/* Message bubble */}
                      <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed whitespace-pre-wrap border shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-slate-900 border-slate-950 text-white rounded-tr-none' 
                          : 'bg-slate-50 border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text ? msg.text.replace(/\*\*?/g, '') : ''}
                        
                        {/* Render Google search sources if present */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                            <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                              🔍 Web Sources Found:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-extrabold text-kirana-600 hover:text-kirana-700 bg-kirana-50 hover:bg-kirana-100/70 px-2.5 py-1 rounded-xl border border-kirana-200/30 flex items-center gap-1 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  <span className="max-w-[140px] truncate">{src.title || 'Web Source'}</span>
                                  <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* If matching KB article content, display search shortcut (legacy support) */}
                        {msg.articleId && !msg.articleIds && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-end">
                            <button
                              onClick={() => {
                                const art = KNOWLEDGE_BASE.find(a => a.id === msg.articleId);
                                if (art) {
                                  setSelectedArticle(art);
                                  setActiveTab('articles');
                                }
                              }}
                              className="text-[9px] font-extrabold uppercase text-kirana-600 hover:text-kirana-700 flex items-center space-x-0.5 tracking-wider bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"
                            >
                              <span>View Full Article</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* If matching multiple KB articles, display search shortcuts (new support) */}
                        {msg.articleIds && msg.articleIds.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex flex-wrap gap-1.5 justify-end">
                            {msg.articleIds.map(artId => {
                              const art = KNOWLEDGE_BASE.find(a => a.id === artId);
                              if (!art) return null;
                              return (
                                <button
                                  key={artId}
                                  onClick={() => {
                                    setSelectedArticle(art);
                                    setActiveTab('articles');
                                  }}
                                  className="text-[9px] font-extrabold uppercase text-kirana-600 hover:text-kirana-700 flex items-center space-x-1 tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-150 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-250 active:scale-95"
                                >
                                  <span>📖 {art.title}</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Fallback support ticket button */}
                        {msg.text.includes("Please contact MyKiranam Support.") && (
                          <div className="mt-3">
                            <button 
                              onClick={() => setActiveTab('ticket')}
                              className="px-3 py-1.5 bg-gradient-to-r from-kirana-500 to-amber-500 text-slate-950 rounded-xl font-extrabold text-[10px] flex items-center space-x-1 hover:shadow-sm active:scale-95 transition-all"
                            >
                              <span>🎫 Open Support Ticket</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className={`block text-[8px] text-slate-400 font-bold ${msg.sender === 'user' ? 'text-right' : ''}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Clickable suggested follow-ups (displayed under the final bot response) */}
                      {msg.sender === 'bot' && msg.showFollowUps && index === messages.length - 1 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider w-full mb-0.5">Quick Follow-ups:</span>
                          {FOLLOW_UP_QUESTIONS.map(q => (
                            <button
                              key={q}
                              onClick={() => handleFollowUpClick(q)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-600 bg-white transition-all shadow-sm active:scale-95"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Simulated typing bubble */}
                {isTyping && (
                  <div className="flex items-start space-x-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black bg-kirana-500 text-slate-950 flex-shrink-0">
                      MK
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none flex items-center space-x-1.5 h-10 shadow-sm border-dashed">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      {isSearchingWeb && (
                        <span className="block text-[10px] font-black text-kirana-600 animate-pulse pl-1 flex items-center gap-1">
                          <span className="inline-block animate-spin mr-0.5">🌀</span> Searching the internet & summarizing...
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Quick Card Questions container */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 backdrop-blur-sm space-y-3">
                
                {/* Clickable Quick Questions cards */}
                {messages.length <= 1 && (
                  <div className="space-y-1.5">
                    <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Frequently Asked Questions:</span>
                    <div className="flex overflow-x-auto pb-1.5 scrollbar-none gap-2 -mx-1 px-1">
                      {QUICK_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="px-3.5 py-2 hover:scale-[1.02] active:scale-[0.98] rounded-xl border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-[10px] font-extrabold whitespace-nowrap shadow-sm transition-all flex items-center space-x-1.5 flex-shrink-0"
                        >
                          <span>💡</span>
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Text Form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Ask MyKiranam Assistant something..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-kirana-500 shadow-inner text-slate-800"
                  />
                  <button
                    type="submit"
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white shadow-md active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                
                <span className="block text-[8px] text-center text-slate-400 font-bold tracking-wide">
                  Zero wait times. Instant automated replies. Raising a ticket will link to customer support.
                </span>
              </div>

            </div>
          )}

          {/* TAB 2: Knowledge Base Directory */}
          {activeTab === 'articles' && (
            <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
              
              {/* Mobile Search Bar inside Articles Tab */}
              <div className="md:hidden space-y-2 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Search Help Center</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search policies, refunds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-kirana-500 focus:bg-white transition-all text-slate-800"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-3 p-0.5 rounded-full hover:bg-slate-250 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Search dropdown results for mobile */}
                {searchQuery && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1 divide-y divide-slate-100">
                    {searchResults.length > 0 ? (
                      searchResults.map(art => (
                        <button
                          key={art.id}
                          onClick={() => {
                            setSelectedArticle(art);
                          }}
                          className="w-full text-left py-2 hover:bg-slate-50 px-2 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-between"
                        >
                          <span className="truncate text-xs">{art.title}</span>
                          <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1 py-0.5 rounded flex-shrink-0 ml-1">{art.category}</span>
                        </button>
                      ))
                    ) : (
                      <div className="text-[10px] font-bold text-slate-400 text-center py-2">No matching help articles found</div>
                    )}
                  </div>
                )}
              </div>
              {selectedArticle ? (
                /* Selected Article View */
                <div className="space-y-4 animate-fadeIn">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 border rounded-xl transition-all"
                  >
                    ← Back to Index
                  </button>
                  <div className="space-y-2.5">
                    <span className="px-2 py-0.5 bg-kirana-100 text-kirana-800 text-[9px] font-black uppercase tracking-wider rounded border border-kirana-200/50">
                      {selectedArticle.category}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedArticle.title}</h3>
                  </div>
                  <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-5 text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line">
                    {selectedArticle.content}
                  </div>
                </div>
              ) : (
                /* Article Category Index View */
                <div className="space-y-6">
                  <div className="text-center max-w-sm mx-auto space-y-1">
                    <h3 className="text-sm font-black text-slate-800">Frequently Accessed Articles</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Browse general guidelines, security metrics, and platform policies</p>
                  </div>

                  {/* Grouped by Category */}
                  {['General', 'Ordering', 'Pickup', 'Quality', 'Policies', 'Comparison'].map(cat => {
                    const filtered = KNOWLEDGE_BASE.filter(a => a.category === cat);
                    if (filtered.length === 0) return null;
                    
                    return (
                      <div key={cat} className="space-y-2.5 bg-slate-50/40 p-4 border border-slate-100 rounded-3xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">{cat}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filtered.map(art => (
                            <button
                              key={art.id}
                              onClick={() => setSelectedArticle(art)}
                              className="flex items-center justify-between p-3.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 rounded-2xl text-left transition-all group hover:shadow-sm"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="block text-xs font-bold text-slate-800 group-hover:text-slate-950 truncate">{art.title}</span>
                                <span className="block text-[8px] text-slate-400 font-bold truncate mt-0.5">Read article & instructions</span>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Raise Support Ticket */}
          {activeTab === 'ticket' && (
            <div className="h-full overflow-y-auto p-4 md:p-6 text-slate-800">
              {ticketSuccess ? (
                /* Success Screen */
                <div className="max-w-md mx-auto text-center py-8 space-y-4 animate-fadeIn">
                  <span className="text-4xl block">🎫</span>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-slate-900">Support Ticket Raised!</h3>
                    <p className="text-xs text-slate-550 max-w-xs mx-auto leading-relaxed">
                      Your ticket has been sent to MyKiranam Support operations. The summary has also been logged in your chat window.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => { setActiveTab('chat'); setTicketSuccess(false); }}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow hover:bg-slate-950 transition-all"
                    >
                      Return to Chat
                    </button>
                  </div>
                </div>
              ) : (
                /* Ticket Submission Form */
                <div className="max-w-md mx-auto space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900">Submit a Support Ticket</h3>
                    <p className="text-xs text-slate-500 font-medium leading-normal">
                      Provide details about billing errors, product issues, or account complaints. A platform specialist will review and respond.
                    </p>
                  </div>

                  {ticketError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>{ticketError}</span>
                    </div>
                  )}

                  <form onSubmit={handleTicketSubmit} className="space-y-4">
                    {/* Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Category of Issue *</label>
                      <select
                        required
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-kirana-500 font-bold bg-white text-slate-800"
                      >
                        <option value="">Select issue category...</option>
                        <option value="Incorrect Savings calculation">Incorrect Savings calculation</option>
                        <option value="Double Payment / Billing error">Double Payment / Billing error</option>
                        <option value="App / Technical glitch">App / Technical glitch</option>
                        <option value="Delivery / Pickup issues">Delivery / Pickup issues</option>
                        <option value="Wrong or Damaged items">Wrong or Damaged items</option>
                        <option value="Other / General feedback">Other / General feedback</option>
                      </select>
                    </div>

                    {/* Linked Order selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Linked Order (Optional)</label>
                      {loadingOrders ? (
                        <div className="text-[10px] text-slate-400 font-bold animate-pulse">Loading orders...</div>
                      ) : (
                        <select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-kirana-500 font-bold bg-white text-slate-800"
                        >
                          <option value="general">General (No specific order)</option>
                          {orders.map(order => (
                            <option key={order.id} value={order.id}>
                              {order.custom_order_id || `Order #${order.id}`} - {order.shop_name} (₹{order.amount})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Details & Request *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="State clearly what happened, the issue, and what you expect from support..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-kirana-500 font-medium placeholder-slate-400 text-slate-800"
                      />
                    </div>

                    {/* Screenshot attachment */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Evidence Screenshot (Optional)</label>
                      <div className="relative border border-dashed border-slate-250 hover:border-slate-350 bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTicketFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-slate-655 mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-500 text-center truncate w-full px-2">
                          {evidenceImage ? evidenceImage.name : 'Attach JPG/PNG screenshot'}
                        </span>
                      </div>
                      {evidencePreview && (
                        <div className="relative mt-2 border rounded-xl p-1.5 bg-white max-w-[120px] mx-auto">
                          <img src={evidencePreview} alt="Screenshot Preview" className="h-16 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => { setEvidenceImage(null); setEvidencePreview(null); }}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full border border-red-250 font-bold leading-none text-[8px]"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={ticketSubmitLoading}
                      className="w-full py-3 bg-slate-900 text-white font-extrabold text-xs rounded-2xl transition-all shadow hover:bg-slate-950 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {ticketSubmitLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Ticket</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default SupportAssistant;
