import React, { useState, useEffect } from 'react';
import { X, UploadCloud, HelpCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SupportTicketModal = ({ onClose, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [issueType, setIssueType] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceImage, setEvidenceImage] = useState(null);

  const issueCategories = [
    'Incorrect Savings calculation',
    'Double Payment / Billing error',
    'App / Technical glitch',
    'Delivery / Pickup issues',
    'Wrong or Damaged items',
    'Other / General feedback'
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${apiUrl}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Filter or just display recent orders
          setOrders(data);
        }
      } catch (err) {
        console.error('Error fetching orders for ticket modal:', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [apiUrl, token]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEvidenceImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description) {
      setError('Please select an issue category and describe what you want.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // If linked to a specific order, find its database ID and shop ID
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
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit support ticket.');
      }
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-kirana-600" />
            Raise Support Ticket
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Issue Category */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                What is this issue related to? *
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all font-semibold text-slate-800"
              >
                <option value="">Select issue category...</option>
                {issueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 2. Order Link Selection */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Link to an Order (Optional)
              </label>
              {loadingOrders ? (
                <div className="flex items-center gap-2 py-2.5">
                  <div className="w-4 h-4 border-2 border-kirana-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500">Loading your orders...</span>
                </div>
              ) : (
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all font-semibold text-slate-800"
                >
                  <option value="general">General Issue (Not order specific)</option>
                  {orders && orders.length > 0 ? (
                    orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.custom_order_id || `Order #${order.id}`} - {order.shop_name} (₹{order.amount || '0'}) - {order.order_status}
                      </option>
                    ))
                  ) : (
                    <option disabled>No recent orders found</option>
                  )}
                </select>
              )}
            </div>

            {/* 3. Description / What he wants */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Describe the problem & what you want *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, what went wrong, and the expected resolution..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all resize-none h-28 font-medium text-slate-800"
              />
            </div>

            {/* 4. Evidence Upload */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                Attach Evidence / Screenshot (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="evidence_screenshot"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="evidence_screenshot"
                  className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    evidenceImage ? 'border-kirana-500 bg-kirana-50/40 text-kirana-700' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <UploadCloud className="w-7 h-7 mb-2" />
                  <span className="text-xs font-bold">
                    {evidenceImage ? evidenceImage.name : 'Upload screenshot or picture'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Supported formats: PNG, JPG, JPEG
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-sm rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketModal;
