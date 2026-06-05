import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, Calendar, Store, ChevronLeft, CheckCircle2, Plus, Minus, Trash2, Edit3, ShoppingBag } from 'lucide-react';

const PREDEFINED_ITEMS = [
  { name: 'Rice', price: 43 },
  { name: 'Sugar', price: 42 },
  { name: 'Chapathi Flour (Atta)', price: 37 },
  { name: 'Bellam (Jaggery)', price: 55 },
  { name: 'Upma Rava (Suji/Bombay Rava)', price: 47 },
  { name: 'Sunflower Oil', price: 150 },
  { name: 'Toor Dal (Kandi Pappu)', price: 140 },
  { name: 'Moong Dal (Pesara Pappu)', price: 110 },
  { name: 'Urad Dal (Minapa Pappu)', price: 120 },
  { name: 'Chana Dal (Senaga Pappu)', price: 85 },
  { name: 'Mustard Seeds (Avalu)', price: 90 },
  { name: 'Cumin Seeds (Jeera)', price: 300 },
  { name: 'Salt (Tata)', price: 25 },
  { name: 'Turmeric Powder (Haldi)', price: 180 },
  { name: 'Red Chilli Powder', price: 250 },
  { name: 'Coriander Powder', price: 200 },
  { name: 'Groundnut Oil', price: 170 },
  { name: 'Poha (Atukulu)', price: 60 },
  { name: 'Vermicelli (Semiya)', price: 80 },
  { name: 'Tea Powder', price: 350 },
  { name: 'Coffee Powder', price: 500 },
  { name: 'Peanut (Palli)', price: 120 },
  { name: 'Ghee', price: 600 },
  { name: 'Tamarind', price: 130 },
  { name: 'Garlic', price: 250 },
  { name: 'Onion', price: 30 },
  { name: 'Potato', price: 35 },
  { name: 'Tomato', price: 40 },
  { name: 'Milk (1L)', price: 60 },
  { name: 'Curd (1kg)', price: 70 }
];

