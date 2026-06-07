import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Search, Store, ArrowRight, ShieldAlert } from 'lucide-react';

const CustomerQuotes = ({ onSelectShop, onBackToShops }) => {
  const { apiUrl, token } = useAuth();
  
  const [items, setItems] = useState([{ id: 1, name: '', quantity: 1, unit: 'kg' }]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const units = ['kg', 'g', 'L', 'ml', 'unit', 'packet', 'dozen'];

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), name: '', quantity: 1, unit: 'kg' }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const generateQuotes = async () => {
    const validItems = items.filter(i => i.name.trim() !== '' && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid item.');
      setQuotes([]);
      return;
    }
    
    setError(null);
    setLoading(true);
    setQuotes([]);
    
    try {
      const response = await fetch(`${apiUrl}/quotes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemsList: validItems.map(item => ({
            name: item.name,
            quantity: parseFloat(item.quantity),
            unit: item.unit
          }))
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quotes.');
      }
      
      if (data.length === 0) {
        setError('No shops nearby have historical price data for these items. Try generic terms like sugar, rice, or oil.');
      } else {
        setQuotes(data);
      }
    } catch (err) {
      console.error('Error generating quotes:', err);
      setError(err.message || 'Something went wrong while comparing prices.');
    } finally {
      setLoading(false);
    }
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
        
        const onlineMin = Math.round(cheapestQuote.min_estimate * 1.15 + 35 + 15);
        const onlineMax = Math.round(cheapestQuote.max_estimate * 1.15 + 35 + 15);

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
                    Estimated total cost on Blinkit, Zepto, or Instamart (includes ~15% item price markup + ₹35 delivery + ₹15 handling & platform fees).
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
                        onClick={() => {
                          onSelectShop({ id: quote.shop_id, shop_name: quote.shop_name });
                        }}
                        className="flex items-center justify-center space-x-1 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors mt-0 sm:mt-2"
                      >
                        <span>Order Here</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CustomerQuotes;

