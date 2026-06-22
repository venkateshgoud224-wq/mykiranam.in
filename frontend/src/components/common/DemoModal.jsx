import React, { useState } from 'react';
import { X, Store, ShoppingCart, Info, Check, ArrowRight, TrendingDown, HelpCircle, FileText } from 'lucide-react';

const demoItems = [
  { id: 1, name: 'Basmati Rice (1kg)', mrp: 90 },
  { id: 2, name: 'Toor Dal (1kg)', mrp: 150 },
  { id: 3, name: 'Sunflower Oil (1L)', mrp: 140 },
  { id: 4, name: 'Sugar (1kg)', mrp: 45 },
  { id: 5, name: 'Aashirvaad Atta (5kg)', mrp: 260 },
  { id: 6, name: 'Amul Butter (500g)', mrp: 275 },
  { id: 7, name: 'Tata Salt (1kg)', mrp: 28 },
  { id: 8, name: 'Taj Mahal Tea (500g)', mrp: 350 },
  { id: 9, name: 'Dettol Handwash (750ml)', mrp: 119 },
  { id: 10, name: 'Surf Excel Powder (1kg)', mrp: 140 },
];

const demoShops = [
  {
    id: 1,
    name: 'Shop 1 (Sai Kirana)',
    address: 'Near Maruti Temple, Ward 3',
    rating: 4.5,
    distance: '0.4 km',
    prices: { 1: 90, 2: 145, 3: 138, 4: 45, 5: 250, 6: 270, 7: 28, 8: 340, 9: 115, 10: 135 },
    delivery: 'Free Delivery',
  },
  {
    id: 2,
    name: 'Shop 2 (Mahadev Store)',
    address: 'Main Road Crossroads, Ward 2',
    rating: 4.2,
    distance: '0.9 km',
    prices: { 1: 95, 2: 160, 3: 142, 4: 48, 5: 265, 6: 275, 7: 30, 8: 360, 9: 125, 10: 145 },
    delivery: '₹20 Delivery fee',
  },
  {
    id: 3,
    name: 'Shop 3 (Krishna Supermarket)',
    address: 'Ganesh Chowk Sector 4',
    rating: 4.8,
    distance: '1.2 km',
    prices: { 1: 85, 2: 135, 3: 130, 4: 40, 5: 240, 6: 265, 7: 24, 8: 330, 9: 109, 10: 130 },
    delivery: 'Free Delivery over ₹500',
  },
  {
    id: 4,
    name: 'Shop 4 (Balaji Traders)',
    address: 'Market Lane Block A',
    rating: 4.0,
    distance: '1.5 km',
    prices: { 1: 105, 2: 165, 3: 155, 4: 52, 5: 280, 6: 295, 7: 34, 8: 370, 9: 129, 10: 160 },
    delivery: '₹15 Delivery fee',
  },
  {
    id: 5,
    name: 'Shop 5 (Ganesh Kirana)',
    address: 'Station Road Near Petrol Pump',
    rating: 4.4,
    distance: '0.6 km',
    prices: { 1: 88, 2: 140, 3: 135, 4: 43, 5: 245, 6: 270, 7: 26, 8: 335, 9: 115, 10: 135 },
    delivery: 'Free Delivery',
  },
  {
    id: 6,
    name: 'Shop 6 (Maruti Groceries)',
    address: 'Ring Road Circle, Ward 5',
    rating: 4.1,
    distance: '2.1 km',
    prices: { 1: 110, 2: 170, 3: 160, 4: 55, 5: 275, 6: 300, 7: 32, 8: 368, 9: 134, 10: 165 },
    delivery: '₹30 Delivery fee',
  },
  {
    id: 7,
    name: 'Shop 7 (Saraswati Store)',
    address: 'Lakeview Avenue Road',
    rating: 4.6,
    distance: '0.8 km',
    prices: { 1: 100, 2: 150, 3: 145, 4: 45, 5: 255, 6: 280, 7: 28, 8: 350, 9: 120, 10: 140 },
    delivery: 'Free Store Pickup Only',
  },
];

// Helper to calculate totals
const calculateShopTotal = (shop) => {
  return demoItems.reduce((acc, item) => acc + (shop.prices[item.id] || 0), 0);
};

const marketTotal = demoItems.reduce((acc, item) => acc + item.mrp, 0);