const InstantOrder = ({ selectedShop, onBackToShops, onTabChange }) => {
  const { token, apiUrl, user } = useAuth();
  const bannerUrl = selectedShop?.image_banner ? (selectedShop.image_banner.startsWith('http') ? selectedShop.image_banner : `${apiUrl.replace('/api', '')}${selectedShop.image_banner}`) : null;
  
  // Method selection: 'handwritten' or 'digital'
  const [orderMethod, setOrderMethod] = useState('handwritten');
  
  // Option 1: Handwritten
  const [chittiImage, setChittiImage] = useState(null);
  const [chittiPreview, setChittiPreview] = useState(null);
  
  // Option 2: Digital manual list
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemUnit, setItemUnit] = useState('KG');
  const [itemNotes, setItemNotes] = useState('');
  const [itemMrp, setItemMrp] = useState(0);
  
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [notes, setNotes] = useState('');
  const [preferredPickup, setPreferredPickup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const units = ['KG', 'Gram', 'Litre', 'Packet', 'Piece', 'Dozen', 'Box'];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB.');
        return;
      }
      setChittiImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setChittiPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Item name cannot be empty.');
      return;
    }
    setError('');

    const newItem = {
      id: Date.now().toString(),
      name: itemName.trim(),
      quantity: itemQty,
      unit: itemUnit,
      notes: itemNotes.trim(),
      mrp: itemMrp
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemQty('1');
    setItemNotes('');
    setItemMrp(0);
  };

  const handleItemNameChange = async (e) => {
    const val = e.target.value;
    setItemName(val);
    
    // Check predefined list
    const matched = PREDEFINED_ITEMS.find(item => item.name.toLowerCase() === val.toLowerCase() || item.name.toLowerCase().startsWith(val.toLowerCase()));
    
    let tempMrp = 0;
    if (val.length > 2 && matched) {
       tempMrp = matched.price;
    }
    setItemMrp(tempMrp);
    
    if (val.length > 2) {
      const localResults = PREDEFINED_ITEMS
        .filter(item => item.name.toLowerCase().includes(val.toLowerCase()))
        .map(item => ({ id: `local_${item.name}`, product_name: item.name, market_price: item.price, quantity_desc: 'Standard/1kg' }));

      try {
        const res = await fetch(`${apiUrl}/products/search?q=${val}`);
        const data = await res.json();
        
        const mergedResults = [...localResults];
        data.forEach(apiItem => {
          if (!mergedResults.some(local => local.product_name.toLowerCase() === apiItem.product_name.toLowerCase())) {
            mergedResults.push(apiItem);
          }
        });

        setSearchResults(mergedResults);
        setShowDropdown(mergedResults.length > 0);
      } catch(err) { 
        console.error('Search error:', err); 
        setSearchResults(localResults);
        setShowDropdown(localResults.length > 0);
      }
    } else {
      setShowDropdown(false);
    }
  };

  const selectProduct = (prod) => {
    setItemName(prod.product_name);
    if (prod.quantity_desc) {
      // Very basic parsing or just leave as is, since our units are fixed we can just use the note
      setItemNotes(prod.quantity_desc);
    }
    setItemMrp(prod.market_price || 0);
    setShowDropdown(false);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShop) {
      setError('Please go back and select a shop first.');
      return;
    }

    const isDigital = orderMethod === 'digital';

    if (!isDigital && !chittiImage) {
      setError('Please upload a snap of your handwritten grocery chitti.');
      return;
    }

    if (isDigital && items.length === 0) {
      setError('Please add at least one item to your digital list.');
      return;
    }

    if (!user?.verified_whatsapp) {
      sessionStorage.setItem('whatsapp_mandatory_alert', 'true');
      onTabChange('profile');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('shop_id', selectedShop.id);
    formData.append('notes', notes);
    formData.append('preferred_pickup_time', preferredPickup);
    formData.append('order_type', orderMethod);

    if (isDigital) {
      // Attach the estimated amount to the order body so backend knows
      const estimatedTotal = items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0);
      formData.append('digital_item_list', JSON.stringify(items));
      if (estimatedTotal > 0) {
        formData.append('estimated_amount', estimatedTotal);
      }
    } else {
      formData.append('original_chitti', chittiImage);
    }

    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(response.ok ? 'Failed to parse server response.' : `Server Error: ${text.substring(0, 100)}`);
      }
      
      if (!response.ok) throw new Error(data.error || 'Failed to place order.');

      setSuccess(true);
      setTimeout(() => {
        onTabChange('orders'); // Redirect to orders list
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error submitting order.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedShop) {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800">No shop selected</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Please select a store from the listing dashboard to proceed.</p>
        <button
          onClick={onBackToShops}
          className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs"
        >
          View Nearby Shops
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-premium pb-20">
      {/* Premium Banner Header */}
      <div className="w-full h-40 relative bg-gradient-to-br from-amber-500 to-orange-600">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={selectedShop.shop_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <Store className="w-12 h-12 text-white" />
          </div>
        )}
        
        {/* Soft bottom dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating Back Button */}
        <button
          onClick={onBackToShops}
          className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl transition-all shadow-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Shop Metadata Overlaid */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="text-[9px] uppercase font-black tracking-widest text-amber-450 drop-shadow-sm bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm w-fit block mb-1">
            Order Placement
          </span>
          <h2 className="text-lg font-black leading-tight drop-shadow-md">{selectedShop.shop_name}</h2>
          <p className="text-[9px] text-white/80 font-semibold drop-shadow-sm truncate mt-0.5">{selectedShop.address}</p>
        </div>
      </div>

      <div className="p-6">
        {success ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-16 h-16 bg-accent-emerald/10 text-accent-emerald rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Order Sent Successfully!</h3>
            <p className="text-xs text-slate-500">Wait times: ~{selectedShop.waiting_time} mins. Redirecting to My Orders...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Premium Ordering Option Toggles */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Select Order Method
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => { setOrderMethod('handwritten'); setError(''); }}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    orderMethod === 'handwritten'
                      ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4 text-kirana-600" />
                  <span>Handwritten Chitti</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderMethod('digital'); setError(''); }}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    orderMethod === 'digital'
                      ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Enter Items Digitally</span>
                </button>
              </div>
            </div>

            {/* FORM AREA */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* OPTION 1: HANDWRITTEN CHITTI PHOTO UPLOAD */}
              {orderMethod === 'handwritten' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Upload Handwritten grocery chitti (photo) <span className="text-crimson">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-kirana-500 rounded-2xl p-6 bg-slate-50/50 text-center transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      required={orderMethod === 'handwritten'}
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {chittiPreview ? (
                      <div className="space-y-2">
                        <img
                          src={chittiPreview}
                          alt="Chitti Preview"
                          className="max-h-40 mx-auto rounded-xl shadow-sm object-contain border border-slate-200"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Click or drag another image to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-bold text-slate-700">Take a photo or upload file</div>
                        <p className="text-[10px] text-slate-400 leading-normal max-w-[200px] mx-auto">
                          Ensure handwritten items, quantities, and brand instructions are readable in the frame.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OPTION 2: SMART DIGITAL GROCERY LIST GENERATOR */}
              {orderMethod === 'digital' && (
                <div className="space-y-4">
                  {/* Dynamic Entry Form Panel */}
                  <div className="p-4 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-3">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-kirana-500" />
                      <span>Add Grocery Item</span>
                    </h3>

                    <div className="space-y-2.5">
                      {/* Name input */}
                      <div className="space-y-1 relative">
                        <input
                          type="text"
                          placeholder="Item Name (e.g. Sugar, Fortune Rice)"
                          value={itemName}
                          onChange={handleItemNameChange}
                          onFocus={() => { if(searchResults.length > 0) setShowDropdown(true); }}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800"
                        />
                        
                        {/* Predictive Search Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map((prod) => (
                              <div 
                                key={prod.id}
                                onClick={() => selectProduct(prod)}
                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                              >
                                <div className="text-xs font-bold text-slate-800">{prod.product_name}</div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[10px] text-slate-500">{prod.quantity_desc}</span>
                                  <span className="text-[10px] font-semibold text-kirana-600">MRP: ₹{prod.market_price}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Qty & Unit inputs in a row */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Qty with Plus/Minus picker */}
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(itemQty);
                              if (!isNaN(current)) {
                                setItemQty(String(Math.max(0.5, current - 0.5)));
                              }
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={itemQty}
                            onChange={(e) => setItemQty(e.target.value)}
                            className="w-16 text-center text-xs font-bold focus:outline-none"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(itemQty);
                              if (!isNaN(current)) {
                                setItemQty(String(current + 0.5));
                              } else {
                                setItemQty('1');
                              }
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Unit picker */}
                        <select
                          value={itemUnit}
                          onChange={(e) => setItemUnit(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
                        >
                          {units.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes / Special Brand instructions */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Optional brand notes (e.g. only Tata brand, pack separate)"
                          value={itemNotes}
                          onChange={(e) => setItemNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-2.5 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-950 transition-all flex items-center justify-center space-x-1.5 text-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Item to List</span>
                      </button>
                    </div>
                  </div>

                  {/* Smart ruled-paper chitti Summary Card */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        <span>Smart Grocery Chitti Summary</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded-full">
                        {items.length} items
                      </span>
                    </div>

                    <div className="border border-slate-200 bg-amber-50/15 rounded-2xl p-4 min-h-[120px] shadow-sm relative overflow-hidden">
                      {/* Vertical line imitating notebook paper margin */}
                      <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200" />

                      {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                          <p className="text-[11px] font-bold text-slate-400 italic">
                            Your digital chitti is empty.<br />Add items above to generate.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 pl-4">
                          {items.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between border-b border-dashed border-slate-150 pb-1.5 group text-xs text-slate-800"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-slate-900">{index + 1}. {item.name}</span>
                                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[9px] font-black uppercase">
                                  {item.quantity} {item.unit}
                                </span>
                                {item.notes && (
                                  <span className="block text-[10px] text-slate-450 italic pl-3.5 mt-0.5">
                                    • {item.notes}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 hover:bg-crimson/5 text-slate-400 hover:text-crimson rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {items.length > 0 && items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0) > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-300 flex justify-between items-center text-sm pl-4">
                          <span className="font-black text-slate-800">Estimated Full Bill</span>
                          <span className="font-black text-kirana-600">
                            ₹{items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Optional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sellers Notes (Optional)</span>
                </label>
                <textarea
                  placeholder="e.g. Add 2kg Tata Salt, only pack Fortune Mustard oil. Keep pack size small."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800"
                />
              </div>

              {/* 3. Preferred pickup timings */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Preferred Pickup Time (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7:30 PM today, or tomorrow morning"
                  value={preferredPickup}
                  onChange={(e) => setPreferredPickup(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-kirana-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? 'Submitting Order Chitti...' : `Submit Order (Queue wait ~${selectedShop.waiting_time}m)`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantOrder;
