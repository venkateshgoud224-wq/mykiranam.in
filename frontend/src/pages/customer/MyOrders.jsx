import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShoppingBag, Calendar, User, Clock, AlertTriangle, Eye, CheckCircle2, ChevronRight, RefreshCcw, MessageCircle, Phone, Smartphone, Star, ChevronDown } from 'lucide-react';
import OrderVerification from './OrderVerification';
import ImageModal from '../../components/common/ImageModal';
import OrderChat from '../../components/common/OrderChat';
import ReportComplaintModal from '../../components/customer/ReportComplaintModal';
import RateExperienceModal from '../../components/customer/RateExperienceModal';

const SavingsSummary = ({ order }) => {
  const { apiUrl, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSavings = async () => {
      try {
        const res = await fetch(`${apiUrl}/orders/${order.id}/market-comparison`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSavings();
    return () => { isMounted = false; };
  }, [order.id, apiUrl, token]);

  // Delivery savings removed as per user request
  
  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-inner animate-pulse">
        <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3">
           Loading Savings...
        </h4>
      </div>
    );
  }

  const productSavings = data?.productSavings || 0;
  const marketPriceTotal = data?.marketPriceTotal || 0;
  const myKiranamPrice = data?.myKiranamPrice || order.amount || 0;

  const baseFee = myKiranamPrice * 0.02;
  const gst = baseFee * 0.18;
  const platformSavings = Math.round(baseFee + gst) + 10;

  const totalSavings = platformSavings + productSavings;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-inner">
      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span className="text-emerald-500">✨</span> MyKiranam Savings Summary
      </h4>
      
      <div className="space-y-2 text-xs">
        {marketPriceTotal > myKiranamPrice && (
          <>
             <div className="flex justify-between items-center text-slate-500">
               <span>Est. Online App Price:</span>
               <span className="font-bold line-through">₹{marketPriceTotal}</span>
             </div>
             <div className="flex justify-between items-center text-emerald-900">
               <span>MyKiranam Order Value:</span>
               <span className="font-bold text-emerald-700">₹{myKiranamPrice}</span>
             </div>
             <div className="flex justify-between items-center text-emerald-700 bg-emerald-100/50 p-1 rounded">
               <span>Savings on Groceries:</span>
               <span className="font-bold text-emerald-600">₹{productSavings}</span>
             </div>
          </>
        )}
        {marketPriceTotal <= myKiranamPrice && (
           <div className="flex justify-between items-center text-emerald-900">
             <span>Order Value:</span>
             <span className="font-bold">₹{myKiranamPrice}</span>
           </div>
        )}


        <div className="flex justify-between items-center text-emerald-700">
          <span>Est. Platform Charges Avoided:</span>
          <span className="font-bold">₹{platformSavings}</span>
        </div>
        <div className="flex justify-between items-center text-emerald-700 border-b border-emerald-200/50 pb-2">
          <span>Est. Waiting Time Saved:</span>
          <span className="font-bold text-teal-700">30 Minutes</span>
        </div>
        
        <div className="flex justify-between items-center text-emerald-900 pt-1 font-black">
          <span>Estimated Total Savings:</span>
          <span className="text-sm">₹{totalSavings}</span>
        </div>
      </div>
    </div>
  );
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  if (d < 1) {
    return `${Math.round(d * 1000)} meters`;
  }
  return `${d.toFixed(1)} km`;
};

