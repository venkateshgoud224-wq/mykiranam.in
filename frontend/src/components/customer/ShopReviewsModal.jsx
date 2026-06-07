import React, { useState, useEffect } from 'react';
import { X, Star, Award, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StarDisplay = ({ value, size = 4 }) => {
  return (
    <div className="flex space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-${size} h-${size} ${
            star <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
          }`}
        />
      ))}
    </div>
  );
};

const ShopReviewsModal = ({ shop, onClose }) => {
  const { apiUrl } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/reviews/shop/${shop.id}`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        } else {
          setError('Failed to fetch reviews.');
        }
      } catch (err) {
        console.error('Error fetching shop reviews:', err);
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    if (shop?.id) {
      fetchReviews();
    }
  }, [shop, apiUrl]);

  // Calculate averages
  const totalReviewsCount = reviews.length;
  const averages = {
    overall: 0,
    product: 0,
    service: 0,
    accuracy: 0
  };

  if (totalReviewsCount > 0) {
    const sumOverall = reviews.reduce((sum, r) => sum + (r.overall_experience || 0), 0);
    const sumProduct = reviews.reduce((sum, r) => sum + (r.product_quality || 0), 0);
    const sumService = reviews.reduce((sum, r) => sum + (r.service_quality || 0), 0);
    const sumAccuracy = reviews.reduce((sum, r) => sum + (r.order_accuracy || 0), 0);

    averages.overall = (sumOverall / totalReviewsCount).toFixed(1);
    averages.product = (sumProduct / totalReviewsCount).toFixed(1);
    averages.service = (sumService / totalReviewsCount).toFixed(1);
    averages.accuracy = (sumAccuracy / totalReviewsCount).toFixed(1);
  }

  const getInitialsColor = (name) => {
    const colors = ['bg-amber-500', 'bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-kirana-600" />
              Store Reviews & Feedback
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{shop.shop_name} • {shop.shop_category || 'General Store'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading reviews...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-655 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          ) : totalReviewsCount === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Star className="w-12 h-12 text-slate-200 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Reviews Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">This store hasn't received any customer ratings or reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ratings Summary Dashboard */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-150 p-5 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Big Score Column */}
                <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0">
                  <span className="block text-4xl font-black text-slate-900 leading-none">{averages.overall}</span>
                  <div className="flex justify-center my-2">
                    <StarDisplay value={Math.round(averages.overall)} size={5} />
                  </div>
                  <span className="text-[11px] text-slate-450 uppercase font-black tracking-wider">Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'}</span>
                </div>

                {/* Subcategories Breakdown */}
                <div className="md:col-span-8 space-y-3">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Performance Details</h4>
                  
                  {/* Product Quality */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-655">Product Quality</span>
                    <div className="flex items-center space-x-3">
                      <StarDisplay value={Math.round(averages.product)} size={3.5} />
                      <span className="font-extrabold text-slate-800 w-6 text-right">{averages.product}</span>
                    </div>
                  </div>

                  {/* Pricing Accuracy */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-655">Pricing Accuracy</span>
                    <div className="flex items-center space-x-3">
                      <StarDisplay value={Math.round(averages.service)} size={3.5} />
                      <span className="font-extrabold text-slate-800 w-6 text-right">{averages.service}</span>
                    </div>
                  </div>

                  {/* Pickup Experience */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-655">Pickup Experience</span>
                    <div className="flex items-center space-x-3">
                      <StarDisplay value={Math.round(averages.accuracy)} size={3.5} />
                      <span className="font-extrabold text-slate-800 w-6 text-right">{averages.accuracy}</span>
                    </div>
                  </div>

                  {/* Seller Behavior */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-655">Seller Behavior</span>
                    <div className="flex items-center space-x-3">
                      <StarDisplay value={Math.round(averages.overall)} size={3.5} />
                      <span className="font-extrabold text-slate-800 w-6 text-right">{averages.overall}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Customer Feedback</h3>
                <div className="divide-y divide-slate-100">
                  {reviews.map((review) => (
                    <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2 text-left">
                      {/* Customer info and date */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm ${getInitialsColor(review.customer_name)}`}>
                            {review.customer_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 flex items-center">
                              {review.customer_name}
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 ml-1" title="Verified Customer" />
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold">
                              {new Date(review.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Overall Experience Badge */}
                        <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-black text-amber-700">{review.overall_experience}.0</span>
                        </div>
                      </div>

                      {/* Review details / text */}
                      <div className="pl-10 space-y-2.5">
                        {review.review_text && (
                          <p className="text-xs text-slate-600 bg-slate-50/60 border border-slate-100 rounded-xl px-3 py-2.5 font-medium leading-relaxed italic">
                            "{review.review_text}"
                          </p>
                        )}

                        {/* Sub ratings mini view */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500 font-semibold bg-slate-50/30 p-2 rounded-xl border border-slate-100/50">
                          <span className="flex items-center">
                            Product: <span className="font-extrabold text-slate-800 ml-1 flex items-center">{review.product_quality} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" /></span>
                          </span>
                          <span className="flex items-center">
                            Pricing: <span className="font-extrabold text-slate-800 ml-1 flex items-center">{review.service_quality} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" /></span>
                          </span>
                          <span className="flex items-center">
                            Pickup: <span className="font-extrabold text-slate-800 ml-1 flex items-center">{review.order_accuracy} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" /></span>
                          </span>
                          <span className="flex items-center">
                            Behavior: <span className="font-extrabold text-slate-800 ml-1 flex items-center">{review.overall_experience} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" /></span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopReviewsModal;
