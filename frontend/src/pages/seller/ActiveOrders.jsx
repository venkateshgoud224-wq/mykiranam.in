import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FileSpreadsheet, Eye, Play, CheckCircle2, User, ChevronDown, PackageCheck, AlertCircle, Trash2, Send, Download, ListOrdered, Plus, Minus, FileText, ClipboardList } from 'lucide-react';
import BillingForm from './BillingForm';
import ImageModal from '../../components/common/ImageModal';

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
            const showDeliverOrder = ['Ready For Pickup'].includes(order.order_status);
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
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Order #{order.custom_order_id || order.id} • Tel: {order.customer_phone}</p>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end flex-wrap gap-2 sm:gap-0 sm:space-y-1.5 w-full sm:w-auto">
                    {/* Status Badge */}
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-slate-100 text-slate-700 whitespace-nowrap">
                      {order.order_status}
                    </span>
                    {/* Payment Status Badge */}
                    {order.payment_method ? (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                        ['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method)
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method) ? 'Payment at pickup' : `Paid: ${order.payment_method}`}
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
                      <button
                        onClick={() => handleStartBilling(order)}
                        className="px-4 py-2 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex-1 sm:flex-none text-center whitespace-nowrap"
                      >
                        Edit Bill & Invoice
                      </button>
                    )}

                    {showReadyForDelivery && (
                      <button
                        onClick={() => handleProgress(order.id, 'Ready For Pickup')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1 flex-1 sm:flex-none whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready For Delivery</span>
                      </button>
                    )}



                    {showDeliverOrder && (
                      <button
                        onClick={() => handleProgress(order.id, 'Delivered')}
                        className="px-4 py-2 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-1 flex-1 sm:flex-none whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Deliver Order</span>
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
                            'Packing Started': ['Pay During Pickup', 'Manual UPI Payment'].includes(order.payment_method) ? '3. Payment at pickup & Packing' : '3. Paid & Packing',
                            'Ready For Pickup': '4. Ready'
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

                    <div className={`grid grid-cols-1 ${order.order_type === 'digital' || (order.original_chitti && order.original_chitti !== 'digital') ? 'md:grid-cols-2' : ''} gap-4`}>
                      
                      {/* Left: Original Chitti (Handwritten OR Digital Checklist) */}
                      {order.order_type === 'digital' ? (
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
                                      {!isRemoved && <span className="font-bold text-slate-800">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>}
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

                    {/* Shared pricing notes */}
                    <div className="grid grid-cols-1 gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mt-2">
                      <div className="flex justify-between items-center text-sm font-black text-slate-900 py-1.5 border-b border-dashed">
                        <span>Total Bill Amount:</span>
                        <span>{order.amount ? `₹${order.amount}` : 'Calculating...'}</span>
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
                            {['Confirmed', 'Ready For Pickup', 'Packing Started'].includes(order.order_status) ? (
                              <button
                                onClick={() => handleProgress(order.id, 'Delivered')}
                                className="flex-1 py-1.5 bg-gradient-to-r from-kirana-500 to-amber-500 text-slate-950 font-extrabold rounded text-center"
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
    </div>
  );
};

export default ActiveOrders;