const MyOrders = ({ coords }) => {
  const { token, apiUrl } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatShopName, setChatShopName] = useState('');
  const [reportingOrder, setReportingOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const data = await fetchOrders();
      const queryParams = new URLSearchParams(window.location.search);
      const orderId = queryParams.get('order_id');
      if (orderId && data) {
        const found = data.find(o => Number(o.id) === Number(orderId));
        if (found) {
          setVerifyingOrder(found);
        }
      }
    };
    init();
  }, []);

  // Listen for realtime updates to orders on the socket
  useEffect(() => {
    if (!socket) return;

    socket.on('order_status_updated', (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
      // Update verifying order details if open
      if (verifyingOrder && verifyingOrder.id === updatedOrder.id) {
        setVerifyingOrder(updatedOrder);
      }
      if (trackingOrder && trackingOrder.id === updatedOrder.id) {
        setTrackingOrder(updatedOrder);
      }
    });

    return () => {
      socket.off('order_status_updated');
    };
  }, [socket, verifyingOrder, trackingOrder]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Cancelled',
          reason: 'Cancelled by customer'
        })
      });
      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'Waiting For Seller':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Bill Uploaded':
      case 'Waiting For Customer Confirmation':
        return 'bg-kirana-100 text-kirana-800 border-kirana-200 animate-pulse';
      case 'Confirmed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Packing Started':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Packing Completed':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Ready For Pickup':
        return 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20 font-bold';
      case 'Delivered':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'Cancelled':
        return 'bg-crimson/10 text-crimson border-crimson/20';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  if (verifyingOrder) {
    const isPaymentOnly = verifyingOrder.order_status === 'Ready For Pickup';
    return (
      <OrderVerification
        order={verifyingOrder}
        initialViewState={isPaymentOnly ? 'pay' : 'review'}
        onBack={() => setVerifyingOrder(null)}
        onVerifySuccess={() => {
          setVerifyingOrder(null);
          fetchOrders();
        }}
      />
    );
  }

  const revisionOrders = orders.filter(o => o.order_status === 'Waiting For Seller' && !!o.item_change_history);
  const completedOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.order_status));
  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.order_status) && !(o.order_status === 'Waiting For Seller' && !!o.item_change_history));

  const getFilteredOrders = () => {
    if (activeTab === 'active') return activeOrders;
    if (activeTab === 'revision') return revisionOrders;
    if (activeTab === 'completed') return completedOrders;
    return orders;
  };

  const displayedOrders = getFilteredOrders();

  return (
    <div className="space-y-6 pb-20 w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-base md:text-xl font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
          <span>My Orders</span>
          <span className="text-xs font-normal text-slate-500 whitespace-nowrap">({orders.length} total)</span>
        </h2>
        <button
          onClick={fetchOrders}
          className="text-xs font-bold text-kirana-600 hover:text-kirana-700"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-full overflow-x-auto no-scrollbar mx-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 min-w-[90px] py-2 px-1 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active</span>
          {activeOrders.length > 0 && (
            <span className="px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-bold rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px]">
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('revision')}
          className={`flex-1 min-w-[90px] py-2 px-1 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'revision' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <span className="text-sm">⚠️</span>
          <span>Revisions</span>
          {revisionOrders.length > 0 && (
            <span className="px-1.5 py-0.5 bg-crimson text-white text-[9px] font-black rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px]">
              {revisionOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 min-w-[90px] py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Loading order history...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No {activeTab} orders</h4>
          <p className="text-xs text-slate-500 mt-1">There are no orders in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isBillAvailable = order.amount !== null && order.amount !== undefined;
            const hasSelectedPayment = order.payment_method !== null && order.payment_method !== undefined;
            const isVerificationAwaiting = ['Bill Uploaded', 'Waiting For Customer Confirmation'].includes(order.order_status) && !hasSelectedPayment;
            const isPaymentAwaiting = order.order_status === 'Ready For Pickup' && !hasSelectedPayment;
            const isCancellable = !['Delivered', 'Cancelled'].includes(order.order_status);
            const isExpanded = !!expandedOrders[order.id];
            
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 transition-all"
              >
                {/* Order header details */}
                <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleOrderDetails(order.id)}>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{order.shop_name}</h3>
                    <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-400">
                      <span>Order #{order.custom_order_id || order.id}</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${getStatusColor(order.order_status)}`}>
                    {order.order_status === 'Waiting For Seller' && order.item_change_history ? 'Revision in Progress' : order.order_status}
                  </span>
                </div>

                {/* Ready For Pickup Store Information */}
                {order.order_status === 'Ready For Pickup' && (() => {
                  const userLat = coords?.latitude;
                  const userLng = coords?.longitude;
                  const shopLat = order.shop_latitude ? parseFloat(order.shop_latitude) : null;
                  const shopLng = order.shop_longitude ? parseFloat(order.shop_longitude) : null;
                  const distanceText = (userLat && userLng && shopLat && shopLng) 
                    ? calculateDistance(userLat, userLng, shopLat, shopLng) + ' away' 
                    : null;

                  return (
                    <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl space-y-3 shadow-sm text-left animate-fadeIn">
                      <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-xs">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Order Ready For Pickup</span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-700">
                        <p className="font-extrabold text-slate-800 text-xs">{order.shop_name}</p>
                        <p className="text-slate-500 text-[10px] leading-tight">📍 {order.shop_address || 'Huzurnagar, Nalgonda, Telangana'}</p>
                        <div className="flex gap-4 mt-1">
                          {distanceText && (
                            <p className="font-extrabold text-emerald-700 flex items-center gap-1 text-[10px]">
                              <span>🚗</span> {distanceText}
                            </p>
                          )}
                          {order.shop_working_hours && (
                            <p className="text-slate-500 font-bold text-[10px] flex items-center gap-1">
                              <span>⏰</span> {order.shop_working_hours}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.shop_latitude || 16.8970},${order.shop_longitude || 79.8705}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl transition-all font-black text-xs shadow-sm active:scale-[0.98]"
                        >
                          <span>📍 Navigate To Store</span>
                        </a>
                        <a
                          href={`tel:${order.seller_phone || ''}`}
                          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all font-black text-xs active:scale-[0.98]"
                        >
                          <span>📞 Call Store</span>
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Summary (Always Visible) */}
                <div className="flex justify-between items-center mt-1 cursor-pointer" onClick={() => toggleOrderDetails(order.id)}>
                  <div>
                    <span className="block text-[10px] text-slate-400">Total Bill Amount</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {order.amount ? `₹${order.amount}` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex items-center text-kirana-600 font-bold text-[11px] bg-kirana-50 hover:bg-kirana-100 px-3 py-1.5 rounded-xl border border-kirana-100 transition-colors">
                    <span>{isExpanded ? 'Hide Details' : 'Open Details'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-4 mt-2 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Amount / Note display */}
                    <div className="flex flex-col text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-500">Payment Status</span>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700">
                            {order.order_status === 'Cancelled' && order.payment_status === 'Refunded' ? (
                              <div className="text-emerald-600 font-bold flex flex-col items-end gap-0.5">
                                <span>✓ {order.refund_status === 'Credited' ? 'Refund Credited to Bank' : 'Refund Processed'}</span>
                                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Amount Refunded: ₹{order.refund_amount ? (order.refund_amount/100).toFixed(2) : Math.min(Math.floor((parseFloat(order.amount || 0) * 100) / 10) / 100, 50).toFixed(2)}</span>
                                {order.refund_id && order.refund_id !== 'Manual' && <span className="text-[9px] text-slate-500 font-normal">Ref: {order.refund_id}</span>}
                                {order.refund_proof_image && (
                                  <a href={getFullImageUrl(order.refund_proof_image)} target="_blank" rel="noreferrer" className="text-[9px] underline text-blue-500 font-normal" onClick={e => e.stopPropagation()}>View Proof</a>
                                )}
                              </div>
                            ) : order.order_status === 'Cancelled' && ['Paid', 'Uploaded Proof'].includes(order.payment_status) ? (
                              <span className="text-amber-600 font-bold flex items-center justify-end gap-1">
                                Refund Initiated (2-3 Days)
                              </span>
                            ) : order.payment_method ? (
                              `${order.payment_method} (${order.payment_status})`
                            ) : (
                              'Pending Bill'
                            )}
                          </span>
                        </div>
                      </div>

                  {order.payment_method === 'Razorpay UPI' && order.payment_status === 'Paid' && (
                    <div className="bg-amber-50 rounded-lg p-2.5 flex flex-col space-y-1.5 border border-amber-200 mt-1">
                      <div className="flex justify-between items-center text-[11px] text-emerald-700 font-bold">
                        <span>Advance Paid Online:</span>
                        <span>₹{Math.min(parseFloat(order.amount) * 0.1, 50).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] text-amber-600 font-black pt-1 border-t border-amber-200/50">
                        <span>Pending to Pay at Shop:</span>
                        <span>₹{(parseFloat(order.amount) - Math.min(parseFloat(order.amount) * 0.1, 50)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pickup OTP Display */}
                {['Ready For Pickup', 'Pickup Overdue'].includes(order.order_status) && order.pickup_otp && (
                  <div className="bg-kirana-50 border border-kirana-200 rounded-2xl p-4 text-center mt-4">
                    <span className="block text-xs font-bold text-kirana-800 uppercase tracking-wider mb-1">
                      Your Pickup OTP
                    </span>
                    <span className="block text-3xl font-black text-kirana-900 tracking-[0.2em]">
                      {order.pickup_otp}
                    </span>
                    <p className="text-[10px] text-kirana-700 mt-2">
                      Please share this OTP with the seller to collect your order.
                    </p>
                    {order.pickup_deadline && (
                      <p className="text-xs text-crimson font-bold mt-2">
                        Pickup Before: {new Date(order.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons based on active state */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    {order.preferred_pickup_time && (
                      <p className="text-[10px] text-slate-500">
                        🕒 Pickup: <strong>{order.preferred_pickup_time}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-auto">
                    {/* Cancellation Button */}
                    {isCancellable && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl text-crimson hover:bg-crimson/5 border border-transparent hover:border-crimson/10 transition-all"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Verification Button */}
                    {isVerificationAwaiting ? (
                      <button
                        onClick={() => setVerifyingOrder(order)}
                        className="px-4 py-2.5 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-kirana-500/10 hover:shadow-kirana-500/20 active:scale-[0.99] transition-all flex items-center space-x-1"
                      >
                        <span>Verify Bill</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {order.order_status === 'Delivered' && (
                          <>
                            <button
                              onClick={() => setReportingOrder(order)}
                              className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold rounded-xl transition-all"
                            >
                              Raise Complaint
                            </button>
                            <button
                              onClick={() => setRatingOrder(order)}
                              className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded-xl transition-all flex items-center"
                            >
                              <Star className="w-3.5 h-3.5 mr-1 fill-amber-500 text-amber-500" />
                              Rate Experience
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setTrackingOrder(trackingOrder?.id === order.id ? null : order)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          {trackingOrder?.id === order.id ? 'Close Details' : 'Track Order'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Savings Summary (Phase 8B) */}
                {order.order_status === 'Delivered' && (
                  <SavingsSummary order={order} />
                )}

                {/* Communication Actions */}
                {!['Cancelled', 'Delivered'].includes(order.order_status) && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50">
                    <a 
                      href={`tel:${order.seller_phone || ''}`}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors font-semibold text-xs"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Seller</span>
                    </a>
                    <button 
                      onClick={() => { setChatOrderId(order.id); setChatShopName(order.shop_name); }}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors font-semibold text-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat Seller</span>
                    </button>
                  </div>
                )}

                {/* Tracking Progress Timeline Details */}
                {trackingOrder?.id === order.id && (
                  <div className="mt-4 pt-4 border-t border-slate-105 bg-slate-50/50 p-4 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-800">Timeline Progress</h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchOrders(); }}
                          className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
                          title="Refresh Updates"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                        Placed: {new Date(order.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {/* Visual Status Line */}
                    <div className="relative pl-5 space-y-4 border-l border-slate-200 ml-1 text-xs">
                      {(() => {
                        const formatTimeDetail = (timestamp) => {
                          if (!timestamp) return null;
                          return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };

                        const steps = [
                          { label: 'Order Placed', active: true, time: order.created_at }
                        ];

                        if (order.item_change_history) {
                          let revTime = order.updated_at;
                          try {
                            const parsed = typeof order.item_change_history === 'string' ? JSON.parse(order.item_change_history) : order.item_change_history;
                            if (parsed && parsed.timestamp) revTime = parsed.timestamp;
                          } catch(e) {}
                          steps.push({ label: 'Revision Requested', active: true, time: revTime, isRevision: true });
                        }

                        steps.push(
                          { label: 'Order Accepted & Billed', active: ['Accepted', 'Bill Uploaded', 'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed', 'Ready For Pickup', 'Delivered'].includes(order.order_status), time: order.accepted_at || order.confirmed_at || order.packing_started_at || order.ready_for_pickup_at || order.updated_at },
                          { label: ['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method) ? 'Payment at pickup' : 'Payment Completed', active: ['Confirmed', 'Packing Started', 'Packing Completed', 'Ready For Pickup', 'Delivered'].includes(order.order_status) || (order.payment_method !== null && order.payment_method !== undefined), time: order.confirmed_at || order.packing_started_at || order.ready_for_pickup_at || order.updated_at },
                          { label: 'Packing Started', active: ['Packing Started', 'Packing Completed', 'Ready For Pickup', 'Delivered'].includes(order.order_status), time: order.packing_started_at || order.ready_for_pickup_at || order.updated_at },
                          { label: 'Ready For Pickup / Delivery', active: ['Ready For Pickup', 'Delivered'].includes(order.order_status), time: order.ready_for_pickup_at || order.delivered_at || order.updated_at }
                        );

                        if (order.order_status === 'Cancelled') {
                          steps.push({ label: 'Order Cancelled', active: true, time: order.updated_at, isCancelled: true });
                        } else {
                          steps.push({ label: 'Completed (Delivered)', active: order.order_status === 'Delivered', time: order.delivered_at });
                        }

                        return steps.map((step, idx) => (
                          <div key={idx} className="relative flex justify-between items-center pr-2">
                            <div className="flex items-center space-x-2">
                              <span className={`absolute -left-[25px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-white ${
                                step.isCancelled ? 'bg-crimson' : (step.active ? 'bg-kirana-500' : 'bg-slate-200')
                              }`} />
                              <span className={`font-semibold ${step.isCancelled ? 'text-crimson' : (step.active ? 'text-slate-800' : 'text-slate-400')}`}>
                                {step.label}
                              </span>
                            </div>
                            {step.active && step.time && (
                              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100 font-medium">
                                {formatTimeDetail(step.time)}
                              </span>
                            )}
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Image details inside tracker */}
                    <div className={`grid ${order.original_chitti && order.original_chitti !== 'digital' && order.modified_bill ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-2 text-[10px]`}>
                      {order.original_chitti && order.original_chitti !== 'digital' && (
                        <div>
                          <span className="block text-slate-450 font-bold mb-1.5 flex justify-between items-center">
                            <span>Original Chitti</span>
                            <a
                              href={getFullImageUrl(order.original_chitti)}
                              download={`original_chitti_${order.id}.${order.original_chitti.split('.').pop()}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-kirana-600 hover:underline font-extrabold"
                            >
                              Download
                            </a>
                          </span>
                          <img
                            src={getFullImageUrl(order.original_chitti)}
                            alt="Chitti"
                            className="max-h-24 w-full rounded border border-slate-200 object-contain bg-white p-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(getFullImageUrl(order.original_chitti))}
                          />
                        </div>
                      )}
                      {order.modified_bill && (
                        <div>
                          <span className="block text-slate-450 font-bold mb-1.5 flex justify-between items-center">
                            <span>Rewritten Bill</span>
                            <a
                              href={getFullImageUrl(order.modified_bill)}
                              download={`rewritten_bill_${order.id}.${order.modified_bill.split('.').pop()}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-kirana-600 hover:underline font-extrabold"
                            >
                              Download
                            </a>
                          </span>
                          <img
                            src={getFullImageUrl(order.modified_bill)}
                            alt="Bill"
                            className="max-h-24 w-full rounded border border-slate-200 object-contain bg-white p-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(getFullImageUrl(order.modified_bill))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Digital Grocery & Invoice Items comparison */}
                    {order.order_type === 'digital' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-800">Grocery List & Priced Invoice</h4>
                          {order.amount && (
                            <span className="text-[11px] font-black text-slate-900 bg-kirana-100 border border-kirana-200/50 px-2 py-0.5 rounded-lg">
                              Grand Total: ₹{parseFloat(order.amount).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Original List (Left Column) */}
                          {(() => {
                            let originalItems = [];
                            try {
                              originalItems = JSON.parse(order.digital_item_list || '[]');
                            } catch (e) {
                              console.error('Error parsing digital list', e);
                            }

                            return (
                              <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 relative overflow-hidden">
                                <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-red-200/40" />
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wide mb-3 ml-2">
                                  📄 Original Chitti List
                                </span>

                                <div className="space-y-2 pl-2 max-h-48 overflow-y-auto pr-1">
                                  {originalItems.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">No items found</p>
                                  ) : (
                                    originalItems.map((item, idx) => (
                                      <div key={item.id || idx} className="pb-1.5 border-b border-dashed border-slate-200 text-[11px] flex justify-between items-baseline text-slate-750">
                                        <span className="font-semibold text-slate-800">{idx + 1}. {item.name}</span>
                                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-905 border border-amber-200/70 rounded text-[9px] font-black uppercase">
                                          {item.quantity} {item.unit}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Final Priced Billed Items (Right Column) */}
                          {(() => {
                            let modifiedItems = null;
                            if (order.modified_item_list) {
                              try {
                                modifiedItems = JSON.parse(order.modified_item_list);
                              } catch (e) {
                                console.error('Error parsing modified list', e);
                              }
                            }

                            return (
                              <div className="border border-slate-205 rounded-2xl p-4 bg-amber-50/5 relative overflow-hidden">
                                <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-red-200/40" />
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-kirana-500 text-slate-950 uppercase tracking-wide mb-3 ml-2">
                                  🛒 Final Billed Items
                                </span>

                                <div className="space-y-2.5 pl-2 max-h-48 overflow-y-auto pr-1">
                                  {!modifiedItems ? (
                                    <div className="py-8 text-center text-slate-400 italic text-[10px]">
                                      Awaiting seller pricing & invoice generation...
                                    </div>
                                  ) : modifiedItems.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">No billed items</p>
                                  ) : (
                                    modifiedItems.map((item, idx) => {
                                      const isRemoved = item.status === 'removed';
                                      const isAdded = item.status === 'added';
                                      const isReplaced = item.status === 'replaced';
                                      const isModified = item.status === 'modified';

                                      let bgClass = 'bg-white';
                                      let badge = null;

                                      if (isRemoved) {
                                        bgClass = 'bg-red-50/30 line-through text-red-500/60 opacity-60';
                                        badge = <span className="px-1.5 py-0.5 bg-red-100 text-red-750 border border-red-200 rounded text-[8px] font-bold uppercase">Unavailable</span>;
                                      } else if (isAdded) {
                                        bgClass = 'bg-emerald-50/20 border-emerald-100/50';
                                        badge = <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-855 border border-emerald-250 rounded text-[8px] font-bold uppercase font-black">Added</span>;
                                      } else if (isReplaced) {
                                        bgClass = 'bg-indigo-50/20 border-indigo-100/50';
                                        badge = <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-855 border border-indigo-250 rounded text-[8px] font-bold uppercase font-black">Substituted</span>;
                                      } else if (isModified) {
                                        bgClass = 'bg-amber-50/20 border-amber-100/50';
                                        badge = <span className="px-1.5 py-0.5 bg-amber-100 text-amber-855 border border-amber-250 rounded text-[8px] font-bold uppercase font-black">Qty Adj</span>;
                                      }

                                      return (
                                        <div key={item.id || idx} className={`p-2 rounded-xl border border-slate-150 flex justify-between items-start transition-all ${bgClass}`}>
                                          <div className="min-w-0 pr-1 text-[11px]">
                                            <span className="font-bold block text-slate-800">
                                              {idx + 1}. {item.name}
                                            </span>

                                            <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200/50">
                                                {item.quantity} {item.unit}
                                              </span>
                                              {badge}
                                            </div>

                                            {item.notes && (
                                              <span className="block text-[9px] text-slate-500 italic mt-1">• {item.notes}</span>
                                            )}
                                          </div>

                                          <div className="text-right flex-shrink-0 text-[11px] min-w-[50px]">
                                            {!isRemoved ? (
                                              <>
                                                <span className="font-extrabold text-slate-900 block">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                                                <span className="text-[8px] text-slate-400 font-semibold block">₹{item.price}/{item.unit}</span>
                                              </>
                                            ) : (
                                              <span className="text-[10px] font-bold text-red-500">₹0.00</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
        </div>
      )}

      {previewImage && (
        <ImageModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderChat 
          orderId={chatOrderId}
          otherPartyName={chatShopName}
          onClose={() => setChatOrderId(null)}
        />
      )}

      {/* Report Complaint Modal */}
      {reportingOrder && (
        <ReportComplaintModal
          order={reportingOrder}
          onClose={() => setReportingOrder(null)}
          onSuccess={() => {
            setReportingOrder(null);
            alert('Your complaint has been submitted for review.');
          }}
        />
      )}

      {/* Rate Experience Modal */}
      {ratingOrder && (
        <RateExperienceModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onSuccess={() => {
            setRatingOrder(null);
            alert('Thank you for your feedback!');
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default MyOrders;
