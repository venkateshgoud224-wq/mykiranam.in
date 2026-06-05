import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, AlertTriangle, Package, CheckCircle2, DollarSign, BarChart3, Clock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const SellerAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false); // Demo toggle for premium UI

  const { token, apiUrl } = useAuth();

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/shops/premium-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching premium analytics:', err);
      setError('Failed to load insights. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-kirana-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-b-3xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        <div className="relative z-10 px-6 pt-12 pb-32 flex flex-col items-center justify-center text-center min-h-full">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-black text-white mb-3">MyKiranam Premium</h1>
          <p className="text-indigo-100 mb-8 max-w-md">
            Unlock the power of your automated shop data. See exactly what your competitors are charging and find out where you're losing money.
          </p>

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mb-8 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Local Market Comparisons</h3>
                <p className="text-xs text-slate-500 mt-0.5">Know instantly if your prices are too high compared to shops within 2km.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Lost Revenue Tracking</h3>
                <p className="text-xs text-slate-500 mt-0.5">See exactly how much revenue you lost from over-priced items.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Automated Digital Catalog</h3>
                <p className="text-xs text-slate-500 mt-0.5">A complete list of your inventory created automatically from your past bills.</p>
              </div>
            </div>
          </div>

          <div 
            className="w-full max-w-md bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            <span>Premium Launching Soon</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-6 py-8 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Crown className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Premium Active</span>
            </div>
            <h1 className="text-2xl font-black">Shop Insights</h1>
            <p className="text-indigo-200 text-sm mt-1">Data driven directly from your past orders.</p>
          </div>
          <button onClick={() => setIsSubscribed(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
             <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-1.5 text-indigo-200 mb-1">
              <Package className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Items Logged</span>
            </div>
            <div className="text-xl font-black">{analytics?.totalCatalogItems || 0}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-1.5 text-indigo-200 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Growth</span>
            </div>
            <div className="text-xl font-black text-green-400">{analytics?.revenueTrend || '+0%'}</div>
          </div>
          <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-3 border border-red-500/30">
            <div className="flex items-center gap-1.5 text-red-200 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Lost Rev</span>
            </div>
            <div className="text-xl font-black text-red-400">₹{analytics?.lostRevenueEstimate || 0}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Market Analysis Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-kirana-500" />
              Market Price Comparison
            </h2>
            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-200 rounded-md">Last 7 Days</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Item (Auto-logged)</th>
                  <th className="px-4 py-3 text-right">Your Price</th>
                  <th className="px-4 py-3 text-right">Market Avg</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.comparisons?.map((item, index) => (
                  <tr key={index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.item_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{item.my_price}</td>
                    <td className="px-4 py-3 text-right text-slate-500">₹{item.market_avg}</td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'Too High' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          <TrendingUp className="w-3 h-3" /> HIGH
                        </span>
                      )}
                      {item.status === 'Optimal' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                          <CheckCircle2 className="w-3 h-3" /> OPTIMAL
                        </span>
                      )}
                      {item.status === 'Competitive' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          <TrendingUp className="w-3 h-3 rotate-180" /> LOW
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p>Customers checking out with <span className="font-bold">Aashirvaad Atta</span> are 45% more likely to choose competitors because your price is ₹15 above the 2km average.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerAnalytics;
