import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Clock, Wallet, Award, Store, ChevronDown, ChevronUp, ShoppingBag, Receipt, Calendar } from 'lucide-react';

const SavingsDashboard = () => {
  const { apiUrl, token } = useAuth();
  const [savingsData, setSavingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        const res = await fetch(`${apiUrl}/savings/customer`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavingsData(data);
        }
      } catch (err) {
        console.error('Error fetching savings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavings();
  }, [apiUrl, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-kirana-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { savings, badges, favoriteShopName, completedOrders } = savingsData || { savings: {}, badges: [], favoriteShopName: 'None', completedOrders: [] };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="bg-gradient-to-r from-kirana-500 to-kirana-600 rounded-2xl p-6 text-slate-900 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-2">Your Lifetime Value</h1>
          <p className="text-sm font-semibold opacity-90">Thank you for being part of the MyKiranam community.</p>
        </div>
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Trophy className="w-32 h-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Money Saved</p>
            <p className="text-2xl font-black text-slate-900">₹{savings?.total_savings || '0.00'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Time Saved</p>
            <p className="text-2xl font-black text-slate-900">
              {savings?.total_time_saved ? Math.floor(savings.total_time_saved / 60) : 0}h {savings?.total_time_saved ? savings.total_time_saved % 60 : 0}m
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Favorite Shop</p>
            <p className="text-lg font-bold text-slate-900 line-clamp-1">{favoriteShopName}</p>
          </div>
        </div>
      </div>



      {/* Savings Breakdown by Order */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-kirana-500" />
            Savings History
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {completedOrders && completedOrders.length > 0 ? (
            completedOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              return (
                <div key={order.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div 
                    onClick={() => toggleOrderExpand(order.id)}
                    className="flex justify-between items-center cursor-pointer select-none"
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-805 text-sm flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {order.shop_name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span>Order #{order.custom_order_id || order.id}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.delivered_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saved</span>
                        <span className="text-sm font-black text-emerald-600">₹{order.total_savings}</span>
                      </div>
                      <div className="text-slate-400 p-1 rounded-lg hover:bg-slate-105 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable detailed breakdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100/70 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 text-center">
                        <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Grocery Savings</span>
                        <span className="text-xs font-extrabold text-emerald-800">₹{order.grocery_savings}</span>
                      </div>
                      <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 text-center">
                        <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Delivery Avoided</span>
                        <span className="text-xs font-extrabold text-emerald-800">₹{order.delivery_savings}</span>
                      </div>
                      <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 text-center">
                        <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Platform Avoided</span>
                        <span className="text-xs font-extrabold text-emerald-800">₹{order.platform_savings}</span>
                      </div>
                      <div className="bg-teal-50/30 p-2.5 rounded-xl border border-teal-100/50 text-center">
                        <span className="block text-[9px] font-bold text-teal-700 uppercase tracking-wide">Time Saved</span>
                        <span className="text-xs font-extrabold text-teal-800">{order.time_saved} Mins</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-505">No completed orders yet. Complete an order to see savings history!</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-kirana-500" />
            Your Achievements
          </h2>
        </div>
        <div className="p-4">
          {badges && badges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 flex items-start space-x-3 bg-gradient-to-br from-white to-slate-50">
                  <div className="w-10 h-10 rounded-full bg-kirana-100 text-kirana-600 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{badge.badge_name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-2">
                      Earned: {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No achievements yet. Keep ordering to earn badges!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SavingsDashboard;
