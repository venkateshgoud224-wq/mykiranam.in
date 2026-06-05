import React, { useState } from 'react';
import { X, UploadCloud, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ReportComplaintModal = ({ order, onClose, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState({
    image_product: null,
    image_expiry: null,
    image_bill: null
  });

  const issueTypes = [
    'Expired Product',
    'Wrong Product',
    'Missing Product',
    'Damaged Product',
    'Poor Quality',
    'Other'
  ];

  const handleImageChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setImages(prev => ({
        ...prev,
        [field]: e.target.files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType || !description) {
      setError('Please select an issue type and provide a description.');
      return;
    }

    if (!images.image_product && !images.image_bill && !images.image_expiry) {
       setError('Please upload at least one evidence image (Product, Expiry, or Bill).');
       return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('order_id', order.id);
      formData.append('shop_id', order.shop_id);
      formData.append('issue_type', issueType);
      formData.append('description', description);

      if (images.image_product) formData.append('image_product', images.image_product);
      if (images.image_expiry) formData.append('image_expiry', images.image_expiry);
      if (images.image_bill) formData.append('image_bill', images.image_bill);

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
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-crimson" />
            Report a Problem
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
            <p className="text-xs font-semibold text-slate-700">Order from: {order.shop_name}</p>
            <p className="text-[10px] text-slate-500">Order #{order.custom_order_id || order.id}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Issue Type *</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all"
              >
                <option value="">Select an issue...</option>
                {issueTypes.map(type => (
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Evidence Photos (Required)</label>
              <p className="text-[10px] text-slate-500 mb-3">Please upload clear photos to help us verify your complaint.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'image_product', label: 'Product Photo' },
                  { id: 'image_expiry', label: 'Expiry Date' },
                  { id: 'image_bill', label: 'Bill Photo' }
                ].map(field => (
                  <div key={field.id} className="relative">
                    <input
                      type="file"
                      id={field.id}
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, field.id)}
                      className="hidden"
                    />
                    <label
                      htmlFor={field.id}
                      className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all h-24 ${
                        images[field.id] ? 'border-kirana-500 bg-kirana-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <UploadCloud className={`w-5 h-5 mb-1.5 ${images[field.id] ? 'text-kirana-600' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-semibold text-center text-slate-600">
                        {images[field.id] ? 'Selected' : field.label}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
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

export default ReportComplaintModal;
