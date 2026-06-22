import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Search, Store, ArrowRight, ShieldAlert, Lock } from 'lucide-react';
import DemoModal from '../../components/common/DemoModal';

const CustomerQuotes = ({ onSelectShop, onBackToShops }) => {
  const { apiUrl, token } = useAuth();
  
  const [items, setItems] = useState([{ id: 1, name: '', quantity: 1, unit: 'kg' }]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const units = ['kg', 'g', 'L', 'ml', 'unit', 'packet', 'dozen'];

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), name: '', quantity: 1, unit: 'kg' }]);
    setShowComingSoon(false);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    setShowComingSoon(false);
  };

  const handleChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    setShowComingSoon(false);
  };

  const generateQuotes = async () => {
    const validItems = items.filter(i => i.name.trim() !== '' && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid item.');
      setQuotes([]);
      setShowComingSoon(false);
      return;
    }
    
    setError(null);
    setLoading(true);
    setQuotes([]);
    setShowComingSoon(false);
    
    // Simulate price analysis for premium feel
    setTimeout(() => {
      setLoading(false);
      setShowComingSoon(true);
    }, 800);
  };

  return (
    <div className="max-w-lg mx-auto pb-20 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBackToShops}
          className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Shops
        </button>
        <h2 className="text-base md:text-xl font-extrabold text-slate-900">Compare Prices</h2>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-premium">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-5 h-5 text-kirana-600" />
          <h3 className="font-bold text-slate-800">Your Grocery List</h3>
        </div>
        
        <p className="text-xs text-slate-500 mb-5">
          Enter your items below. Our AI Price Engine will analyze recent local market prices and estimate costs across different stores instantly—without bothering sellers!
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Want to try a demo first?</h4>
            <p className="text-[11px] font-semibold text-emerald-700/90 leading-normal">
              Compare simulated items across mock shops to see how our engine estimates cart pricing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDemo(true)}
            className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[10px] font-black tracking-wider uppercase rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span>✨ Try Interactive Pricing Demo</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="e.g. Sugar, Fortune Oil..."
                value={item.name}
                onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-kirana-500 outline-none transition-colors w-full"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={item.quantity}
                  onChange={(e) => handleChange(item.id, 'quantity', e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:border-kirana-500 outline-none transition-colors text-center flex-1 sm:flex-none"
                />
                <select
                  value={item.unit}
                  onChange={(e) => handleChange(item.id, 'unit', e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:border-kirana-500 outline-none transition-colors flex-1 sm:flex-none"
                >
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {items.length > 1 && (
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl border border-slate-200 sm:border-transparent sm:bg-transparent"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={handleAddItem}
            className="flex items-center justify-center space-x-1 text-sm font-bold text-kirana-600 hover:text-kirana-700 transition-colors px-4 py-2.5 rounded-xl border border-kirana-200 hover:bg-kirana-50 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>

          <button
            onClick={generateQuotes}
            disabled={loading}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-sm transition-all ${
              loading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-950'
            }`}
          >
            {loading ? 'Analyzing...' : 'Get Estimated Quotes'}
          </button>
        </div>
        
        {error && <p className="text-xs text-red-500 mt-3 font-semibold text-center sm:text-left">{error}</p>}
        {/* Price comparison active */}
      </div>

      {quotes.length > 0 && (() => {
        // Find the cheapest store estimate to calculate a realistic online benchmark
        const cheapestQuote = quotes.reduce((cheapest, q) => {
          const avgQ = (q.min_estimate + q.max_estimate) / 2;
          const avgC = (cheapest.min_estimate + cheapest.max_estimate) / 2;
          return avgQ < avgC ? q : cheapest;
        }, quotes[0]);
        
        const onlineMin = Math.round(cheapestQuote.min_estimate * 1.15 + 15);
        const onlineMax = Math.round(cheapestQuote.max_estimate * 1.15 + 15);

        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
              <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <p><strong>Disclaimer:</strong> This is an estimated quote based on recent order history. Final seller pricing may vary.</p>
            </div>

            {/* Benchmark Card */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50/40 border border-red-150 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3 flex-1 text-left">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-red-600 text-base">
                  📱
                </div>
                <div>
                  <h4 className="font-black text-red-900 text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                    <span>Online Delivery Apps Benchmark</span>
                    <span className="text-[9px] bg-red-100 border border-red-250 text-red-750 px-1.5 py-0.5 rounded font-black uppercase whitespace-nowrap">Higher Cost</span>
                  </h4>
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                    Estimated total cost on Blinkit, Zepto, or Instamart (includes ~15% item price markup + ₹15 handling & platform fees).
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-red-100">
                <span className="text-[9px] uppercase font-black tracking-wider text-red-500">Estimated Cost</span>
                <span className="text-base sm:text-lg font-black text-red-700 line-through">₹{onlineMin} - ₹{onlineMax}</span>
              </div>
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-slate-800 pt-2">Available Local Options ({quotes.length})</h3>

            <div className="space-y-4">
              {quotes.map((quote) => {
                const savingsMin = Math.round(onlineMin - quote.min_estimate);
                const savingsMax = Math.round(onlineMax - quote.max_estimate);
                const avgSavings = Math.round((savingsMin + savingsMax) / 2);

                return (
                  <div key={quote.shop_id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-start space-x-3 flex-1 text-left">
                      <div className="w-10 h-10 bg-kirana-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-kirana-700" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h4 className="font-bold text-slate-900 text-base">{quote.shop_name}</h4>
                          {avgSavings > 0 && (
                            <span className="text-[9px] bg-emerald-50 border border-emerald-250 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap animate-pulse">
                              Save ~₹{avgSavings} compared to Online Apps
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Rating: {parseFloat(quote.rating).toFixed(1)} ★ • Items Found: {quote.items_found_ratio}</p>
                        
                        {/* Item price details preview */}
                        <div className="mt-2 text-[10px] text-slate-400 max-h-12 overflow-y-auto">
                          {quote.items_detail.map((idtl, idx) => (
                            <span key={idx} className="mr-2 inline-block">
                              {idtl.name}: {idtl.status === 'Estimated' ? `₹${idtl.estimated_price.toFixed(0)}` : 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center justify-between sm:items-end w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Estimated Cost</div>
                        <div className="text-lg font-black text-slate-900">₹{quote.min_estimate} - ₹{quote.max_estimate}</div>
                      </div>

                      <button
                        disabled
                        className="flex items-center justify-center space-x-1.5 bg-slate-100 text-slate-400 font-bold px-4 py-2 rounded-xl text-sm cursor-not-allowed border border-slate-200 mt-0 sm:mt-2"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Coming Soon</span>
                      </button>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {showComingSoon && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-premium animate-fade-in text-center space-y-6">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-amber-500/10 to-kirana-500/10 rounded-full border border-kirana-200">
            <span className="absolute inset-0 rounded-full bg-kirana-400/20 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <span className="text-2xl text-kirana-600">✨</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center px-3 py-1 bg-kirana-50 border border-kirana-200 text-kirana-800 text-[10px] font-black uppercase tracking-wider rounded-full">
              <span>Coming Soon</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              AI Price Comparison Engine
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Our automated price estimation model is indexing local market rates. Instant quotes and comparisons across nearby shops are coming soon!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-sm mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
              <span className="text-emerald-500">✓</span>
              <span>No convenience charges</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
              <span className="text-emerald-500">✓</span>
              <span>100% price transparency</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
              <span className="text-emerald-500">✓</span>
              <span>Verify before you pay</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
              <span className="text-emerald-500">✓</span>
              <span>Direct local store pricing</span>
            </div>
          </div>
        </div>
      )}

      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </div>
  );
};

export default CustomerQuotes;