const DemoModal = ({ onClose }) => {
  const [selectedShopId, setSelectedShopId] = useState(3); // Default to Shop 3 (Cheapest)
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [orderedShopName, setOrderedShopName] = useState('');
  const [activeView, setActiveView] = useState('summary'); // 'summary' or 'grid'

  const selectedShop = demoShops.find(s => s.id === selectedShopId);
  const shopTotal = selectedShop ? calculateShopTotal(selectedShop) : 0;
  
  // Calculate online benchmark (15% markup + ₹15 handling fee)
  const onlineBenchmarkTotal = Math.round(marketTotal * 1.15 + 15);

  const handleOrderClick = (shopName) => {
    setOrderedShopName(shopName);
    setShowOrderAlert(true);
    setTimeout(() => {
      setShowOrderAlert(false);
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-4xl text-slate-100 flex flex-col shadow-2xl overflow-hidden relative max-h-[90vh]">
        
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/10">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Interactive Live Demo</span>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                  AI Price Engine
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-400">Comparing prices of 10 essential items across 7 local shops</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Alert Banner */}
        {showOrderAlert && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-550/30 p-4 text-xs font-bold text-amber-250 flex items-start space-x-2.5 z-20 animate-fade-in">
            <span className="text-base">💡</span>
            <div className="flex-1">
              <p className="text-sm font-black text-amber-100">Order Button Clicked ({orderedShopName})</p>
              <p className="mt-1 font-semibold text-amber-300">
                This is a demo comparison screen. In the live system, clicking this immediately places an order by exporting your shopping list, coordinating with the shopkeeper over WhatsApp, and saving your delivery/pickup details!
              </p>
              <p className="mt-1.5 font-bold text-emerald-400">
                Register or Sign In with an account to access real-time local stores and place actual orders!
              </p>
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="px-6 pt-4 flex border-b border-slate-800 bg-slate-900/40">
          <button
            onClick={() => setActiveView('summary')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold border-b-2 px-4 transition-all ${
              activeView === 'summary'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Store Wise Comparison
          </button>
          <button
            onClick={() => setActiveView('grid')}
            className={`pb-3 text-xs uppercase tracking-wider font-extrabold border-b-2 px-4 transition-all ${
              activeView === 'grid'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔍 Full Item Price Matrix
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* VIEW 1: Store Wise Comparison Summary */}
          {activeView === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left Column: List of 7 Shops */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider pl-1">Nearby Stores (7 found)</h3>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {demoShops.map((shop) => {
                    const total = calculateShopTotal(shop);
                    const isCheapest = shop.id === 3;
                    const isSelected = shop.id === selectedShopId;
                    
                    return (
                      <button
                        key={shop.id}
                        onClick={() => setSelectedShopId(shop.id)}
                        className={`w-full text-left p-4.5 rounded-2xl border transition-all flex justify-between items-center ${
                          isSelected
                            ? 'bg-slate-800/80 border-emerald-500/80 shadow-md shadow-emerald-500/5'
                            : 'bg-slate-805/40 bg-slate-900 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1 pr-2">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className={`text-xs font-black ${isSelected ? 'text-emerald-400' : 'text-slate-100'}`}>
                              {shop.name}
                            </span>
                            {isCheapest && (
                              <span className="text-[8px] bg-emerald-500 text-slate-950 font-black uppercase px-1.5 py-0.5 rounded-md">
                                Best Deal
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 flex items-center space-x-2">
                            <span>⭐ {shop.rating}</span>
                            <span>•</span>
                            <span>📍 {shop.distance}</span>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <span className="block text-[9px] uppercase font-bold text-slate-500">Cart Total</span>
                          <span className={`text-sm font-black ${isCheapest ? 'text-emerald-400' : 'text-slate-100'}`}>
                            ₹{total}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed Receipt & Insights of Selected Shop */}
              <div className="md:col-span-3 space-y-4">
                
                {/* Receipt Card */}
                {selectedShop && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 relative">
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-100">{selectedShop.name} Receipt</h4>
                        <p className="text-[10px] font-semibold text-slate-500">{selectedShop.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px] font-bold">
                          {selectedShop.delivery}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Items list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {demoItems.map((item) => {
                        const shopPrice = selectedShop.prices[item.id];
                        const diff = shopPrice - item.mrp;
                        
                        return (
                          <div key={item.id} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-300">{item.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-500 line-through">₹{item.mrp}</span>
                              <span className="font-bold text-slate-100">₹{shopPrice}</span>
                              {diff !== 0 ? (
                                <span className={`text-[9px] font-bold px-1 rounded ${
                                  diff < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {diff < 0 ? `-₹${Math.abs(diff)}` : `+₹${diff}`}
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold bg-slate-800 text-slate-500 px-1 rounded">
                                  Same
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pricing Totals and Savings calculations */}
                    <div className="border-t border-slate-800 pt-4 space-y-2">
                      {/* Online delivery benchmark */}
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Online Delivery Apps Total (Blinkit/Instamart):</span>
                        <span className="font-semibold text-red-400 line-through">₹{onlineBenchmarkTotal}</span>
                      </div>

                      {/* Store Total */}
                      <div className="flex justify-between items-center text-sm font-extrabold text-slate-100 pt-1">
                        <span>Simulated Cart Total at Store:</span>
                        <span className="text-base text-emerald-400 font-black">₹{shopTotal}</span>
                      </div>

                      {/* Savings calculation */}
                      {onlineBenchmarkTotal - shopTotal > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400 flex items-center justify-between font-bold mt-2">
                          <div className="flex items-center space-x-1.5">
                            <span>🎉</span>
                            <span>Est. Savings vs Online Delivery Apps:</span>
                          </div>
                          <span className="text-sm font-black">₹{onlineBenchmarkTotal - shopTotal} Savings</span>
                        </div>
                      )}
                    </div>

                    {/* Order Action Button */}
                    <button
                      onClick={() => handleOrderClick(selectedShop.name)}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Order from this Store (Demo Only)</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW 2: Full Price Grid Matrix */}
          {activeView === 'grid' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p>
                  This grid details item-by-item prices across all <strong>7 shops</strong>. Notice the price difference ranges from <strong>₹10 to ₹40</strong> per item across different stores, with some stores keeping matching/identical prices!
                </p>
              </div>

              {/* Responsive Table Wrapper */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full border-collapse text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[150px]">Grocery Item (10 total)</th>
                      <th className="p-3 text-center">Market MRP</th>
                      {demoShops.map(s => (
                        <th key={s.id} className={`p-3 text-center ${s.id === 3 ? 'text-emerald-400 font-extrabold bg-emerald-500/5' : ''}`}>
                          {s.name.split(' ')[0]} <br/> <span className="text-[8px] font-normal text-slate-500">({s.distance})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {demoItems.map((item) => {
                      // Calculate the max spread for this item
                      const pricesArr = demoShops.map(s => s.prices[item.id]);
                      const minPrice = Math.min(...pricesArr);
                      const maxPrice = Math.max(...pricesArr);
                      const spread = maxPrice - minPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3 font-bold text-slate-100 sticky left-0 bg-slate-900 border-r border-slate-800">
                            {item.name}
                            <span className="block text-[8px] font-normal text-slate-500 mt-0.5">
                              Price Spread: ₹{spread}
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-400 bg-slate-950/20">₹{item.mrp}</td>
                          {demoShops.map((shop) => {
                            const price = shop.prices[item.id];
                            const isMin = price === minPrice;
                            const isMax = price === maxPrice;
                            
                            return (
                              <td 
                                key={shop.id} 
                                className={`p-3 text-center ${
                                  shop.id === 3 ? 'bg-emerald-500/5' : ''
                                }`}
                              >
                                <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                  isMin 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : isMax 
                                    ? 'bg-red-500/10 text-red-400/80 border border-red-500/10' 
                                    : 'text-slate-300'
                                }`}>
                                  ₹{price}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-slate-950/40 font-black text-slate-100 border-t border-slate-800">
                      <td className="p-3 sticky left-0 bg-slate-900 border-r border-slate-800 font-extrabold">Total Simulated Cart</td>
                      <td className="p-3 text-center text-slate-400">₹{marketTotal}</td>
                      {demoShops.map((shop) => {
                        const total = calculateShopTotal(shop);
                        const isCheapest = shop.id === 3;
                        return (
                          <td 
                            key={shop.id} 
                            className={`p-3 text-center ${
                              isCheapest 
                                ? 'text-emerald-400 font-black bg-emerald-500/10 border-t border-emerald-500/30' 
                                : ''
                            }`}
                          >
                            ₹{total}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Order Buttons Grid below price matrix */}
              <div className="pt-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider pl-1 mb-3">Place Quick Order (Select Store)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {demoShops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => handleOrderClick(shop.name)}
                      className="px-2 py-2.5 bg-slate-800 border border-slate-700 hover:border-emerald-500/80 hover:bg-slate-750 text-slate-200 text-[10px] font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] text-center"
                    >
                      Order from<br/>
                      <strong className="text-slate-100 font-extrabold block mt-0.5 text-xs">Shop {shop.id}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/45 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="font-semibold text-slate-350">Interactive Hyperlocal Grocery Engine Simulation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-100 font-extrabold rounded-xl transition-colors w-full sm:w-auto"
          >
            Close Demo
          </button>
        </div>

      </div>
    </div>
  );
};

export default DemoModal;
