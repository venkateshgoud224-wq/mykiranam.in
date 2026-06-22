import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, AlertCircle, Loader2 } from 'lucide-react';

const EditOrderModal = ({ order, onClose, onSuccess, apiUrl, token }) => {
  // Parse existing digital items list
  let initialItems = [];
  try {
    if (order.digital_item_list) {
      initialItems = typeof order.digital_item_list === 'string' 
        ? JSON.parse(order.digital_item_list) 
        : order.digital_item_list;
    }
  } catch (e) {
    console.error('Error parsing digital_item_list in EditOrderModal', e);
  }

  // States
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState(order.notes || '');
  const [newChitti, setNewChitti] = useState(null);
  const [newChittiPreview, setNewChittiPreview] = useState(null);
  
  // New item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('packet');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle new item addition
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setError('Item name cannot be empty.');
      return;
    }
    if (!newItemQty || parseFloat(newItemQty) <= 0) {
      setError('Please specify a valid quantity.');
      return;
    }

    const newItem = {
      id: Date.now(),
      name: newItemName.trim(),
      quantity: newItemQty.toString(),
      unit: newItemUnit,
      status: 'added'
    };

    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemQty('');
    setNewItemUnit('packet');
    setError('');
  };

  // Remove item
  const handleRemoveItem = (indexToRemove) => {
    setItems(items.filter((_, idx) => idx !== indexToRemove));
  };

  // Edit quantity directly in list
  const handleUpdateQty = (index, value) => {
    const updated = [...items];
    updated[index].quantity = value;
    setItems(updated);
  };

  // Handle chitti file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewChitti(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewChittiPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('digital_item_list', JSON.stringify(items));
    formData.append('notes', notes);
    if (newChitti) {
      formData.append('new_chitti', newChitti);
    }

    try {
      const response = await fetch(`${apiUrl}/orders/${order.id}/edit-items`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order items.');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error saving changes.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-premium flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
              Edit Order Items & Chitti
            </h3>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
              Order #{order.custom_order_id || order.id}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {error && (
            <div className="p-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Alert explaining re-billing */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-normal">
            <strong>⚠️ Note:</strong> Adding or removing items will notify the shop. If the seller already generated the bill, the status will revert to <strong>Waiting For Seller</strong> so they can pack the new items and update your final bill amount.
          </div>

          {/* Digital Items List Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Digital Grocery List</h4>
            
            <div className="space-y-2 border border-slate-100 p-3 rounded-2xl bg-slate-50/50 max-h-48 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-4">
                  No digital items in this order yet. Add items below!
                </p>
              ) : (
                items.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between gap-2 pb-1.5 border-b border-dashed border-slate-200 last:border-0">
                    <span className="text-xs font-bold text-slate-800 flex-1 truncate">
                      {idx + 1}. {item.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(idx, e.target.value)}
                        className="w-14 px-1.5 py-1 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border px-1.5 py-1 rounded-lg">
                        {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-crimson rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inline Add Item Form */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <input
                type="text"
                placeholder="Item name (e.g. Sugar 1kg)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="col-span-6 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="Qty"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="col-span-2 px-2 py-2 text-center bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="col-span-3 px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none font-semibold text-slate-700"
              >
                <option value="packet">packet</option>
                <option value="kg">kg</option>
                <option value="gm">gm</option>
                <option value="liter">liter</option>
                <option value="ml">ml</option>
                <option value="piece">piece</option>
                <option value="box">box</option>
                <option value="bottle">bottle</option>
              </select>
              <button
                type="button"
                onClick={handleAddItem}
                className="col-span-1 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-950 flex items-center justify-center transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chitti File Upload Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">Handwritten Chitti (Optional)</h4>
            
            <div className="flex gap-4 items-center">
              <label className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-500 font-bold text-center">
                  {newChitti ? newChitti.name : 'Upload new chitti image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              
              {newChittiPreview && (
                <div className="w-16 h-16 rounded-xl border overflow-hidden bg-slate-100 flex-shrink-0">
                  <img src={newChittiPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Special Instructions / Notes</label>
            <textarea
              placeholder="e.g. Please choose brand Ashirvaad for atta."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2.5 flex-shrink-0 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-transparent rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
