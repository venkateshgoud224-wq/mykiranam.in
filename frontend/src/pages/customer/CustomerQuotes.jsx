import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Search, Store, ArrowRight, ShieldAlert } from 'lucide-react';

const CustomerQuotes = ({ onSelectShop, onBackToShops }) => {
  const { apiUrl, token } = useAuth();
  
  const [items, setItems] = useState([{ id: 1, name: '', quantity: 1, unit: 'kg' }]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

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
      setShowComingSoon(false);
      return;
    }
    
    setError(null);
    setQuotes([]);
    setShowComingSoon(true);
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
        <h2 className="text-xl font-extrabold text-slate-900">Compare Prices</h2>
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
        {showComingSoon && (
          <div className="mt-4 p-4 bg-kirana-50 border border-kirana-200 rounded-xl text-center shadow-sm">
            <p className="text-sm font-bold text-kirana-800">Price comparison feature will be launched soon.</p>
          </div>
        )}
      </div>

      {quotes.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-start p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
            <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p><strong>Disclaimer:</strong> This is an estimated quote based on recent order history. Final seller pricing may vary.</p>
          </div>

          <h3 className="font-extrabold text-lg text-slate-800 pt-2">Available Options ({quotes.length})</h3>

          <div className="space-y-4">
            {quotes.map((quote) => (
              <div key={quote.shop_id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-10 h-10 bg-kirana-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-kirana-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{quote.shop_name}</h4>
                    <p className="text-xs text-slate-500">Rating: {parseFloat(quote.rating).toFixed(1)} ★ • Items Found: {quote.items_found_ratio}</p>
                    
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
                      // We could pass the digital items list to InstantOrder here if we modified onSelectShop / routing
                    }}
                    className="flex items-center justify-center space-x-1 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors mt-0 sm:mt-2"
                  >
                    <span>Order Here</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerQuotes;

