import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ReportCustomerModal = ({ order, onClose, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reasonTypes = [
    'Fake Order / Prank',
    'Abusive Behavior',
    'Did Not Pick Up Order',
    'Unreasonable Revisions',
    'Payment Fraud',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !description) {
      setError('Please select a reason and provide a description.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/seller-protection/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: order.customer_id,
          reason,
          description: `Order #${order.custom_order_id || order.id}: ${description}`
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit complaint.');
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-crimson" />
            Raise Complaint
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-xs font-semibold text-slate-700">Customer: {order.customer_name}</p>
            <p className="text-[10px] text-slate-500">Order #{order.custom_order_id || order.id}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Complaint *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all"
              >
                <option value="">Select a reason...</option>
                {reasonTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all resize-none h-32"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-70 flex justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Submit Complaint'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportCustomerModal;
