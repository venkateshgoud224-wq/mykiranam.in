import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, Calendar, Store, ChevronLeft, CheckCircle2, Plus, Minus, Trash2, Edit3, ShoppingBag, Search, Check, X, Edit } from 'lucide-react';
import OrderVerification from './OrderVerification';

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

  // States and helpers for editing items in summary
  const [editingItemId, setEditingItemId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('KG');
  const [editNotes, setEditNotes] = useState('');
  const [editMrp, setEditMrp] = useState(0);
  const [editName, setEditName] = useState('');

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditQty(item.quantity);
    setEditUnit(item.unit || 'KG');
    setEditNotes(item.notes || '');
    setEditMrp(item.mrp || 0);
    setEditName(item.name || '');
  };

  const saveEdit = (itemId) => {
    if (!editName.trim()) {
      setError('Item name cannot be empty.');
      return;
    }
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, name: editName.trim(), quantity: editQty, unit: editUnit, notes: editNotes.trim(), mrp: parseFloat(editMrp) || 0 }
        : item
    ));
    setEditingItemId(null);
  };

  const handleUpdateQty = (itemId, newQty) => {
    const parsed = parseFloat(newQty);
    if (isNaN(parsed) || parsed <= 0) {
      handleRemoveItem(itemId);
    } else {
      setItems(items.map(item => 
        item.id === itemId 
          ? { ...item, quantity: String(parsed) }
          : item
      ));
    }
  };
  
  const [notes, setNotes] = useState('');
  const [preferredPickup, setPreferredPickup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [showFulfillmentForm, setShowFulfillmentForm] = useState(false);

  // Feature 2: Delivery & Location variables
  const defaultFulfillment = (selectedShop?.delivery_option === 'Delivery Only' && selectedShop?.home_delivery_ready) ? 'Delivery' : 'Pickup';
  const [fulfillmentMethod, setFulfillmentMethod] = useState(defaultFulfillment);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || user?.whatsapp_number || '');
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const units = ['KG', 'Gram', 'Litre', 'Packet', 'Piece', 'Dozen', 'Box'];

  const [shopCatalog, setShopCatalog] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [showManualForm, setShowManualForm] = useState(false);

  const isCatalogMode = selectedShop?.catalog_enabled !== false && shopCatalog.length > 0;

  useEffect(() => {
    if (selectedShop && selectedShop.id) {
      const fetchCatalog = async () => {
        setCatalogLoading(true);
        try {
          const res = await fetch(`${apiUrl}/seller-products/shop/${selectedShop.id}`);
          if (res.ok) {
            const data = await res.json();
            const products = data.products || [];
            setShopCatalog(products);
            setCatalogCategories(data.categories || []);
            // Always allow user to choose order method
          }
        } catch (err) {
          console.error("Error fetching shop catalog:", err);
        } finally {
          setCatalogLoading(false);
        }
      };
      fetchCatalog();
    }
  }, [selectedShop]);

  const handleCatalogAdd = (prod) => {
    const existing = items.find(item => item.name.toLowerCase() === prod.product_name.toLowerCase());
    if (existing) {
      setItems(items.map(item => 
        item.name.toLowerCase() === prod.product_name.toLowerCase()
          ? { ...item, quantity: String(parseFloat(item.quantity) + 1) }
          : item
      ));
    } else {
      const newItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: prod.product_name,
        quantity: '1',
        unit: prod.unit,
        notes: '',
        mrp: parseFloat(prod.price)
      };
      setItems([...items, newItem]);
    }
  };

  const handleCatalogDecrement = (prod) => {
    const existing = items.find(item => item.name.toLowerCase() === prod.product_name.toLowerCase());
    if (!existing) return;

    const currentQty = parseFloat(existing.quantity);
    if (currentQty <= 1) {
      setItems(items.filter(item => item.name.toLowerCase() !== prod.product_name.toLowerCase()));
    } else {
      setItems(items.map(item => 
        item.name.toLowerCase() === prod.product_name.toLowerCase()
          ? { ...item, quantity: String(currentQty - 1) }
          : item
      ));
    }
  };

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

  const handleProceedToCheckout = (e) => {
    e.preventDefault();
    if (orderMethod === 'handwritten' && !chittiImage) {
      setError('Please upload a snap of your handwritten grocery chitti.');
      return;
    }
    if (orderMethod === 'digital' && items.length === 0) {
      setError('Please add at least one item to your digital list.');
      return;
    }
    setError('');
    setShowFulfillmentForm(true);
  };

  const handleItemNameChange = (e) => {
    const val = e.target.value;
    setItemName(val);
    
    if (isCatalogMode && shopCatalog && shopCatalog.length > 0) {
      // Find a matching catalog item to pre-set price and unit if typed/started exactly
      const matched = shopCatalog.find(item => 
        item.product_name.toLowerCase() === val.toLowerCase() || 
        item.product_name.toLowerCase().startsWith(val.toLowerCase())
      );
      
      let tempMrp = 0;
      if (val.length > 2 && matched) {
        tempMrp = parseFloat(matched.price) || 0;
        setItemUnit(matched.unit || 'KG');
      }
      setItemMrp(tempMrp);

      if (val.length > 1) {
        const filtered = shopCatalog
          .filter(item => item.product_name.toLowerCase().includes(val.toLowerCase()))
          .map(item => ({
            id: item.id,
            product_name: item.product_name,
            market_price: parseFloat(item.price) || 0,
            quantity_desc: `${item.quantity} ${item.unit} available`,
            unit: item.unit
          }));
        setSearchResults(filtered);
        setShowDropdown(filtered.length > 0);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } else {
      setItemMrp(0);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const selectProduct = (prod) => {
    setItemName(prod.product_name);
    if (prod.quantity_desc) {
      setItemNotes(prod.quantity_desc);
    }
    setItemMrp(prod.market_price || 0);
    if (prod.unit) {
      setItemUnit(prod.unit);
    }
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
    formData.append('preferred_pickup_time', fulfillmentMethod === 'Pickup' ? preferredPickup : '');
    formData.append('order_type', orderMethod);
    formData.append('fulfillment_method', fulfillmentMethod);
    
    if (fulfillmentMethod === 'Delivery') {
      formData.append('delivery_address', deliveryAddress);
      formData.append('delivery_landmark', deliveryLandmark);
      formData.append('delivery_phone', deliveryPhone);
      if (deliveryLat) formData.append('delivery_latitude', deliveryLat);
      if (deliveryLng) formData.append('delivery_longitude', deliveryLng);
    }

    let estimatedTotal = 0;
    if (isDigital) {
      // Attach the estimated amount to the order body so backend knows
      estimatedTotal = items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0);
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

      // TEMPORARY BYPASS: Directly show payment screen for digital orders with amount ONLY IF catalog is enabled/present
      if (isDigital && estimatedTotal > 0 && isCatalogMode) {
         setPlacedOrder(data);
         return;
      }

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

  if (placedOrder) {
    return (
      <OrderVerification
        order={placedOrder}
        initialViewState="pay"
        onBack={() => { setPlacedOrder(null); onTabChange('orders'); }}
        onVerifySuccess={() => onTabChange('orders')}
      />
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
            {!showFulfillmentForm && (
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
            )}

            {/* FORM AREA */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!showFulfillmentForm ? (
                <>
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
                      {catalogLoading ? (
                        <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
                          Loading store product catalog...
                        </div>
                      ) : isCatalogMode ? (
                        <div className="space-y-4">
                          {/* Catalog Search & Category Filter */}
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                placeholder={`Search ${selectedShop.shop_name}'s catalog...`}
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-800"
                              />
                            </div>

                            <div className="flex flex-wrap gap-1 items-center">
                              <button
                                type="button"
                                onClick={() => setCatalogCategory('All')}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                                  catalogCategory === 'All'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-505 border-slate-200 hover:bg-slate-50'
                                  }`}
                              >
                                All
                              </button>
                              {catalogCategories.map(cat => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setCatalogCategory(cat)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                                    catalogCategory === cat
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                      : 'bg-white text-slate-550 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Catalog Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 text-left">
                            {shopCatalog.filter(prod => {
                              const matchesSearch = prod.product_name.toLowerCase().includes(catalogSearch.toLowerCase());
                              const matchesCategory = catalogCategory === 'All' || prod.category === catalogCategory;
                              return matchesSearch && matchesCategory;
                            }).map(prod => {
                              const cartItem = items.find(item => item.name.toLowerCase() === prod.product_name.toLowerCase());
                              const qtyInCart = cartItem ? parseFloat(cartItem.quantity) : 0;
                              const isOutOfStock = parseFloat(prod.quantity) <= 0;

                              return (
                                <div key={prod.id} className="p-3 border border-slate-150 rounded-2xl bg-white flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
                                  <div className="min-w-0 pr-2">
                                    <h4 className="text-xs font-black text-slate-900 truncate">{prod.product_name}</h4>
                                    <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-450">
                                      <span className="font-bold text-kirana-600">₹{parseFloat(prod.price).toFixed(2)}</span>
                                      <span>/</span>
                                      <span className="uppercase font-bold">{prod.unit}</span>
                                      {!isOutOfStock && (
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold">
                                          Stock: {prod.quantity}
                                        </span>
                                      )}
                                    </div>
                                    {isOutOfStock && (
                                      <span className="text-[8px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded font-bold inline-block mt-1">
                                        Out of Stock
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-shrink-0">
                                    {isOutOfStock ? (
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Sold Out</span>
                                    ) : qtyInCart > 0 ? (
                                      <div className="flex items-center space-x-2 bg-slate-900 text-white rounded-xl px-2 py-1 shadow-sm">
                                        <button
                                          type="button"
                                          onClick={() => handleCatalogDecrement(prod)}
                                          className="font-bold text-xs hover:text-amber-400 px-1.5"
                                        >
                                          -
                                        </button>
                                        <span className="text-xs font-black min-w-[12px] text-center">{qtyInCart}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCatalogAdd(prod)}
                                          className="font-bold text-xs hover:text-amber-400 px-1.5"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleCatalogAdd(prod)}
                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm"
                                      >
                                        + Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {shopCatalog.filter(prod => {
                              const matchesSearch = prod.product_name.toLowerCase().includes(catalogSearch.toLowerCase());
                              const matchesCategory = catalogCategory === 'All' || prod.category === catalogCategory;
                              return matchesSearch && matchesCategory;
                            }).length === 0 && (
                              <div className="col-span-full py-6 text-center text-xs font-bold text-slate-400 italic">
                                No matching products found in store catalog.
                              </div>
                            )}
                          </div>


                        </div>
                      ) : (
                        /* Default Form when catalog is empty / disabled */
                        <div className="p-4 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-3 text-left">
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-kirana-500" />
                            <span>Add Grocery Item</span>
                          </h3>

                          <div className="space-y-2.5">
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

                            <div className="grid grid-cols-2 gap-2">
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

                              <select
                                value={itemUnit}
                                onChange={(e) => setItemUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
                              >
                                {Array.from(new Set([...units, itemUnit])).filter(Boolean).map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>

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
                      )}

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
                              {items.map((item, index) => {
                                const isEditing = editingItemId === item.id;
                                return (
                                  <div
                                    key={item.id}
                                    className="border-b border-dashed border-slate-150 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0 transition-all duration-200"
                                  >
                                    {isEditing ? (
                                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-2 mt-1 text-left">
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Item Name"
                                            className="flex-grow px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
                                          />
                                          <input
                                            type="number"
                                            value={editMrp}
                                            onChange={(e) => setEditMrp(e.target.value)}
                                            placeholder="Price"
                                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
                                          />
                                        </div>
                                        <div className="flex gap-2 items-center">
                                          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-1 py-0.5">
                                            <button
                                              type="button"
                                              onClick={() => setEditQty(String(Math.max(0.5, (parseFloat(editQty) || 0) - 0.5)))}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                              type="text"
                                              value={editQty}
                                              onChange={(e) => setEditQty(e.target.value)}
                                              className="w-10 text-center text-xs font-bold focus:outline-none text-slate-800"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setEditQty(String((parseFloat(editQty) || 0) + 0.5))}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <select
                                            value={editUnit}
                                            onChange={(e) => setEditUnit(e.target.value)}
                                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:border-kirana-500 focus:outline-none text-slate-850"
                                          >
                                            {units.map((u) => (
                                              <option key={u} value={u}>{u}</option>
                                            ))}
                                          </select>
                                          <div className="flex-grow" />
                                          <button
                                            type="button"
                                            onClick={() => saveEdit(item.id)}
                                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                                            title="Save"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingItemId(null)}
                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all"
                                            title="Cancel"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={editNotes}
                                          onChange={(e) => setEditNotes(e.target.value)}
                                          placeholder="Notes/Instructions"
                                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between text-xs text-slate-800">
                                        <div className="min-w-0 pr-2 flex-grow text-left">
                                          <span className="font-semibold text-slate-900">{index + 1}. {item.name}</span>
                                          {item.mrp > 0 && (
                                            <span className="ml-2 text-[10px] font-bold text-kirana-600">
                                              ₹{parseFloat(item.mrp).toFixed(2)}
                                            </span>
                                          )}
                                          <div className="flex items-center space-x-1.5 mt-0.5">
                                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/50 rounded text-[9px] font-black uppercase">
                                              {item.quantity} {item.unit}
                                            </span>
                                            {item.notes && (
                                              <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                                                ({item.notes})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                          {/* Quick Adjust Quantity Controls */}
                                          <div className="flex items-center bg-slate-100 rounded-lg px-1 py-0.5 border border-slate-200/40">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentQty = parseFloat(item.quantity) || 0;
                                                const step = ['packet', 'piece', 'box', 'dozen'].includes(item.unit?.toLowerCase()) ? 1 : 0.5;
                                                handleUpdateQty(item.id, currentQty - step);
                                              }}
                                              className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-all"
                                              title="Decrease Qty"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="px-1 text-[10px] font-black text-slate-800 min-w-[16px] text-center">
                                              {item.quantity}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentQty = parseFloat(item.quantity) || 0;
                                                const step = ['packet', 'piece', 'box', 'dozen'].includes(item.unit?.toLowerCase()) ? 1 : 0.5;
                                                handleUpdateQty(item.id, currentQty + step);
                                              }}
                                              className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-all"
                                              title="Increase Qty"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>

                                          {/* Edit Button */}
                                          <button
                                            type="button"
                                            onClick={() => startEditing(item)}
                                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                                            title="Edit Item"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>

                                          {/* Delete Button */}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-1 hover:bg-crimson/5 text-slate-400 hover:text-crimson rounded-lg transition-all"
                                            title="Delete Item"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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

                  {/* Proceed to checkout button */}
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-kirana-500/10 active:scale-[0.99] transition-all"
                  >
                    {orderMethod === 'handwritten' ? 'Continue' : (!isCatalogMode ? 'Place Order' : 'Proceed to Pay')}
                  </button>
                </>
              ) : (
                <>
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setShowFulfillmentForm(false)}
                    className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-extrabold pb-2"
                  >
                    <span>← Back to editing list</span>
                  </button>

                  {/* Fulfillment Option Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Select Fulfillment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {selectedShop.delivery_option !== 'Delivery Only' && (
                        <button
                          type="button"
                          onClick={() => setFulfillmentMethod('Pickup')}
                          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            fulfillmentMethod === 'Pickup'
                              ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <span>🏪 Store Pickup</span>
                        </button>
                      )}
                      {['Delivery Only', 'Pickup + Delivery'].includes(selectedShop.delivery_option) && (
                        <button
                          type="button"
                          onClick={() => setFulfillmentMethod('Delivery')}
                          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            fulfillmentMethod === 'Delivery'
                              ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <span>🛵 Home Delivery</span>
                        </button>
                      )}
                    </div>

                    {/* Show delivery estimates if delivery option is selected */}
                    {fulfillmentMethod === 'Delivery' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-[10px] text-emerald-800 font-bold flex justify-between items-center animate-fadeIn">
                        <span>Est. Delivery Charges: ₹{parseFloat(selectedShop.delivery_charges || 0).toFixed(2)}</span>
                        <span>Est. Delivery Time: {selectedShop.delivery_time || '30 mins'}</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Details Form */}
                  {fulfillmentMethod === 'Delivery' && (
                    <div className="p-4 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-3.5 animate-fadeIn">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>🛵 Delivery Information</span>
                      </h3>

                      <div className="space-y-3">
                        {/* Delivery Address */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Delivery Address <span className="text-crimson">*</span></label>
                          <textarea
                            required={fulfillmentMethod === 'Delivery'}
                            placeholder="Enter your full street address, flat/house number..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            rows={2}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-850 font-semibold"
                          />
                        </div>

                        {/* Landmark */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Landmark <span className="text-crimson">*</span></label>
                          <input
                            type="text"
                            required={fulfillmentMethod === 'Delivery'}
                            placeholder="e.g. Opposite Metro Station, Near Park"
                            value={deliveryLandmark}
                            onChange={(e) => setDeliveryLandmark(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-850 font-semibold"
                          />
                        </div>

                        {/* Mobile Number */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Mobile Number <span className="text-crimson">*</span></label>
                          <input
                            type="text"
                            required={fulfillmentMethod === 'Delivery'}
                            placeholder="Enter 10-digit mobile number"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-850 font-semibold"
                          />
                        </div>

                        {/* Share Geolocation */}
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-600">Accurate Location Coordinates</label>
                            <button
                              type="button"
                              disabled={fetchingLocation}
                              onClick={() => {
                                if (!navigator.geolocation) {
                                  alert("Geolocation not supported by browser.");
                                  return;
                                }
                                setFetchingLocation(true);
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => {
                                    setDeliveryLat(pos.coords.latitude.toFixed(6));
                                    setDeliveryLng(pos.coords.longitude.toFixed(6));
                                    setLocationSuccess("📍 Accurate location coordinates captured successfully!");
                                    setFetchingLocation(false);
                                  },
                                  (err) => {
                                    console.error(err);
                                    alert("Failed to fetch location. Please ensure location permissions are enabled.");
                                    setFetchingLocation(false);
                                  },
                                  { enableHighAccuracy: true, timeout: 10000 }
                                );
                              }}
                              className="text-[10px] font-bold text-kirana-600 bg-kirana-50 hover:bg-kirana-100 px-3 py-1.5 rounded-lg border border-kirana-200 flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                              <span>📍</span> {fetchingLocation ? 'Fetching...' : 'Share Current Location'}
                            </button>
                          </div>

                          {locationSuccess && (
                            <div className="p-2 bg-emerald-50 border border-emerald-255 text-emerald-800 font-bold rounded-xl text-[9px]">
                              {locationSuccess} ({deliveryLat}, {deliveryLng})
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-850"
                    />
                  </div>

                  {/* 3. Preferred pickup timings */}
                  {fulfillmentMethod === 'Pickup' && (
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-450 text-slate-855"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-kirana-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (orderMethod === 'handwritten' || !isCatalogMode ? 'Place Order' : (orderMethod === 'digital' && items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0) > 0 ? `Pay Now ₹${items.reduce((sum, item) => sum + (parseFloat(item.mrp) * parseFloat(item.quantity) || 0), 0).toFixed(2)}` : 'Pay Now'))}
                  </button>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantOrder;
