import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FileSpreadsheet, Eye, Play, CheckCircle2, User, ChevronDown, PackageCheck, AlertCircle, Trash2, Send, Download, ListOrdered, Plus, Minus, FileText, ClipboardList, MessageCircle, Phone, Smartphone, MapPin } from 'lucide-react';
import BillingForm from './BillingForm';
import ImageModal from '../../components/common/ImageModal';
import OrderChat from '../../components/common/OrderChat';

const ActiveOrders = ({ activeOrders, onUpdateStatus }) => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  // Expand states for item trackers
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Billing state for orders in 'Accepted' state
  const [billingOrderId, setBillingOrderId] = useState(null);

  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);

  const handleProgress = async (orderId, nextStatus) => {
    try {
      await onUpdateStatus(orderId, nextStatus);
      playSoundAlert('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskPayment = async (orderId) => {
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/ask-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('Server returned HTML'); }
      if (!response.ok) throw new Error(data.error || 'Failed to request payment');
      alert(data.message || 'Payment request sent successfully!');
      playSoundAlert('success');
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Error requesting payment');
    }
  };

  const [otpDialogOrderId, setOtpDialogOrderId] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatCustomerName, setChatCustomerName] = useState('');

  const handleVerifyOTP = async () => {
    if (!otpInput) {
      alert('Please enter OTP');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/orders/${otpDialogOrderId}/verify-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ otp: otpInput })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned HTML'); }
      if (!response.ok) throw new Error(data.error || 'Failed to verify OTP');
      if (data) {
        playSoundAlert('success');
        setOtpDialogOrderId(null);
        setOtpInput('');
        // We need to re-fetch orders, ideally onUpdateStatus triggers a refresh. 
        // For now, we can just call onUpdateStatus with 'Delivered' to trigger the parent's refresh, 
        // even though backend already updated it. Or we just reload the window.
        window.location.reload(); 
      }
    } catch (error) {
      alert(error.message || 'Failed to verify OTP');
    }
  };

  const handleStartBilling = (order) => {
    setBillingOrderId(order.id);
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  return (
    <div className="space-y-4">
      {activeOrders.length === 0 ? (
        <div className="py-12 bg-white border border-slate-100 rounded-3xl text-center p-8 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Queue is Empty</h4>
          <p className="text-xs text-slate-500 mt-1">No active orders currently in packing or pickup stages.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((order, idx) => {
            const isAccepted = order.order_status === 'Accepted';
            const showReadyForDelivery = ['Packing Started', 'Confirmed'].includes(order.order_status);
            const showDeliverOrder = ['Ready For Pickup', 'Pickup Overdue'].includes(order.order_status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 transition-all"
              >
                {/* Active queue header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold uppercase tracking-wider text-kirana-600 bg-kirana-50 px-2 py-0.5 rounded-md mb-1.5">
                      <span>Queue Pos #{idx + 1}</span>
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5 truncate">
                      <span className="truncate">Customer: {order.customer_name}</span>
                    </h3>
                    {order.customer_level && (
                      <div className="flex items-center space-x-1 mt-0.5">
                        <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${Number(order.reliability_score) < 50 ? 'bg-crimson/10 text-crimson border-crimson/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {Number(order.reliability_score) < 50 ? `High Risk (Reliability: ${order.reliability_score}%)` : `Reliability: ${order.reliability_score || 100}%`}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Order #{order.custom_order_id || order.id} • Tel: {order.customer_phone}</p>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end flex-wrap gap-2 sm:gap-0 sm:space-y-1.5 w-full sm:w-auto">
                    {/* Fulfillment Method Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border whitespace-nowrap ${
                      order.fulfillment_method === 'Delivery' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {order.fulfillment_method === 'Delivery' ? '🛵 Home Delivery' : '🏪 Shop Pickup'}
                    </span>
                    {/* Status Badge */}
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-slate-100 text-slate-700 whitespace-nowrap">
                      {order.order_status === 'Ready For Pickup' && order.fulfillment_method === 'Delivery' ? 'Ready For Delivery' : order.order_status}
                    </span>
                    {/* Payment Status Badge */}
                    {order.payment_method ? (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                        ['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method)
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method) 
                          ? (order.fulfillment_method === 'Delivery' ? 'Payment on Delivery' : 'Payment at pickup') 
                          : `Paid: ${order.payment_method}`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">
                        Payment Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Queue flow action controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-55">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="text-xs font-semibold text-slate-550 flex items-center justify-center sm:justify-start space-x-1 hover:text-slate-755 border border-slate-100 sm:border-transparent py-2 sm:py-0 rounded-xl"
                  >
                    <span>View Details</span>
                    <ChevronDown className={`w-4 h-4 transform ${isExpanded ? 'rotate-180' : ''} transition-transform`} />
                  </button>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    {['Bill Uploaded', 'Waiting For Customer Confirmation'].includes(order.order_status) && billingOrderId !== order.id && (
                      <>
                        <button
                          onClick={() => handleStartBilling(order)}
                          className="px-4 py-2 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex-1 sm:flex-none text-center whitespace-nowrap"
                        >
                          Edit Bill & Invoice
                        </button>
                        <button
                          onClick={() => handleAskPayment(order.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex-1 sm:flex-none text-center whitespace-nowrap"
                        >
                          Ask Payment
                        </button>
                      </>
                    )}

                    {showReadyForDelivery && (
                      <button
                        onClick={() => handleProgress(order.id, 'Ready For Pickup')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1 flex-1 sm:flex-none whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{order.fulfillment_method === 'Delivery' ? 'Ready For Delivery' : 'Ready For Pickup'}</span>
                      </button>
                    )}



                    {showDeliverOrder && (
                      <button
                        onClick={() => setOtpDialogOrderId(order.id)}
                        className="px-4 py-2 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-1 flex-1 sm:flex-none whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify OTP & Deliver</span>
                      </button>
                    )}

                    {/* Mark No Pickup button */}
                    {order.order_status === 'Ready For Pickup' && (
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to mark this order as 'No Pickup'? This will cancel the order and apply abandonment penalties to the customer.")) {
                            try {
                              const res = await fetch(`${apiUrl}/seller-protection/order/${order.id}/no-pickup`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              const text = await res.text();
                              let data;
                              try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned HTML'); }
                              if (!res.ok) throw new Error(data.error || 'Failed to mark No Pickup');
                              playSoundAlert('cancelled');
                              window.location.reload();
                            } catch (err) {
                              alert(err.message || 'Failed to mark No Pickup');
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all flex-shrink-0"
                        title="Mark No Pickup / Abandoned"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Cancel button */}
                    <button
                      onClick={() => {
                        const r = prompt('Reason for cancelling order:');
                        if (r !== null) onUpdateStatus(order.id, 'Cancelled', r);
                      }}
                      className="p-2 text-slate-400 hover:text-crimson hover:bg-slate-50 border border-slate-100 rounded-xl transition-all flex-shrink-0"
                      title="Cancel Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Billing Panel */}
                {billingOrderId === order.id && (
                  <BillingForm 
                    order={order}
                    onCancel={() => setBillingOrderId(null)}
                    onSuccess={() => {
                      setBillingOrderId(null);
                      onUpdateStatus(order.id, 'Bill Uploaded');
                    }}
                  />
                )}

                {/* Expanded details sheet */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-55 bg-slate-50 p-4 rounded-2xl space-y-4 animate-fadeIn">
                    
                    {/* Mini Timeline for Seller */}
                    <div className="mb-4">
                      <span className="block text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">
                        ⏳ Order Progress
                      </span>
                      <div className="flex items-center space-x-1 sm:space-x-2 text-[9px] font-bold">
                        {['Waiting For Seller', 'Bill Uploaded', 'Packing Started', 'Ready For Pickup'].map((step, i, arr) => {
                          let isActive = false;
                          let isPast = false;
                          
                          // Determine states based on current order.order_status
                          const currentIdx = arr.indexOf(order.order_status === 'Confirmed' ? 'Packing Started' : order.order_status);
                          if (currentIdx === -1 && ['Delivered', 'Completed'].includes(order.order_status)) isPast = true;
                          else if (i === currentIdx) isActive = true;
                          else if (i < currentIdx) isPast = true;

                          let colorClass = 'bg-slate-200 text-slate-400';
                          if (isActive) colorClass = 'bg-kirana-500 text-slate-900 border border-kirana-600/20 shadow-sm';
                          if (isPast) colorClass = 'bg-emerald-100 text-emerald-800';

                          const displayNames = {
                            'Waiting For Seller': '1. New Order',
                            'Bill Uploaded': '2. Billed & Waiting',
                            'Packing Started': ['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method) 
                              ? (order.fulfillment_method === 'Delivery' ? '3. Payment on Delivery & Packing' : '3. Payment at pickup & Packing') 
                              : '3. Paid & Packing',
                            'Ready For Pickup': order.fulfillment_method === 'Delivery' ? '4. Ready for Delivery' : '4. Ready'
                          };

                          return (
                            <React.Fragment key={step}>
                              <div className={`px-2 py-1 rounded-lg transition-all ${colorClass}`}>
                                {displayNames[step]}
                              </div>
                              {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 rounded-full ${isPast ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Customer requested changes log (Shared for Digital and Handwritten) */}
                    {order.item_change_history && (() => {
                      let histObj = {};
                      try {
                        histObj = typeof order.item_change_history === 'string'
                          ? JSON.parse(order.item_change_history)
                          : order.item_change_history;
                      } catch (e) {
                        histObj = { requested_changes: order.item_change_history };
                      }
                      
                      const tags = histObj.tags || [];
                      const text = histObj.requested_changes || order.item_change_history;

                      return (
                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 mb-4">
                          <span className="font-extrabold text-blue-900 block mb-1 text-[10px] uppercase tracking-wider flex items-center space-x-1.5">
                            <span className="text-sm">📝</span>
                            <span>Customer Revision Request</span>
                          </span>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {tags.map((tag, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-white border border-blue-200 text-blue-800 rounded text-[9px] font-black shadow-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-blue-950 italic text-[11px] font-semibold bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                            "{text}"
                          </p>
                        </div>
                      );
                    })()}

                    <div className={`grid grid-cols-1 ${(order.order_type === 'digital' && order.shop_catalog_enabled === false) || (order.original_chitti && order.original_chitti !== 'digital') ? 'md:grid-cols-2' : ''} gap-4`}>
                      
                      {/* Left: Original Chitti (Handwritten OR Digital Checklist) */}
                      {order.order_type === 'digital' ? (
                        order.shop_catalog_enabled === false && (
                          <div>
                            <span className="block text-[10px] text-slate-455 uppercase font-black tracking-wider mb-1.5">
                              📄 Customer Original Chitti
                            </span>
                            <div className="border border-slate-200 bg-white p-3.5 rounded-xl space-y-2 max-h-56 overflow-y-auto">
                              {JSON.parse(order.digital_item_list || '[]').map((item, idx) => (
                                <div key={item.id || idx} className="text-xs pb-1.5 border-b border-dashed border-slate-100 flex items-center space-x-2">
                                  <span className="font-semibold text-slate-800">{idx + 1}. {item.name}</span>
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-250 rounded text-[9px] font-black uppercase">
                                    {item.quantity} {item.unit}
                                  </span>
                                  {item.notes && <span className="text-[10px] text-slate-550 italic pl-1">• {item.notes}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (order.original_chitti && order.original_chitti !== 'digital') ? (
                        <div>
                          <span className="block text-[10px] text-slate-455 uppercase font-bold mb-1.5 flex justify-between items-center">
                            <span>Handwritten Chitti snapshot</span>
                            <a
                              href={getFullImageUrl(order.original_chitti)}
                              target="_blank"
                              download={`original_chitti_${order.id}.${order.original_chitti.split('.').pop()}`}
                              rel="noreferrer"
                              className="text-kirana-600 hover:underline font-extrabold flex items-center space-x-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          </span>
                          <img
                            src={getFullImageUrl(order.original_chitti)}
                            alt="Original"
                            className="max-h-56 w-full object-contain rounded-xl border border-slate-200 bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(getFullImageUrl(order.original_chitti))}
                          />
                        </div>
                      ) : null}

                      {/* Right: Rewritten Bill / Details / Digital Bill Items */}
                      {order.order_type === 'digital' ? (
                        <div className="space-y-4">
                          <div>
                            <span className="block text-[10px] text-slate-450 uppercase font-black tracking-wider mb-1.5">
                              🛒 Final Priced Bill Items
                            </span>
                            <div className="border border-slate-200 bg-white p-3.5 rounded-xl space-y-2 max-h-56 overflow-y-auto">
                              {order.modified_item_list ? (
                                JSON.parse(order.modified_item_list || '[]').map((item, idx) => {
                                  const isRemoved = item.status === 'removed';
                                  return (
                                    <div key={item.id || idx} className={`text-xs pb-1.5 border-b border-dashed border-slate-100 flex justify-between items-center ${isRemoved ? 'line-through opacity-40 text-red-500' : ''}`}>
                                      <div>
                                        <span className="font-bold text-slate-855">{idx + 1}. {item.name}</span>
                                        <span className="ml-1.5 text-[9px] font-medium text-slate-500">({item.quantity} {item.unit})</span>
                                      </div>
                                      {!isRemoved && <span className="font-bold text-slate-800">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price || item.mrp || 0))).toFixed(2)}</span>}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[10px] italic text-slate-400">Invoice hasn't been prepared yet.</p>
                              )}
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="space-y-4">
                          {order.modified_bill ? (
                            <div>
                              <span className="block text-[10px] text-slate-450 uppercase font-bold mb-1.5 flex justify-between items-center">
                                <span>Rewritten Bill snapshot</span>
                                <a
                                  href={getFullImageUrl(order.modified_bill)}
                                  target="_blank"
                                  download={`rewritten_bill_${order.id}.${order.modified_bill.split('.').pop()}`}
                                  rel="noreferrer"
                                  className="text-kirana-600 hover:underline font-extrabold flex items-center space-x-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                              </span>
                              <img
                                src={getFullImageUrl(order.modified_bill)}
                                alt="Modified Bill"
                                className="max-h-56 w-full object-contain rounded-xl border border-slate-200 bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setPreviewImage(getFullImageUrl(order.modified_bill))}
                              />
                            </div>
                          ) : (
                            <p className="text-[10px] italic text-slate-400">Invoice bill hasn't been uploaded yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delivery Information Section */}
                    {order.fulfillment_method === 'Delivery' && (
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2 text-left">
                        <span className="block text-[10px] text-slate-455 uppercase font-black tracking-wider flex items-center space-x-1.5">
                          <span>🛵 Delivery Address</span>
                        </span>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-800 font-semibold leading-normal">
                            {order.delivery_address}
                          </p>
                          {order.delivery_landmark && (
                            <p className="text-slate-600 text-[11px]">
                              <strong>Landmark:</strong> {order.delivery_landmark}
                            </p>
                          )}
                          {order.delivery_phone && (
                            <p className="text-slate-605 text-[11px]">
                              <strong>Delivery Phone:</strong> {order.delivery_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Communication Actions */}
                    <div className={`grid ${order.fulfillment_method === 'Delivery' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-4`}>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const phoneNum = order.fulfillment_method === 'Delivery' && order.delivery_phone 
                            ? order.delivery_phone 
                            : order.customer_phone;
                          const rawPhone = String(phoneNum || '');
                          const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
                          if (cleanPhone) {
                            navigator.clipboard.writeText(cleanPhone).catch(() => {});
                            window.location.href = `tel:${cleanPhone}`;
                          } else {
                            alert("No valid phone number found.");
                          }
                        }}
                        className="flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors font-semibold text-xs w-full"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call {(() => {
                          const phoneNum = order.fulfillment_method === 'Delivery' && order.delivery_phone 
                            ? order.delivery_phone 
                            : order.customer_phone;
                          const p = String(phoneNum || '').replace(/[^0-9+]/g, '');
                          const masked = p.length >= 4 ? p.substring(0, 2) + 'XXXXXX' + p.slice(-2) : p;
                          return masked ? `(${masked})` : '';
                        })()}</span>
                      </button>
                      <button 
                        onClick={() => { setChatOrderId(order.id); setChatCustomerName(order.customer_name); }}
                        className="flex items-center justify-center space-x-2 py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors font-semibold text-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat</span>
                      </button>
                      {order.fulfillment_method === 'Delivery' && (
                        <a 
                          href={order.delivery_latitude && order.delivery_longitude 
                            ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
                            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address || '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors font-semibold text-xs text-center no-underline"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Navigate</span>
                        </a>
                      )}
                    </div>

                    {/* Shared pricing notes */}
                    <div className="grid grid-cols-1 gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mt-2">
                      <div className="flex flex-col py-1.5 border-b border-dashed space-y-1">
                        <div className="flex justify-between items-center text-sm font-black text-slate-900">
                          <span>Total Bill Amount:</span>
                          <span>{order.amount ? `₹${order.amount}` : 'Calculating...'}</span>
                        </div>
                        {(order.payment_method === 'Razorpay UPI' || order.payment_method === 'PhonePe UPI') && order.payment_status === 'Paid' && (
                          <div className="bg-amber-50 rounded-xl p-2.5 mt-2 border border-amber-200">
                            <div className="flex justify-between items-center text-xs text-emerald-700 font-bold">
                              <span>Advance Paid Online (10%):</span>
                              <span>₹{Math.min(parseFloat(order.amount) * 0.1, 50).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-amber-600 font-black mt-1 pt-1 border-t border-amber-200/50">
                              <span>Pending Amount to Collect:</span>
                              <span>₹{(parseFloat(order.amount) - Math.min(parseFloat(order.amount) * 0.1, 50)).toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-amber-700 mt-1.5 leading-tight">
                              ⚠️ The customer only paid an advance. You must collect the pending amount in cash/UPI {order.fulfillment_method === 'Delivery' ? 'at delivery' : 'at your shop'} when verifying the OTP.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {order.notes && (
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Shop/Customer Remarks</span>
                          <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700 italic">"{order.notes}"</p>
                        </div>
                      )}
                      
                      {order.preferred_pickup_time && (
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Schedule pickup</span>
                          <p className="font-bold text-slate-800">{order.preferred_pickup_time}</p>
                        </div>
                      )}

                      {/* UPI screenshot details */}
                      {order.payment_proof_image && (
                        <div className="border border-slate-200 bg-white p-3 rounded-2xl space-y-2">
                          <span className="block text-[10px] font-bold text-slate-500">Manual payment screenshot confirmation:</span>
                          <img
                            src={getFullImageUrl(order.payment_proof_image)}
                            alt="Receipt proof"
                            className="max-h-24 object-contain rounded border border-slate-100 mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(getFullImageUrl(order.payment_proof_image))}
                          />
                          <div className="flex space-x-2 pt-1 text-[10px]">
                            {['Confirmed', 'Packing Started'].includes(order.order_status) ? (
                              <button
                                onClick={() => handleProgress(order.id, 'Ready For Pickup')}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded text-center transition-all"
                              >
                                Verify Payment & Ready for Pickup
                              </button>
                            ) : order.order_status === 'Ready For Pickup' ? (
                              <button
                                onClick={() => handleProgress(order.id, 'Delivered')}
                                className="flex-1 py-1.5 bg-gradient-to-r from-kirana-500 to-amber-500 text-slate-950 font-extrabold rounded text-center transition-all"
                              >
                                Accept Payment & Deliver
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  alert('Payment Verified Offline.');
                                }}
                                className="flex-1 py-1.5 bg-slate-900 text-white font-semibold rounded text-center"
                              >
                                Accept Payment
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Image Preview Modal */}
      {previewImage && (
        <ImageModal 
          imageUrl={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
      )}

      {/* OTP Dialog Modal */}
      {otpDialogOrderId && (() => {
        const order = activeOrders.find(o => o.id === otpDialogOrderId);
        const isAdvancePaid = (order?.payment_method === 'Razorpay UPI' || order?.payment_method === 'PhonePe UPI') && order?.payment_status === 'Paid';
        const pendingAmount = isAdvancePaid 
          ? (parseFloat(order.amount) - Math.min(parseFloat(order.amount) * 0.1, 50)).toFixed(2)
          : order?.amount;
          
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg text-slate-800 mb-2">{order?.fulfillment_method === 'Delivery' ? 'Verify Delivery OTP' : 'Verify Pickup OTP'}</h3>
              <p className="text-sm text-slate-600 mb-4">
                Ask the customer for their 6-digit OTP to mark this order as delivered.
              </p>
              
              {(isAdvancePaid || order?.payment_method === 'Pay During Pickup') && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="block text-xs text-amber-700 font-bold mb-1">
                    {order?.payment_method === 'Pay During Pickup' 
                      ? (order.fulfillment_method === 'Delivery' ? 'Please collect full amount at delivery:' : 'Please collect full amount at shop:') 
                      : 'Please collect remaining balance:'}
                  </span>
                  <span className="block text-3xl font-black text-amber-600">₹{parseFloat(pendingAmount || 0).toFixed(2)}</span>
                </div>
              )}
            <input 
              type="text" 
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-widest font-bold py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-kirana-500 outline-none mb-4"
              placeholder="000000"
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => { setOtpDialogOrderId(null); setOtpInput(''); }}
                className="flex-1 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleVerifyOTP}
                disabled={otpInput.length !== 6}
                className="flex-1 py-2 bg-kirana-500 hover:bg-kirana-600 disabled:opacity-50 text-slate-900 font-bold rounded-xl"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderChat 
          orderId={chatOrderId}
          otherPartyName={chatCustomerName}
          onClose={() => setChatOrderId(null)}
        />
      )}
    </div>
  );
};

export default ActiveOrders;
