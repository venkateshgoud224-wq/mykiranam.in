import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { History, ShoppingBag, Eye, Calendar, DollarSign, Check, X, Download, AlertCircle } from 'lucide-react';
import ImageModal from '../../components/common/ImageModal';
import ReportCustomerModal from '../../components/seller/ReportCustomerModal';

const CompletedOrders = ({ completedOrders }) => {
  const { apiUrl, token } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [reportingOrder, setReportingOrder] = useState(null);
  const [refundingOrderId, setRefundingOrderId] = useState(null);


  const getStatusColor = (status) => {
    if (status === 'Delivered') return 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20';
    return 'bg-crimson/10 text-crimson border-crimson/20';
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  return (
    <div className="space-y-4">
      {completedOrders.length === 0 ? (
        <div className="py-12 bg-white border border-slate-100 rounded-3xl text-center p-8 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Sales History</h4>
          <p className="text-xs text-slate-500 mt-1">Complete your first delivery in the active queue to view logs here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-900 truncate">{order.customer_name}</h3>
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 truncate">
                  <span className="truncate">Order #{order.custom_order_id || order.id}</span>
                  <span>•</span>
                  <span className="whitespace-nowrap">{new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <span className="block text-[11px] font-bold text-slate-700 truncate">
                  {order.amount ? `₹${order.amount}` : 'No amount'} • {order.payment_method || 'Unpaid'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${getStatusColor(order.order_status)}`}
                >
                  {order.order_status}
                </span>
                <button
                  onClick={() => setReportingOrder(order)}
                  className="p-2 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-600 border border-slate-100 transition-all"
                  title="Raise Complaint"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 border border-slate-100 transition-all"
                  title="View order history logs"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details modal logs */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 truncate">Historical Order #{selectedOrder.custom_order_id || selectedOrder.id} Log</h3>
                <p className="text-xs text-slate-500 truncate">Customer: {selectedOrder.customer_name}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Structured digital items list OR Image previews */}
              {selectedOrder.order_type === 'digital' ? (
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="block text-slate-400 font-bold mb-1 flex justify-between items-center">
                      <span>📄 Original Chitti List</span>
                    </span>
                    <div className="border border-slate-200 bg-slate-50 p-2.5 rounded max-h-40 overflow-y-auto space-y-1.5">
                      {JSON.parse(selectedOrder.digital_item_list || '[]').map((item, idx) => (
                        <div key={item.id || idx} className="text-[10px] pb-1 border-b border-dashed border-slate-200 flex justify-between">
                          <span className="font-semibold text-slate-800">{idx + 1}. {item.name}</span>
                          <span className="text-slate-500">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold mb-1 flex justify-between items-center">
                      <span>🛒 Final Billed Items</span>
                    </span>
                    <div className="border border-slate-200 bg-slate-50 p-2.5 rounded max-h-40 overflow-y-auto space-y-1.5">
                      {JSON.parse(selectedOrder.modified_item_list || '[]').map((item, idx) => {
                        const isRemoved = item.status === 'removed';
                        return (
                          <div key={item.id || idx} className={`text-[10px] pb-1 border-b border-dashed border-slate-200 flex justify-between ${isRemoved ? 'line-through opacity-40 text-red-500' : ''}`}>
                            <span className="font-bold text-slate-800">{idx + 1}. {item.name}</span>
                            {!isRemoved && <span className="font-semibold text-slate-700">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`grid ${selectedOrder.original_chitti && selectedOrder.original_chitti !== 'digital' && selectedOrder.modified_bill ? 'grid-cols-2' : 'grid-cols-1'} gap-3 text-[10px]`}>
                  {selectedOrder.original_chitti && selectedOrder.original_chitti !== 'digital' && (
                    <div>
                      <span className="block text-slate-400 font-bold mb-1 flex justify-between items-center">
                        <span>Customer Chitti</span>
                        <a
                          href={getFullImageUrl(selectedOrder.original_chitti)}
                          target="_blank"
                          download={`original_chitti_${selectedOrder.id}.${selectedOrder.original_chitti.split('.').pop()}`}
                          rel="noreferrer"
                          className="text-kirana-600 hover:underline font-extrabold flex items-center space-x-0.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </span>
                      <img
                        src={getFullImageUrl(selectedOrder.original_chitti)}
                        alt="Original Chitti"
                        className="max-h-36 w-full object-contain rounded border border-slate-200 bg-slate-50 p-1 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(getFullImageUrl(selectedOrder.original_chitti))}
                      />
                    </div>
                  )}
                  {selectedOrder.modified_bill && (
                    <div>
                      <span className="block text-slate-400 font-bold mb-1 flex justify-between items-center">
                        <span>Uploaded Bill Invoice</span>
                        <a
                          href={getFullImageUrl(selectedOrder.modified_bill)}
                          target="_blank"
                          download={`rewritten_bill_${selectedOrder.id}.${selectedOrder.modified_bill.split('.').pop()}`}
                          rel="noreferrer"
                          className="text-kirana-600 hover:underline font-extrabold flex items-center space-x-0.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </span>
                      <img
                        src={getFullImageUrl(selectedOrder.modified_bill)}
                        alt="Rewritten Bill"
                        className="max-h-36 w-full object-contain rounded border border-slate-200 bg-slate-50 p-1 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(getFullImageUrl(selectedOrder.modified_bill))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Invoicing details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                <p className="text-slate-700"><strong>Final Price:</strong> ₹{selectedOrder.amount || '0.00'}</p>
                <p className="text-slate-700"><strong>Gateway Fee:</strong> ₹{selectedOrder.gateway_fee ? (selectedOrder.gateway_fee/100).toFixed(2) : '0.00'}</p>
                <p className="text-slate-700"><strong>Payment:</strong> {selectedOrder.payment_method} ({selectedOrder.payment_status})</p>
                {selectedOrder.notes && (
                  <p className="text-slate-750"><strong>Closing notes:</strong> "{selectedOrder.notes}"</p>
                )}
                <p className="text-[10px] text-slate-400">Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>


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

      {reportingOrder && (
        <ReportCustomerModal
          order={reportingOrder}
          onClose={() => setReportingOrder(null)}
          onSuccess={() => { setReportingOrder(null); alert('Your complaint has been submitted for review.'); }}
        />
      )}
    </div>
  );
};

export default CompletedOrders;
