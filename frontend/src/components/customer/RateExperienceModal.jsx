import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StarRating = ({ label, value, onChange }) => {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

const RateExperienceModal = ({ order, onClose, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState({
    product_quality: 0,
    service_quality: 0,
    order_accuracy: 0,
    overall_experience: 0
  });
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all ratings are provided
    if (!ratings.product_quality || !ratings.service_quality || !ratings.order_accuracy || !ratings.overall_experience) {
      setError('Please provide a star rating for all categories.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          shop_id: order.shop_id,
          ...ratings,
          review_text: reviewText
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
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
            <Star className="w-5 h-5 mr-2 text-amber-500 fill-amber-500" />
            Rate Your Experience
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

          <div className="mb-6 text-center">
            <h3 className="font-extrabold text-slate-900">{order.shop_name}</h3>
            <p className="text-[10px] text-slate-500">Order #{order.custom_order_id || order.id}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <StarRating 
                label="Product Quality" 
                value={ratings.product_quality} 
                onChange={(v) => setRatings({...ratings, product_quality: v})} 
              />
              <div className="border-t border-slate-100 my-2" />
              <StarRating 
                label="Service Quality" 
                value={ratings.service_quality} 
                onChange={(v) => setRatings({...ratings, service_quality: v})} 
              />
              <div className="border-t border-slate-100 my-2" />
              <StarRating 
                label="Order Accuracy" 
                value={ratings.order_accuracy} 
                onChange={(v) => setRatings({...ratings, order_accuracy: v})} 
              />
              <div className="border-t border-slate-100 my-2" />
              <StarRating 
                label="Overall Experience" 
                value={ratings.overall_experience} 
                onChange={(v) => setRatings({...ratings, overall_experience: v})} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Write a Review (Optional)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this shop..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-kirana-500 focus:border-kirana-500 outline-none transition-all resize-none h-24"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-black text-sm rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                'Submit Rating'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RateExperienceModal;
