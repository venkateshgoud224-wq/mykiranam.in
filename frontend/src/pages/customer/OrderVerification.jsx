import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ArrowRight, Eye, FileText, CheckCircle2, XCircle, AlertCircle, Upload, QrCode, ThumbsUp, ThumbsDown, RefreshCcw } from 'lucide-react';

const OrderVerification = ({ order, onBack, onVerifySuccess, initialViewState }) => {
  const { token, apiUrl } = useAuth();
  
  // States
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState(null);
  
  // Workflow step switches: review | pay | request_changes
  const [viewState, setViewState] = useState(initialViewState || 'review'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionTags, setRevisionTags] = useState([]);

  // Handle proof screenshot upload
  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirm order action (Approve & Pay)
  const handleConfirmOrder = async (e) => {
    if (e) e.preventDefault();
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('payment_method', paymentMethod);
    if (paymentProofFile) {
      formData.append('payment_proof_image', paymentProofFile);
    }

    try {
      const response = await fetch(`${apiUrl}/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to confirm order.');

      onVerifySuccess();
    } catch (err) {
      setError(err.message || 'Error confirming order.');
      setLoading(false);
    }
  };

  // Customer rejects modifications (Cancels Order)
  const handleRejectModifications = async () => {
    if (!window.confirm('Are you sure you want to reject modifications and cancel this order?')) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Cancelled',
          reason: 'Customer rejected seller modifications'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel order.');
      }
      onVerifySuccess();
    } catch (err) {
      setError(err.message || 'Error cancelling order.');
      setLoading(false);
    }
  };

  // Customer requests revisions/changes
  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (!revisionNotes.trim()) {
      setError('Please specify the changes you would like the shop to make.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Waiting For Seller',
          reason: revisionNotes,
          item_change_history: {
            requested_changes: revisionNotes,
            timestamp: new Date()
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit change request.');
      }
      onVerifySuccess();
    } catch (err) {
      setError(err.message || 'Error submitting request.');
      setLoading(false);
    }
  };

  // Helper to resolve backend image paths dynamically
  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  const isDigital = order.order_type === 'digital';

  // Parse Digital Lists
  const getDigitalLists = () => {
    try {
      const orig = JSON.parse(order.digital_item_list || '[]');
      const mod = JSON.parse(order.modified_item_list || '[]');
      return { orig, mod };
    } catch (e) {
      return { orig: [], mod: [] };
    }
  };

  const { orig: originalItems, mod: modifiedItems } = getDigitalLists();

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-premium pb-20 md:pb-6">
      
      {/* Header bar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-xl text-slate-655 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Order verification</span>
          <h2 className="text-base font-extrabold text-slate-900">Verify Bill: Order #{order.custom_order_id || order.id}</h2>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="p-3 mb-6 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold">
            {error}
          </div>
        )}

        {/* --- REVIEW MODE (SPLIT SCREEN OR SMART COMPARISON) --- */}
        {viewState === 'review' && (
          <div className="space-y-6 animate-fadeIn">
            {isDigital ? (
              /* DIGITAL COMPARISON LAYOUT */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: Customer original typed list */}
                <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 relative overflow-hidden">
                  <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200/50" />
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wide mb-3 ml-4">
                    📄 Your Original Chitti
                  </span>
                  
                  <div className="space-y-3 pl-4">
                    {originalItems.map((item, idx) => (
                      <div key={item.id || idx} className="pb-2 border-b border-dashed border-slate-200 text-xs flex justify-between items-baseline">
                        <span className="font-bold text-slate-800">{idx + 1}. {item.name}</span>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-250 rounded text-[9px] font-black uppercase">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN: Seller interactive modifications */}
                <div className="border border-slate-250 rounded-3xl p-5 bg-amber-50/5 relative overflow-hidden">
                  <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-red-200/50" />
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-kirana-500 text-slate-950 uppercase tracking-wide mb-3 ml-4">
                    🛒 Shop's Priced Invoice
                  </span>

                  <div className="space-y-3 pl-4">
                    {modifiedItems.map((item, idx) => {
                      const isRemoved = item.status === 'removed';
                      const isAdded = item.status === 'added';
                      const isReplaced = item.status === 'replaced';
                      const isModified = item.status === 'modified';
                      
                      let bgClass = 'bg-white';
                      let badge = null;

                      if (isRemoved) {
                        bgClass = 'bg-red-50/40 line-through text-red-500';
                        badge = <span className="px-1.5 py-0.5 bg-red-100 text-red-750 border border-red-200 rounded text-[8px] font-black uppercase">Out of Stock</span>;
                      } else if (isAdded) {
                        bgClass = 'bg-emerald-50/40 border-emerald-100';
                        badge = <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-850 border border-emerald-250 rounded text-[8px] font-black uppercase">Added by Shop</span>;
                      } else if (isReplaced) {
                        bgClass = 'bg-indigo-50/30 border-indigo-100';
                        badge = <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-850 border border-indigo-250 rounded text-[8px] font-black uppercase">Substituted</span>;
                      } else if (isModified) {
                        bgClass = 'bg-amber-50/40 border-amber-100';
                        badge = <span className="px-1.5 py-0.5 bg-amber-100 text-amber-850 border border-amber-250 rounded text-[8px] font-black uppercase">Qty Adjusted</span>;
                      }

                      return (
                        <div key={item.id || idx} className={`p-2.5 rounded-xl border border-slate-150 flex justify-between items-start transition-all ${bgClass}`}>
                          <div className="min-w-0 pr-1 text-xs">
                            <span className="font-bold block text-slate-900">
                              {idx + 1}. {item.name}
                            </span>
                            
                            <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border">
                                {item.quantity} {item.unit}
                              </span>
                              {badge}
                            </div>
                            
                            {item.notes && (
                              <span className="block text-[10px] text-slate-500 italic mt-1.5">• {item.notes}</span>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0 text-xs">
                            {!isRemoved && (
                              <>
                                <span className="font-extrabold text-slate-900 block">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                                <span className="text-[9px] text-slate-400 font-semibold block">₹{item.price}/{item.unit}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              /* HANDWRITTEN IMAGES COMPARISON LAYOUT */
              <div className={`grid grid-cols-1 ${order.original_chitti && order.original_chitti !== 'digital' ? 'md:grid-cols-2' : ''} gap-6`}>
                
                {/* LEFT SIDE: Original handwritten chitti */}
                {order.original_chitti && order.original_chitti !== 'digital' && (
                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          Left: Your Original Chitti
                        </span>
                        <a
                          href={getFullImageUrl(order.original_chitti)}
                          download={`original_chitti_${order.id}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-kirana-600 hover:underline flex items-center space-x-1"
                        >
                          <span>Download Chitti</span>
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Zoom in to cross-verify written items with the bill:</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center border border-slate-200 bg-white rounded-xl overflow-hidden min-h-[300px] max-h-[400px]">
                      <img
                        src={getFullImageUrl(order.original_chitti)}
                        alt="Original Chitti"
                        className="w-full h-full object-contain hover:scale-110 transition-transform cursor-zoom-in"
                      />
                    </div>
                  </div>
                )}

                {/* RIGHT SIDE: Seller modified bill/chitti */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-kirana-50/10 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-kirana-500 text-slate-950">
                        Right: Seller's Rewritten Bill
                      </span>
                      <a
                        href={getFullImageUrl(order.modified_bill)}
                        download={`rewritten_bill_${order.id}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-kirana-600 hover:underline flex items-center space-x-1"
                      >
                        <span>Download Bill</span>
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Review final item prices and comments written down by the shop:</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center border border-slate-200 bg-white rounded-xl overflow-hidden min-h-[300px] max-h-[400px]">
                    <img
                      src={getFullImageUrl(order.modified_bill)}
                      alt="Modified Bill Chitti"
                      className="w-full h-full object-contain hover:scale-110 transition-transform cursor-zoom-in"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Pricing Invoice Summary card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Bill Amount</span>
                <h3 className="text-2xl font-black text-slate-900">₹{order.amount}</h3>
                {order.notes && (
                  <p className="text-xs text-slate-655 mt-2 bg-white px-3 py-2 rounded-xl border border-slate-100 italic">
                    <strong>Shop note:</strong> "{order.notes}"
                  </p>
                )}
              </div>

              {/* Hybrid Review Action Layout */}
              <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto">
                {order.order_status !== 'Ready For Pickup' && (
                  <>
                    <button
                      onClick={handleRejectModifications}
                      disabled={loading}
                      className="px-4 py-2.5 rounded-xl border border-crimson/20 hover:border-crimson text-crimson text-xs font-bold hover:bg-crimson/5 transition-all flex items-center space-x-1"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Reject & Cancel</span>
                    </button>
                    <button
                      onClick={() => setViewState('request_changes')}
                      disabled={loading}
                      className="px-4 py-2.5 rounded-xl border border-slate-350 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                      <span>Request Revision</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewState('pay')}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-black shadow-lg shadow-kirana-500/10 active:scale-[0.99] transition-all flex items-center space-x-1.5"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Approve & Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- REQUEST CHANGES INTERFACE --- */}
        {viewState === 'request_changes' && (() => {
          // Parse current revision history to check limits
          let currentRevisionCount = 0;
          if (order.item_change_history) {
            try {
              const hist = typeof order.item_change_history === 'string'
                ? JSON.parse(order.item_change_history)
                : order.item_change_history;
              currentRevisionCount = hist.revision_count || 0;
            } catch (e) {
              currentRevisionCount = 1;
            }
          }

          if (currentRevisionCount >= 2) {
            return (
              <div className="max-w-md mx-auto space-y-4 animate-fadeIn bg-red-50 p-6 rounded-3xl border border-red-100 text-center">
                <span className="text-3xl block mb-2">🛑</span>
                <h3 className="text-base font-extrabold text-red-900">Maximum Revisions Reached</h3>
                <p className="text-xs text-red-700 mb-4">
                  You have already requested revisions 2 times. To prevent endless looping, you can no longer request changes for this order.
                </p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setViewState('review')}
                    className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-950 transition-all"
                  >
                    Go Back & Pay
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectModifications}
                    className="flex-1 py-3 text-xs font-bold rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-all"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="max-w-md mx-auto space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <span className="text-2xl">📝</span>
                <h3 className="text-base font-extrabold text-slate-900">Request Bill Changes</h3>
                <p className="text-xs text-slate-500">
                  Select the type of change and state clearly what edits you want. The seller will get an alert and update the pricing sheets.
                  <strong className="block mt-1 text-kirana-600">Revisions left: {2 - currentRevisionCount}</strong>
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!revisionNotes.trim()) {
                  setError('Please specify the changes you would like the shop to make.');
                  return;
                }

                setLoading(true);
                setError('');

                fetch(`${apiUrl}/orders/${order.id}/status`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    status: 'Waiting For Seller',
                    reason: revisionNotes,
                    item_change_history: {
                      tags: revisionTags || [],
                      requested_changes: revisionNotes,
                      revision_count: currentRevisionCount + 1,
                      timestamp: new Date()
                    }
                  })
                }).then(async (response) => {
                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to submit change request.');
                  }
                  onVerifySuccess();
                }).catch(err => {
                  setError(err.message || 'Error submitting request.');
                  setLoading(false);
                });
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">What do you want the seller to do?</label>
                  <div className="flex flex-wrap gap-2">
                    {['🗑️ Remove Item', '➕ Add Item', '🔄 Replace Item', '💰 Reduce Price', '❓ Other'].map(tag => {
                      const isSelected = (revisionTags || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const currentTags = revisionTags || [];
                            setRevisionTags(
                              isSelected ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                            isSelected 
                              ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Detailed Instructions</label>
                  <textarea
                    required
                    placeholder="e.g. Please remove the fortune sunflower oil. Also add 2 packets of Maggie if available."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setViewState('review')}
                    className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-950 shadow-md transition-all"
                  >
                    {loading ? 'Submitting request...' : 'Send Request to Shop'}
                  </button>
                </div>
              </form>
            </div>
          );
        })()}

        {/* --- CONFIRM & PAYMENT MODE --- */}
        {viewState === 'pay' && (
          <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
            <h3 className="text-lg font-extrabold text-slate-900">Select Payment Option</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setPaymentMethod('Pay During Pickup'); setError(''); }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  paymentMethod === 'Pay During Pickup'
                    ? 'border-kirana-500 bg-kirana-50/50 text-kirana-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-655'
                }`}
              >
                <span className="block text-xl mb-1.5">💵</span>
                <span className="text-xs">Pay during Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod('Manual UPI Payment'); setError(''); }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  paymentMethod === 'Manual UPI Payment'
                    ? 'border-kirana-500 bg-kirana-50/50 text-kirana-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-655'
                }`}
              >
                <span className="block text-xl mb-1.5">📱</span>
                <span className="text-xs">Manual UPI QR</span>
              </button>
            </div>

            {paymentMethod === 'Manual UPI Payment' && (
              <div className="space-y-4 p-4 border border-slate-150 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Seller UPI ID</span>
                  <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-100 select-all block mt-1">
                    {order.upi_id || 'Seller hasn\'t added UPI ID. Pay on pickup.'}
                  </span>
                </div>

                {order.upi_id && (
                  <div className="pt-1">
                    <a
                      href={`upi://pay?pa=${order.upi_id}&pn=${encodeURIComponent(order.shop_name)}&am=${order.amount}&cu=INR`}
                      className="w-full py-2 bg-kirana-500 hover:bg-kirana-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1"
                    >
                      <span>📱 Pay Directly via UPI App</span>
                    </a>
                    <p className="text-[9px] text-slate-400 text-center mt-1">Clicking above automatically opens GPay, PhonePe, or BHIM UPI on mobile devices</p>
                  </div>
                )}

                {(order.qr_code_image || order.upi_id) && (
                  <div className="flex flex-col items-center py-2.5">
                    <span className="text-[10px] font-bold text-slate-500 mb-2">Scan Shop QR Code to Pay ₹{order.amount}</span>
                    <img
                      src={
                        order.qr_code_image
                          ? getFullImageUrl(order.qr_code_image)
                          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                              `upi://pay?pa=${order.upi_id}&pn=${order.shop_name}&am=${order.amount}&cu=INR`
                            )}`
                      }
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Upload proof receipt */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload Payment Proof Screenshot (Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-950 file:cursor-pointer"
                  />
                  {paymentProofPreview && (
                    <img
                      src={paymentProofPreview}
                      alt="Receipt Preview"
                      className="max-h-32 rounded-xl mt-2 border border-slate-200 object-contain mx-auto"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setViewState('review')}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={loading || (paymentMethod === 'Manual UPI Payment' && !order.upi_id)}
                className="flex-1 py-3 bg-gradient-to-r from-kirana-500 to-amber-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? 'Confirming...' : 'Submit Confirmation'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderVerification;
