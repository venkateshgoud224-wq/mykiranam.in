import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FileSpreadsheet, Eye, Play, CheckCircle2, User, ChevronDown, PackageCheck, AlertCircle, Trash2, Send, Download, ListOrdered, Plus, Minus, FileText, ClipboardList } from 'lucide-react';

const ActiveOrders = ({ activeOrders, onUpdateStatus }) => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  // Expand states for item trackers
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Billing state for orders in 'Accepted' state
  const [billingOrderId, setBillingOrderId] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [billFile, setBillFile] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [amount, setAmount] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const units = ['KG', 'Gram', 'Litre', 'Packet', 'Piece', 'Dozen', 'Box'];

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
    setBillingNotes(order.notes || '');
    setAmount(order.amount || '');
    setBillFile(null);
    setBillPreview(null);
    setError('');
    
    if (order.order_type === 'digital') {
      try {
        const listToParse = order.modified_item_list || order.digital_item_list || '[]';
        const parsed = typeof listToParse === 'string' ? JSON.parse(listToParse) : listToParse;
        setEditableItems(
          parsed.map(item => ({
            ...item,
            price: item.price !== undefined ? item.price : '',
            notes: item.notes || '',
            status: item.status || 'unchanged' // unchanged | modified | replaced | removed | added
          }))
        );
      } catch (e) {
        console.error(e);
        setEditableItems([]);
      }
    }
  };

  const handleBillFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBillFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBillPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const calculateGrandTotal = () => {
    return editableItems
      .filter(item => item.status !== 'removed')
      .reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const pr = parseFloat(item.price) || 0;
        return sum + (qty * pr);
      }, 0)
      .toFixed(2);
  };

  const handleUpdateItemField = (id, field, value) => {
    setEditableItems(
      editableItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'name' || field === 'quantity' || field === 'unit') {
            if (updated.status === 'unchanged') {
              updated.status = 'modified';
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveEditableItem = (id) => {
    setEditableItems(
      editableItems.map(item => {
        if (item.id === id) {
          return { ...item, status: 'removed' };
        }
        return item;
      })
    );
  };

  const handleAddEditableItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unit: 'KG',
      price: '',
      notes: '',
      status: 'added'
    };
    setEditableItems([...editableItems, newItem]);
  };

  const handleAcceptSubmit = async (e, order) => {
    e.preventDefault();
    const isDigital = order.order_type === 'digital';

    if (!isDigital && !billFile && !order.modified_bill) {
      setError('Please upload a photo of the rewritten bill.');
      return;
    }
    
    let totalAmt = amount;
    if (isDigital) {
      totalAmt = calculateGrandTotal();
      if (parseFloat(totalAmt) <= 0) {
        setError('Grand total must be greater than ₹0. Please enter item prices.');
        return;
      }
    } else {
      if (!totalAmt || isNaN(totalAmt) || parseFloat(totalAmt) <= 0) {
        setError('Please input a valid total amount.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (isDigital) {
        response = await fetch(`${apiUrl}/orders/${order.id}/bill`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            amount: totalAmt,
            notes: billingNotes,
            modified_item_list: editableItems
          })
        });
      } else {
        const formData = new FormData();
        formData.append('amount', totalAmt);
        formData.append('notes', billingNotes);
        formData.append('modified_bill', billFile);

        response = await fetch(`${apiUrl}/orders/${order.id}/bill`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload bill.');
      }
      playSoundAlert('success');
      setBillingOrderId(null);
      setBillFile(null);
      setBillPreview(null);
      setEditableItems([]);
      setAmount('');
      setBillingNotes('');
      // Trigger order list refresh
      await onUpdateStatus(order.id, 'Bill Uploaded');
    } catch (err) {
      setError(err.message || 'Error uploading bill.');
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
            const showReadyForDelivery = ['Packing Started', 'Bill Uploaded', 'Waiting For Customer Confirmation'].includes(order.order_status);
            const showDeliverOrder = ['Confirmed', 'Packing Completed'].includes(order.order_status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 transition-all"
              >
                {/* Active queue header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold uppercase tracking-wider text-kirana-600 bg-kirana-50 px-2 py-0.5 rounded-md mb-1.5">
                      <span>Queue Pos #{idx + 1}</span>
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
                      <span>Customer: {order.customer_name}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Order #{order.custom_order_id || order.id} • Tel: {order.customer_phone}</p>
                  </div>

                  {/* Status Badge */}
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-slate-100 text-slate-700">
                    {order.order_status}
                  </span>
                </div>

                {/* Queue flow action controls */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-55 flex-wrap">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="text-xs font-semibold text-slate-550 flex items-center space-x-1 hover:text-slate-755"
                  >
                    <span>View Details</span>
                    <ChevronDown className={`w-4 h-4 transform ${isExpanded ? 'rotate-180' : ''} transition-transform`} />
                  </button>

                  <div className="flex items-center space-x-2 ml-auto">
                    {['Accepted', 'Bill Uploaded', 'Waiting For Customer Confirmation', 'Confirmed', 'Packing Started', 'Packing Completed', 'Ready For Pickup'].includes(order.order_status) && billingOrderId !== order.id && (
                      <button
                        onClick={() => handleStartBilling(order)}
                        className="px-4 py-2 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
                      >
                        {order.amount ? 'Edit Bill & Invoice' : 'Prepare Bill & Invoice'}
                      </button>
                    )}

                    {showReadyForDelivery && (
                      <button
                        onClick={() => handleProgress(order.id, 'Ready For Pickup')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready For Delivery</span>
                      </button>
                    )}

                    {order.order_status === 'Ready For Pickup' && (
                      <span className="text-xs bg-amber-50 text-amber-800 border border-amber-250 px-3 py-2 rounded-xl font-bold">
                        Waiting for Customer Payment
                      </span>
                    )}

                    {showDeliverOrder && (
                      <button
                        onClick={() => handleProgress(order.id, 'Delivered')}
                        className="px-4 py-2.5 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center space-x-1"
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
                      className="p-2 text-slate-400 hover:text-crimson hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                      title="Cancel Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Billing Panel */}
                {billingOrderId === order.id && (
                  <div className="mt-4 p-4 border border-kirana-500/30 bg-kirana-50/20 rounded-2xl space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {order.order_type === 'digital' ? 'Price Digital Grocery Chitti' : 'Upload Rewritten Invoice Bill'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setBillingOrderId(null)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>

                    {error && <div className="text-crimson text-xs font-semibold">{error}</div>}

                    <form onSubmit={(e) => handleAcceptSubmit(e, order)} className="space-y-4">
                      {order.order_type === 'digital' ? (
                        /* DIGITAL INVOICE EDITOR INLINE */
                        <div className="space-y-3">
                          <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
                            Grocery Items Pricing Sheet
                          </span>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {editableItems.map((item, idx) => {
                              const isRemoved = item.status === 'removed';
                              return (
                                <div
                                  key={item.id}
                                  className={`p-3 bg-white rounded-xl border border-slate-150 space-y-2 relative transition-all ${
                                    isRemoved ? 'opacity-40 line-through border-red-150 bg-red-50/10' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      required={!isRemoved}
                                      disabled={isRemoved}
                                      placeholder="Product Name"
                                      value={item.name}
                                      onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-850"
                                    />

                                    {isRemoved ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItemField(item.id, 'status', 'modified')}
                                        className="p-1.5 hover:bg-slate-150 text-slate-500 rounded-lg text-[10px] font-bold"
                                      >
                                        Undo
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditableItem(item.id)}
                                        className="p-1.5 hover:bg-crimson/5 text-slate-400 hover:text-crimson rounded-lg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {!isRemoved && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                                      />
                                      <select
                                        value={item.unit}
                                        onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                                        className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                      >
                                        {units.map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="₹ Price / unit"
                                        value={item.price}
                                        onChange={(e) => handleUpdateItemField(item.id, 'price', e.target.value)}
                                        className="px-2 py-1.5 bg-slate-50 border-2 border-kirana-500/35 rounded-lg text-xs font-bold text-slate-900 focus:border-kirana-600 focus:outline-none"
                                      />
                                    </div>
                                  )}

                                  {!isRemoved && (
                                    <div className="flex items-center space-x-2 text-[10px]">
                                      <input
                                        type="text"
                                        placeholder="Replacement/Availability instructions (Optional)"
                                        value={item.notes}
                                        onChange={(e) => {
                                          handleUpdateItemField(item.id, 'notes', e.target.value);
                                          if (item.status === 'unchanged') {
                                            handleUpdateItemField(item.id, 'status', 'modified');
                                          }
                                        }}
                                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-150 rounded-lg placeholder-slate-400"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddEditableItem}
                            className="py-2 px-3 border border-dashed border-slate-300 hover:bg-white hover:border-slate-500 rounded-xl text-xs text-slate-600 font-bold flex items-center justify-center space-x-1 w-full"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add New Item</span>
                          </button>

                          <div className="p-3 bg-kirana-500/10 border border-kirana-500/25 rounded-xl flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-800">Grand Total:</span>
                            <span className="text-sm font-black text-slate-950">₹{calculateGrandTotal()}</span>
                          </div>
                        </div>
                      ) : (
                        /* HANDWRITTEN BILL FILE UPLOAD INLINE */
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">Snap of rewritten chitti</label>
                            <input type="file" accept="image/*" required={!order.modified_bill} onChange={handleBillFileChange} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:cursor-pointer" />
                            {billPreview ? (
                              <img src={billPreview} alt="Preview" className="max-h-36 rounded-xl border border-slate-200 mt-2 object-contain mx-auto" />
                            ) : order.modified_bill ? (
                              <img src={getFullImageUrl(order.modified_bill)} alt="Existing Bill" className="max-h-36 rounded-xl border border-slate-200 mt-2 object-contain mx-auto" />
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">Grand Total Amount (₹)</label>
                            <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs" placeholder="e.g. 450.50" />
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Invoice closing notes (Optional)</label>
                        <textarea value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs" placeholder="Pack details or substitutions..." />
                      </div>

                      <div className="flex space-x-2 pt-1">
                        <button type="button" onClick={() => setBillingOrderId(null)} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-750">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-bold rounded-lg bg-kirana-500 text-slate-950 shadow-md">
                          {loading ? 'Submitting...' : (order.order_type === 'digital' ? 'Send Invoice to Customer' : 'Send Invoice & Pack')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Expanded details sheet */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-55 bg-slate-50 p-4 rounded-2xl space-y-4 animate-fadeIn">
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
                              download={`original_chitti_${order.id}.jpg`}
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
                            className="max-h-56 w-full object-contain rounded-xl border border-slate-200 bg-white p-1"
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

                          {/* Customer requested changes log */}
                          {order.item_change_history && (
                            <div className="p-3.5 bg-blue-50 border border-blue-150 rounded-xl text-[10px]">
                              <span className="font-bold text-blue-900 block mb-1">Customer Revision Requests:</span>
                              <p className="text-blue-950 italic">
                                "{typeof order.item_change_history === 'string' 
                                  ? JSON.parse(order.item_change_history).requested_changes || order.item_change_history 
                                  : order.item_change_history.requested_changes}"
                              </p>
                            </div>
                          )}
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
                                  download={`rewritten_bill_${order.id}.jpg`}
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
                                className="max-h-56 w-full object-contain rounded-xl border border-slate-200 bg-white p-1"
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
                            className="max-h-24 object-contain rounded border border-slate-100 mx-auto"
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
    </div>
  );
};

export default ActiveOrders;
