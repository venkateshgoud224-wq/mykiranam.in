import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const BillingForm = ({ order, onCancel, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  const [editableItems, setEditableItems] = useState([]);
  const [billFile, setBillFile] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [amount, setAmount] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commitmentPaid, setCommitmentPaid] = useState(false);

  const units = ['KG', 'Gram', 'Litre', 'Packet', 'Piece', 'Dozen', 'Box'];

  useEffect(() => {
    if (order) {
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
              status: item.status || 'unchanged'
            }))
          );
        } catch (e) {
          console.error(e);
          setEditableItems([]);
        }
      }
    }
  }, [order]);

  const handleBillFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size cannot exceed 50MB.');
        e.target.value = '';
        return;
      }
      setBillFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBillPreview(reader.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const calculateGrandTotal = () => {
    return editableItems
      .filter(item => item.status !== 'removed')
      .reduce((sum, item) => {
        const pr = parseFloat(item.price) || 0;
        return sum + pr;
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
      quantity: '',
      unit: '',
      price: '',
      notes: '',
      status: 'added'
    };
    setEditableItems([...editableItems, newItem]);
  };

  const calculateItemSubtotal = (item) => {
    return (parseFloat(item.price) || 0).toFixed(2);
  };
  const [billUploaded, setBillUploaded] = useState(false);
  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    const isDigital = order.order_type === 'digital';
    const isRevision = !!order.item_change_history;

    if (!isDigital) {
      if (isRevision && !billFile) {
        setError('Please upload a new photo of the rewritten bill for the revision.');
        return;
      } else if (!isRevision && !billFile && !order.modified_bill) {
        setError('Please upload a photo of the rewritten bill.');
        return;
      }
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
        if (billFile) {
          formData.append('modified_bill', billFile);
        }

        response = await fetch(`${apiUrl}/orders/${order.id}/bill`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload bill.');
      }

      // After successful bill upload, notify parent
      setLoading(false);
      setError('');
      if (onSuccess) onSuccess();
      return;
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
    <div className="mt-4 p-4 border border-kirana-500/30 bg-kirana-50/20 rounded-2xl space-y-4 animate-fadeIn">
      <form onSubmit={handleAcceptSubmit} className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <h4 className="text-sm font-extrabold text-slate-900">
          {order.order_type === 'digital' ? 'Price Digital Grocery Chitti' : 'Upload Rewritten Invoice Bill'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

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
          <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-2">
            <span className="font-extrabold text-blue-900 flex items-center space-x-1.5 text-xs">
              <span className="text-base">📝</span>
              <span>Customer Revision Request</span>
            </span>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg text-[10px] font-black shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-blue-950 italic font-semibold bg-white p-2.5 rounded-lg border border-blue-100 text-xs shadow-sm">
              "{text}"
            </p>
          </div>
        );
      })()}

      {error && <div className="text-crimson text-xs font-semibold">{error}</div>}

      
        {order.order_type === 'digital' ? (
          // Digital order UI remains unchanged

          <div className="space-y-3">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">
              Grocery Items Pricing Sheet
            </span>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {editableItems.map((item) => {
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
                          type="text"
                          required
                          placeholder="Qty (e.g. 1, 250)"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemField(item.id, 'quantity', e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="">Unit</option>
                          {units.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="₹ Total Price"
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

            <div className="p-3 bg-amber-100/20 border border-amber-200 rounded-xl flex justify-between items-center text-xs mt-2">
              
              <span className="text-sm font-bold text-slate-950">₹{Math.min(parseFloat(calculateGrandTotal()) * 0.1, 50).toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Snap of rewritten chitti</label>
              <input type="file" accept="image/*" required={!order.modified_bill || !!order.item_change_history} onChange={handleBillFileChange} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:cursor-pointer" />
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
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-750">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-bold rounded-lg bg-kirana-500 text-slate-950 shadow-md">
            {loading ? 'Submitting...' : (order.order_type === 'digital' ? 'Send Invoice to Customer' : 'Send Invoice & Pack')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillingForm;
