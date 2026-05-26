import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShoppingBag, Eye, Check, X, BellRing, Clock, Download, ListOrdered, ClipboardList } from 'lucide-react';

const NewOrders = ({ newOrders, onUpdateStatus }) => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAcceptOrder = async (orderId) => {
    setLoading(true);
    setError('');
    try {
      await onUpdateStatus(orderId, 'Accepted');
      playSoundAlert('success');
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message || 'Failed to accept order.');
    } finally {
      setLoading(false);
    }
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
      setRejectionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  return (
    <div className="space-y-4">
      {newOrders.length === 0 ? (
        <div className="py-12 bg-white border border-slate-100 rounded-3xl text-center p-8 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BellRing className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No New Orders</h4>
          <p className="text-xs text-slate-500 mt-1">Waiting for customers to place orders. Keep this page open; alerts play in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {newOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col justify-between animate-fadeIn"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Customer: {order.customer_name}
                    </h3>
                    <span className="text-[10px] text-slate-400">Order #{order.custom_order_id || order.id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold">
                    Pending
                  </span>
                </div>

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
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 bg-white"
                    />
                  )}
                  <div className="min-w-0 text-xs flex-1">
                    <span className="block font-semibold text-slate-700 max-w-[150px] truncate">
                      Notes: {order.notes || 'None'}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      🕒 Pickup: {order.preferred_pickup_time || 'Flexible'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => { setSelectedOrder(order); setShowRejectForm(false); }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-655 hover:bg-slate-50 transition-all flex items-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Details</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowRejectForm(true);
                    }}
                    className="p-2 text-crimson hover:bg-crimson/5 rounded-xl transition-all border border-slate-100 hover:border-crimson/10"
                    title="Reject Order"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-kirana-500 hover:bg-kirana-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-kirana-500/10 transition-all flex items-center space-x-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept Order</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail overlay Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  New Order Details: #{selectedOrder.custom_order_id || selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500">Customer: {selectedOrder.customer_name} ({selectedOrder.customer_phone || 'No phone'})</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowRejectForm(false);
                  setRejectionReason('');
                  setError('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Handwritten Image Viewer OR Digital Item List Checklist */}
              {selectedOrder.order_type === 'digital' ? (
                <div className="border border-slate-200 bg-amber-50/10 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200/50" />
                  <span className="block text-[10px] text-slate-450 uppercase font-black tracking-wider mb-3 pl-4 flex items-center space-x-1">
                    <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Grocery Chitti</span>
                  </span>
                  <div className="space-y-2.5 pl-4 max-h-[280px] overflow-y-auto pr-1">
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
                    className="max-h-[320px] object-contain rounded-xl shadow-sm hover:scale-125 transition-transform duration-350 cursor-zoom-in"
                  />
                  
                  {/* Download Button */}
                  <a
                    href={getFullImageUrl(selectedOrder.original_chitti)}
                    download={`chitti_order_${selectedOrder.id}.jpg`}
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
                <p className="text-slate-655">
                  🕒 <strong>Preferred Pickup Timing:</strong> {selectedOrder.preferred_pickup_time || 'Anytime today'}
                </p>
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
              ) : (
                <div className="flex space-x-2.5 pt-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-3 border border-crimson/20 hover:border-crimson text-crimson text-xs font-bold hover:bg-crimson/5 rounded-xl transition-all"
                  >
                    Reject Order
                  </button>
                  <button
                    onClick={() => handleAcceptOrder(selectedOrder.id)}
                    disabled={loading}
                    className="flex-[2] py-3 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept Order</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrders;
