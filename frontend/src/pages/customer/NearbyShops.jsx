import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ShopReviewsModal from '../../components/customer/ShopReviewsModal';
import { Search, Star, Clock, MapPin, Compass, AlertCircle, Filter, ArrowUpDown, Award, CheckCircle, Store, TrendingUp, Trophy } from 'lucide-react';

const NearbyShops = ({ coords, onSelectShop, onTabChange }) => {
  const { token, apiUrl } = useAuth();
  const { latestShopUpdate } = useSocket();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopForReviews, setSelectedShopForReviews] = useState(null);
  
  // Search, sorting & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterNearby, setFilterNearby] = useState(false);
  
  // Phase 8B: Community Savings
  const [communitySavings, setCommunitySavings] = useState(null);

  useEffect(() => {
    const fetchCommunitySavings = async () => {
      try {
        const response = await fetch(`${apiUrl}/savings/community`);
        if (response.ok) {
          const data = await response.json();
          setCommunitySavings(data);
        }
      } catch (err) {
        console.error('Error fetching community savings:', err);
      }
    };
    fetchCommunitySavings();
  }, [apiUrl]);

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
    <div className="flex flex-col lg:flex-row gap-6 pb-20 w-full items-start">
      {/* Brand Value Proposition - Mobile Only (Hidden on Desktop) */}
      <div className="w-full lg:hidden bg-white/40 border border-slate-200/50 rounded-2xl p-4 shadow-sm space-y-1.5">
        <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
          Buy What You Need.{' '}
          <span className="text-kirana-600 bg-gradient-to-r from-kirana-600 to-orange-600 bg-clip-text text-transparent">Save Time & Money.</span>
        </h1>
        
        <p className="text-xs font-bold text-slate-400">
          Order Online. Verify. Pick Up Anytime.
        </p>
      </div>

      {/* Main Shops Explorer Column */}
      <div className="flex-1 w-full min-w-0 space-y-6">
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
          <h2 className="text-base md:text-xl font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
            <span>Explore Verified Nearby Stores</span>
            <span className="text-xs font-normal text-slate-500 whitespace-nowrap">({filteredShops.length} active)</span>
          </h2>

          {/* Community Savings Counter (Phase 8B) */}
          {communitySavings && communitySavings.total_orders > 0 && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden mt-2 mb-2">
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 opacity-90">
                  <Trophy className="w-4 h-4" /> MyKiranam Community Impact
                </h3>
                <p className="text-sm font-medium leading-snug">
                  Our community has saved <strong className="text-xl font-black">₹{communitySavings.total_savings}</strong> and <strong className="text-xl font-black">{Math.floor(communitySavings.total_time_saved / 60)} Hours</strong> of shopping time across {communitySavings.total_orders} orders!
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none transform rotate-12">
                <Trophy className="w-32 h-32" />
              </div>
            </div>
          )}

          {/* Quote Engine Entry */}
          <div className="bg-kirana-50 border border-kirana-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-kirana-600" />
                <span>Smart Price Comparison</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">Want to know who is cheapest? Enter your list and get estimated quotes instantly.</p>
            </div>
            <button
              onClick={() => onTabChange('quotes')}
              className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
            >
              Compare Prices
            </button>
          </div>

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
          <div className="flex flex-row overflow-x-auto whitespace-nowrap gap-1.5 pt-1.5 pb-1 scrollbar-none items-center w-full">
            <div className="flex-shrink-0 flex items-center space-x-1 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-sm text-[11px] font-bold text-slate-700">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none pr-1 cursor-pointer"
              >
                <option value="default">Default (Queue Balanced)</option>
                <option value="nearest">Nearest Distance</option>
                <option value="rating">Best Rated</option>
                <option value="response_time">Lowest Response Time</option>
                <option value="waiting_time">Lowest Prep Time</option>
                <option value="discounts">Best Discounts</option>
                <option value="available">Most Available</option>
              </select>
            </div>

            <button
              onClick={() => setFilterAvailable(!filterAvailable)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm transition-all flex items-center space-x-1 ${
                filterAvailable
                  ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Available Only</span>
            </button>

            <button
              onClick={() => setFilterVerified(!filterVerified)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm transition-all flex items-center space-x-1 ${
                filterVerified
                  ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Verified only</span>
            </button>

            <button
              onClick={() => setFilterNearby(!filterNearby)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm transition-all flex items-center space-x-1 ${
                filterNearby
                  ? 'bg-kirana-500 text-slate-950 border-kirana-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center space-x-1 text-[9px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100 self-start w-fit">
                            <Award className="w-3 h-3 text-blue-500 mr-0.5" />
                            <span>{shop.seller_level || 'Trusted Seller'} (Score: {shop.seller_trust_score || 100})</span>
                            {shop.verification_date && (
                              <span className="text-slate-400 font-normal ml-1">
                                • Approved {new Date(shop.verification_date).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {shop.complaint_rate > 0 && (
                            <div className="text-[8px] text-slate-405 text-slate-400 pl-1">
                              Complaint Rate: {shop.complaint_rate}%
                            </div>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShopForReviews(shop);
                        }}
                        className="flex items-center space-x-1 font-bold text-slate-700 hover:text-kirana-600 hover:underline transition-all cursor-pointer"
                        title="Click to view shop reviews"
                      >
                        <Star className="w-3.5 h-3.5 text-kirana-500 fill-kirana-500" />
                        <span>{ratingNumber.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400 font-semibold ml-0.5">
                          ({shop.total_reviews || 0})
                        </span>
                      </button>
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
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col space-y-2.5">
                    {isBusy && (
                      <div className="text-[10px] text-accent-amber font-semibold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Wait times may exceed 20m</span>
                      </div>
                    )}
                    {isOffline ? (
                      <span className="text-xs font-semibold text-slate-400 w-full text-center py-2.5">Store Closed</span>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all whitespace-nowrap active:scale-[0.98]"
                        >
                          <span>📍 Directions</span>
                        </a>
                        <button
                          onClick={() => {
                            onSelectShop(shop);
                            onTabChange('instant-order');
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold shadow-sm active:scale-[0.98] transition-all text-center ${
                            isAvailable
                              ? 'bg-slate-900 hover:bg-slate-950 text-white shadow-slate-900/10'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/40'
                          }`}
                        >
                          {isAvailable ? 'Place Order (Upload Chitti)' : 'Order anyway (Expect Delay)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedShopForReviews && (
        <ShopReviewsModal
          shop={selectedShopForReviews}
          onClose={() => setSelectedShopForReviews(null)}
        />
      )}
    </div>
  );
};

export default NearbyShops;
