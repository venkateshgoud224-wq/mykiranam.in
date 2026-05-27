import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Search, Star, Clock, MapPin, Compass, AlertCircle, Filter, ArrowUpDown, Award, CheckCircle, Store } from 'lucide-react';

const NearbyShops = ({ coords, onSelectShop, onTabChange }) => {
  const { token, apiUrl } = useAuth();
  const { latestShopUpdate } = useSocket();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, sorting & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterNearby, setFilterNearby] = useState(false);

  // Fetch shops
  const fetchShops = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        lat: coords?.latitude || 12.9716,
        lng: coords?.longitude || 77.5946,
        sort: sortBy !== 'default' ? sortBy : '',
        filterAvailable: filterAvailable ? 'true' : 'false',
        filterVerified: filterVerified ? 'true' : 'false',
        filterNearby: filterNearby ? 'true' : 'false'
      });

      const response = await fetch(`${apiUrl}/shops?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setShops(data);
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [coords, sortBy, filterAvailable, filterVerified, filterNearby]);

  // WebSocket updates
  useEffect(() => {
    if (latestShopUpdate) {
      setShops(prevShops =>
        prevShops.map(shop =>
          shop.id === latestShopUpdate.shopId
            ? {
                ...shop,
                availability_status: latestShopUpdate.availabilityStatus,
                active_orders: latestShopUpdate.activeOrders,
                waiting_time: latestShopUpdate.waitingTime,
                ...(latestShopUpdate.imageBanner ? { image_banner: latestShopUpdate.imageBanner } : {})
              }
            : shop
        )
      );
    }
  }, [latestShopUpdate]);

  const filteredShops = shops.filter(shop =>
    shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Crowd Balancing System
  const getLessBusyAlternative = () => {
    const freeShops = shops.filter(s => s.availability_status === 'Available' && s.active_orders <= 1);
    const busyShopsExist = shops.some(s => s.availability_status === 'Busy' || s.active_orders >= 4);
    
    if (busyShopsExist && freeShops.length > 0) {
      return freeShops[0];
    }
    return null;
  };

  const alternativeShop = getLessBusyAlternative();

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Crowd Distribution Recommendation */}
      {alternativeShop && (
        <div className="p-4 bg-kirana-100/60 border border-kirana-300 rounded-2xl flex items-start space-x-3 shadow-sm animate-pulse-ring">
          <AlertCircle className="w-5 h-5 text-kirana-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-extrabold text-kirana-950">Intelligent Crowd Routing:</span>
            <p className="text-slate-700 mt-1">
              Some stores in your area are currently crowded. Consider ordering from{' '}
              <strong className="text-slate-900 font-bold">{alternativeShop.shop_name}</strong> which is accepting orders immediately with a short wait of{' '}
              <span className="font-extrabold text-kirana-700">{alternativeShop.waiting_time} mins</span>!
            </p>
            <button
              onClick={() => {
                if (alternativeShop.availability_status !== 'Offline') {
                  onSelectShop(alternativeShop);
                  onTabChange('instant-order');
                }
              }}
              className="mt-2.5 px-3 py-1.5 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-bold rounded-lg transition-all"
            >
              Order from {alternativeShop.shop_name.split(' ')[0]}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col space-y-3">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
          <span>Explore Verified Nearby Stores</span>
          <span className="text-xs font-normal text-slate-500">({filteredShops.length} active)</span>
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search verified stores by name or street..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800 shadow-sm"
          />
        </div>

        {/* Sorting & Filter Controls */}
        <div className="flex flex-wrap gap-2 pt-1.5">
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm text-xs font-semibold text-slate-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none"
            >
              <option value="default">Default (Queue Balanced)</option>
              <option value="nearest">Nearest Distance</option>
              <option value="rating">Best Rated</option>
              <option value="waiting_time">Lowest Waiting Time</option>
              <option value="discounts">Best Discounts</option>
              <option value="available">Most Available</option>
            </select>
          </div>

          <button
            onClick={() => setFilterAvailable(!filterAvailable)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all flex items-center space-x-1 ${
              filterAvailable
                ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                : 'bg-white text-slate-655 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Available Only</span>
          </button>

          <button
            onClick={() => setFilterVerified(!filterVerified)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all flex items-center space-x-1 ${
              filterVerified
                ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                : 'bg-white text-slate-655 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Star className="w-3 h-3" />
            <span>Verified only</span>
          </button>

          <button
            onClick={() => setFilterNearby(!filterNearby)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all flex items-center space-x-1 ${
              filterNearby
                ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                : 'bg-white text-slate-655 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span>Nearby (&lt; 5km)</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Locating verified stores...
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm">
          <Compass className="w-10 h-10 text-slate-350 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No Verified Stores Active</h4>
          <p className="text-xs text-slate-500 mt-1">Sellers must undergo admin verification before appearing publicly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredShops.map((shop) => {
            const isAvailable = shop.availability_status === 'Available';
            const isBusy = shop.availability_status === 'Busy';
            const isOffline = shop.availability_status === 'Offline';
            const ratingNumber = parseFloat(shop.rating) || 4.0;
            const bannerUrl = shop.image_banner ? (shop.image_banner.startsWith('http') ? shop.image_banner : `${apiUrl.replace('/api', '')}${shop.image_banner}`) : null;

            return (
              <div
                key={shop.id}
                className={`group relative bg-white border border-slate-100 rounded-3xl p-5 shadow-premium hover:shadow-premium-hover transition-all flex flex-col justify-between ${
                  isOffline ? 'opacity-60 saturate-50 pointer-events-none bg-slate-50' : ''
                }`}
              >
                {isBusy && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-3xl" />
                )}

                <div className="space-y-4">
                  {/* Shop header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                          {shop.shop_name}
                        </h3>
                        {/* Verified Badge */}
                        <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5" title="Verified Trusted Seller">
                          <CheckCircle className="w-3.5 h-3.5 fill-blue-500 text-white" />
                        </span>
                      </div>
                      
                      {/* Trusted Tag & verification date */}
                      <div className="flex items-center space-x-1 text-[9px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100 self-start w-fit">
                        <Award className="w-3 h-3 text-blue-500 mr-0.5" />
                        <span>Trusted Seller</span>
                        {shop.verification_date && (
                          <span className="text-slate-400 font-normal ml-1">
                            • Approved {new Date(shop.verification_date).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] sm:max-w-xs truncate" title={shop.address}>
                        {shop.address}
                      </p>
                    </div>

                    {/* Shop Category Badge */}
                    <span className="px-2 py-1 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-lg text-[9px] font-bold">
                      {shop.shop_category || 'General Store'}
                    </span>
                  </div>

                  {/* Visual metrics cards */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center">
                    <div className="border-r border-slate-200">
                      <span className="block text-[10px] text-slate-455 uppercase font-semibold">Distance</span>
                      <span className="text-xs font-bold text-slate-800">{shop.distance} km</span>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="block text-[10px] text-slate-455 uppercase font-semibold">Queue Index</span>
                      <span className="text-xs font-bold text-slate-800">{shop.active_orders} orders</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-455 uppercase font-semibold">Prep Time</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-slate-400 mr-0.5" />
                        {shop.waiting_time} min
                      </span>
                    </div>
                  </div>

                  {/* Ratings and discounts */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1 font-bold text-slate-700">
                      <Star className="w-3.5 h-3.5 text-kirana-500 fill-kirana-500" />
                      <span>{ratingNumber.toFixed(1)}</span>
                    </div>
                    {shop.discounts && shop.discounts !== 'No discounts' ? (
                      <span className="text-[10px] font-bold text-kirana-600 bg-kirana-50/50 px-2 py-0.5 rounded border border-kirana-200/50 truncate max-w-[150px]">
                        🏷️ {shop.discounts}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">Standard Pricing</span>
                    )}
                  </div>

                  {/* Shop Banner Image / Fallback */}
                  <div className="w-full h-56 rounded-2xl overflow-hidden relative bg-gradient-to-br from-amber-50 to-orange-50 border border-slate-200 shadow-inner">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt={shop.shop_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-500 to-orange-600 opacity-90">
                        <Store className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                    
                    {/* Floating Availability Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase backdrop-blur-md shadow-sm border ${
                          isAvailable
                            ? 'bg-emerald-500/90 text-white border-emerald-450'
                            : isBusy
                            ? 'bg-amber-500/90 text-white border-amber-450 animate-pulse'
                            : 'bg-slate-700/90 text-white border-slate-600'
                        }`}
                      >
                        {isAvailable ? 'Available' : isBusy ? 'Busy' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {isBusy && (
                    <div className="text-[10px] text-accent-amber font-semibold flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Wait times may exceed 20m</span>
                    </div>
                  )}
                  {isOffline ? (
                    <span className="text-xs font-semibold text-slate-400 w-full text-center">Store Closed</span>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectShop(shop);
                        onTabChange('instant-order');
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all text-center ${
                        isAvailable
                          ? 'bg-slate-900 hover:bg-slate-950 text-white shadow-slate-900/10'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/40'
                      }`}
                    >
                      {isAvailable ? 'Place Order (Upload Chitti)' : 'Order anyway (Expect Delay)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NearbyShops;
