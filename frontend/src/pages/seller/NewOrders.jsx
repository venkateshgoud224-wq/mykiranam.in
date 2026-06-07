import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShoppingBag, Eye, Check, X, BellRing, Clock, Download, ListOrdered, ClipboardList, Store } from 'lucide-react';
import BillingForm from './BillingForm';
import ImageModal from '../../components/common/ImageModal';

const NewOrders = ({ newOrders, onUpdateStatus, onTabChange, isRevision }) => {
  const { token, apiUrl, user } = useAuth();
  const { playSoundAlert } = useSocket();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const handleAcceptSuccess = async () => {
    // Refresh the order list from parent
    await onUpdateStatus(selectedOrder.id, 'Bill Uploaded'); // Trigger refresh but it's already updated on backend
    setSelectedOrder(null);
    setShowBillingForm(false);
  };

  const handleReject = async (orderId) => {
    if (!rejectionReason.trim()) {
      alert('Please state a reason for rejection.');
      return;
    }
    setLoading(true);
    try {
      await onUpdateStatus(orderId, 'Cancelled', rejectionReason);
      playSoundAlert('cancelled');
      setSelectedOrder(null);
      setShowRejectForm(false);
      setShowBillingForm(false);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCustomer = async (customerId) => {
    const reason = window.prompt("Reason for blocking this customer?");
    if (!reason) return;
    
    try {
      const response = await fetch(`${apiUrl}/seller-protection/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId, reason })
      });
      if (!response.ok) throw new Error('Failed to block customer');
      alert('Customer blocked successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReportCustomer = async (customerId) => {
    const reason = window.prompt("Reason for reporting this customer? (e.g. Abuse, Fake order)");
    if (!reason) return;
    
    try {
      const response = await fetch(`${apiUrl}/seller-protection/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId, reason, description: 'Reported from dashboard' })
      });
      if (!response.ok) throw new Error('Failed to report customer');
      alert('Customer reported successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  const getRevisionInfo = (order) => {
    if (!order.item_change_history) return null;
    try {
      const history = typeof order.item_change_history === 'string'
        ? JSON.parse(order.item_change_history)
        : order.item_change_history;
      return {
        tags: history.tags || [],
        text: history.requested_changes || null
      };
    } catch (e) {
      return {
        tags: [],
        text: typeof order.item_change_history === 'string' ? order.item_change_history : null
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* Seller Value Proposition Tagline Banner (Mobile Only, Medium Size) */}
      {!isRevision && (
        <div className="md:hidden bg-gradient-to-r from-kirana-500 to-amber-500 text-slate-950 p-3.5 rounded-[22px] shadow-sm relative overflow-hidden flex items-center justify-between gap-3 border border-kirana-600/15">
          {/* Abstract background shapes */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-white/10 rounded-l-full transform translate-x-8 scale-150 pointer-events-none" />
          <div className="absolute left-1/3 -top-10 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />
          
          <div className="flex items-center space-x-2.5 relative z-10 w-full">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
              <Store className="w-4.5 h-4.5 text-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-black tracking-tight leading-snug">
                Turn Your Kirana Store Into An Online Store.
              </h2>
              <p className="text-[10px] font-bold text-slate-800 mt-0.5 leading-tight">
                When your shop is quiet, let online orders keep it busy
              </p>
            </div>
          </div>
        </div>
      )}

      {newOrders.length === 0 ? (
        <div className="py-12 bg-white border border-slate-100 rounded-3xl text-center p-8 shadow-sm">
          <div className="w-14 h-14 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BellRing className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No New Orders</h4>
          <p className="text-sm text-slate-500 mt-2">Waiting for customers to place orders. Keep this page open; alerts play in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {newOrders.map((order) => {
            const revisionNotes = getRevisionInfo(order);
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col justify-between animate-fadeIn"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        Customer: {order.customer_name}
                      </h3>
                      {order.customer_level && (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${Number(order.reliability_score) < 50 ? 'bg-crimson/10 text-crimson border-crimson/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {Number(order.reliability_score) < 50 ? `High Risk (Reliability: ${order.reliability_score}%)` : `Reliability: ${order.reliability_score || 100}%`}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            • Pickups: {order.successful_pickups || 0} | Cancels: {order.cancellations || 0} | Abandoned: {order.abandoned_orders || 0}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">Order #{order.custom_order_id || order.id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex-shrink-0">
                      {revisionNotes ? (
                        <span className="px-2 py-0.5 bg-crimson/15 text-crimson border border-crimson/30 rounded text-[9px] font-extrabold uppercase animate-pulse whitespace-nowrap">
                          REVISION REQUESTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {getRevisionInfo(order) && getRevisionInfo(order).text && (() => {
                    const revInfo = getRevisionInfo(order);
                    return (
                      <div className="bg-crimson/5 border border-crimson/10 rounded-2xl p-3 text-xs">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-extrabold text-crimson block">⚠️ Revision Requested:</span>
                          {revInfo.tags.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-white border border-crimson text-crimson rounded text-[9px] font-black shadow-sm truncate max-w-[100px]">
                              {revInfo.tags[0]} {revInfo.tags.length > 1 ? `+${revInfo.tags.length - 1}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-750 italic leading-relaxed truncate">
                          "{revInfo.text}"
                        </p>
                      </div>
                    );
                  })()}
                  <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl">
                    {order.order_type === 'digital' || !order.original_chitti || order.original_chitti === 'digital' ? (
                      <div className="w-14 h-14 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                        <ListOrdered className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase">{order.order_type === 'digital' ? 'Digital' : 'No Chitti'}</span>
                      </div>
                    ) : (
                      <img
                        src={getFullImageUrl(order.original_chitti)}
                        alt="Chitti preview"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 bg-white cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(getFullImageUrl(order.original_chitti));
                        }}
                      />
                    )}
                    <div className="min-w-0 text-xs flex-1">
                      <span className="block font-semibold text-slate-700 max-w-[150px] truncate">
                        Notes: {order.notes || 'None'}
                      </span>
                      <span className="inline-block bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium ml-2">Manual Pickup (Default)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <button
                    onClick={() => { setSelectedOrder(order); setShowRejectForm(false); setShowBillingForm(false); }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-655 hover:bg-slate-50 transition-all flex items-center justify-center sm:justify-start space-x-1 border border-slate-100 sm:border-transparent"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Details</span>
                  </button>

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowRejectForm(true);
                      }}
                      className="p-2 text-crimson hover:bg-crimson/5 rounded-xl transition-all border border-slate-100 hover:border-crimson/10 flex-shrink-0"
                      title="Reject Order"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!user?.verified_whatsapp) {
                          sessionStorage.setItem('whatsapp_mandatory_alert', 'true');
                          if (onTabChange) onTabChange('profile');
                          return;
                        }
                        setSelectedOrder(order);
                        setShowBillingForm(true);
                      }}
                      className="px-4 py-2 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-kirana-500/10 transition-all flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept & Send Bill</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail overlay Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  New Order Details: #{selectedOrder.custom_order_id || selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500 truncate">Customer: {selectedOrder.customer_name} ({selectedOrder.customer_phone || 'No phone'})</p>
                {selectedOrder.customer_level && (
                  <div className="flex flex-col space-y-1 mt-1">
                    <div className="flex items-center space-x-1">
                      <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${Number(selectedOrder.reliability_score) < 50 ? 'bg-crimson/10 text-crimson border-crimson/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {Number(selectedOrder.reliability_score) < 50 ? `High Risk Customer (Reliability: ${selectedOrder.reliability_score}%)` : `Reliability: ${selectedOrder.reliability_score || 100}%`}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        • Pickups: {selectedOrder.successful_pickups || 0} | Cancels: {selectedOrder.cancellations || 0} | Abandoned: {selectedOrder.abandoned_orders || 0}
                      </span>
                    </div>
                    {/* Seller Protection Actions */}
                    <div className="flex items-center space-x-2 mt-1">
                      <button 
                        onClick={() => handleBlockCustomer(selectedOrder.customer_id)}
                        className="text-[9px] font-bold text-crimson hover:underline"
                      >
                        Block Customer
                      </button>
                      <span className="text-[9px] text-slate-300">|</span>
                      <button 
                        onClick={() => handleReportCustomer(selectedOrder.customer_id)}
                        className="text-[9px] font-bold text-amber-600 hover:underline"
                      >
                        Report Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowRejectForm(false);
                  setShowBillingForm(false);
                  setRejectionReason('');
                  setError('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

              {getRevisionInfo(selectedOrder) && getRevisionInfo(selectedOrder).text && (() => {
                const { tags, text } = getRevisionInfo(selectedOrder);
                return (
                  <div className="bg-crimson/10 border border-crimson/25 rounded-2xl p-4 text-xs text-slate-900 space-y-2">
                    <span className="font-extrabold text-crimson text-sm flex items-center space-x-1">
                      <span>⚠️ Customer Requested Order Revisions</span>
                    </span>
                    {tags && tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {tags.map((tag, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-white border border-crimson/30 text-crimson rounded text-[9px] font-black shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="bg-white p-3 rounded-xl border border-crimson/10 italic text-slate-805 font-semibold">
                      "{text}"
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Please click **Accept & Send Bill** to update items and send the revised invoice.
                    </p>
                  </div>
                );
              })()}

              {/* Handwritten Image Viewer OR Digital Item List Checklist */}
              {selectedOrder.order_type === 'digital' ? (
                <div className="border border-slate-200 bg-amber-50/10 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200/50" />
                  <span className="block text-[10px] text-slate-455 uppercase font-black tracking-wider mb-3 pl-4 flex items-center space-x-1">
                    <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Grocery Chitti</span>
                  </span>
                  <div className="space-y-4 overflow-y-auto pr-1">
                    {JSON.parse(selectedOrder.digital_item_list || '[]').map((item, idx) => (
                      <div key={item.id || idx} className="flex items-baseline space-x-2.5 pb-2 border-b border-dashed border-slate-150">
                        <span className="text-xs font-bold text-slate-800">{idx + 1}. {item.name}</span>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-250 rounded text-[9px] font-black uppercase">
                          {item.quantity} {item.unit}
                        </span>
                        {item.notes && (
                          <span className="text-[10px] text-slate-550 italic">• {item.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (selectedOrder.original_chitti && selectedOrder.original_chitti !== 'digital') ? (
                <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden relative group max-h-[350px] flex items-center justify-center p-2.5">
                  <img
                    src={getFullImageUrl(selectedOrder.original_chitti)}
                    alt="Original Chitti View"
                    className="max-h-[320px] object-contain rounded-xl shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage(getFullImageUrl(selectedOrder.original_chitti))}
                  />
                  
                  {/* Download Button */}
                  <a
                    href={getFullImageUrl(selectedOrder.original_chitti)}
                    download={`chitti_order_${selectedOrder.id}.${selectedOrder.original_chitti.split('.').pop()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900/90 text-white rounded-lg transition-all flex items-center space-x-1 text-[10px] font-semibold backdrop-blur-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ) : null}

              {/* Note / pickup time Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                {selectedOrder.notes && (
                  <p className="text-slate-700">
                    <strong>Customer Instructions:</strong> "{selectedOrder.notes}"
                  </p>
                )}
                <span className="inline-block bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium ml-2">Manual Pickup (Default)</span>
              </div>

              {error && <div className="text-crimson text-xs font-semibold">{error}</div>}

              {showRejectForm ? (
                <div className="p-4 border border-crimson/20 bg-crimson/5 rounded-2xl space-y-3 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700">Reason for Rejecting Order</label>
                  <textarea
                    required
                    placeholder="e.g. Items out of stock, shop closing early..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:border-kirana-500 focus:outline-none"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-750"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => handleReject(selectedOrder.id)}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-crimson text-white hover:bg-crimson/90"
                    >
                      {loading ? 'Cancelling...' : 'Confirm Reject & Cancel'}
                    </button>
                  </div>
                </div>
              ) : showBillingForm ? (
                <BillingForm 
                  order={selectedOrder} 
                  onCancel={() => setShowBillingForm(false)} 
                  onSuccess={handleAcceptSuccess} 
                />
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full sm:flex-1 py-3 border border-crimson/20 hover:border-crimson text-crimson text-xs font-bold hover:bg-crimson/5 rounded-xl transition-all"
                  >
                    Reject Order
                  </button>
                  <button
                    onClick={() => {
                      if (!user?.verified_whatsapp) {
                        sessionStorage.setItem('whatsapp_mandatory_alert', 'true');
                        if (onTabChange) onTabChange('profile');
                        return;
                      }
                      setShowBillingForm(true);
                    }}
                    className="w-full sm:flex-[2] py-3 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept & Prepare Bill</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <ImageModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default NewOrders;
