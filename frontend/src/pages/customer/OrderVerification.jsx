import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ArrowRight, Eye, FileText, CheckCircle2, XCircle, AlertCircle, Upload, ThumbsUp, ThumbsDown, RefreshCcw, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import ImageModal from '../../components/common/ImageModal';
import QRCode from 'react-qr-code';

const OrderVerification = ({ order, onBack, onVerifySuccess, initialViewState }) => {
  const { token, apiUrl, extraData } = useAuth();
  const isDigital = order.order_type === 'digital';
  
  // States
  const [paymentMethod, setPaymentMethod] = useState('Manual UPI Payment');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paymentUtr, setPaymentUtr] = useState('');
  // Fulfillment states
  const [fulfillmentMethod, setFulfillmentMethod] = useState(order.fulfillment_method || 'Pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address || '');
  const [deliveryLandmark, setDeliveryLandmark] = useState(order.delivery_landmark || '');
  const [deliveryPhone, setDeliveryPhone] = useState(order.delivery_phone || '');
  const [deliveryLat, setDeliveryLat] = useState(order.delivery_latitude || null);
  const [deliveryLng, setDeliveryLng] = useState(order.delivery_longitude || null);
  const [locationSuccess, setLocationSuccess] = useState(order.delivery_latitude ? `📍 Coordinates: ${order.delivery_latitude}, ${order.delivery_longitude}` : '');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  // Workflow step switches: review | pay | request_changes
  const [viewState, setViewState] = useState(initialViewState || 'review'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionTags, setRevisionTags] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const cancellationsCount = Number(order.cancellations !== undefined ? order.cancellations : (extraData?.trustMetrics?.cancellations || 0));
  const suspensionEndDate = extraData?.trustMetrics?.suspension_end_date;
  const isSuspended = suspensionEndDate && new Date(suspensionEndDate) > new Date();
  const isSecurityDepositRequired = cancellationsCount >= 3 || isSuspended;
  const needsSecurityDeposit = isSecurityDepositRequired && order.commitment_status !== 'paid' && order.commitment_status !== 'settled';

  const saveFulfillmentDetails = async () => {
    try {
      const res = await fetch(`${apiUrl}/orders/${order.id}/fulfillment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fulfillment_method: fulfillmentMethod,
          delivery_address: fulfillmentMethod === 'Delivery' ? deliveryAddress : null,
          delivery_landmark: fulfillmentMethod === 'Delivery' ? deliveryLandmark : null,
          delivery_phone: fulfillmentMethod === 'Delivery' ? deliveryPhone : null,
          delivery_latitude: fulfillmentMethod === 'Delivery' ? deliveryLat : null,
          delivery_longitude: fulfillmentMethod === 'Delivery' ? deliveryLng : null
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update fulfillment details.');
      }
    } catch (err) {
      console.error("Fulfillment details save error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const method = queryParams.get('method') || sessionStorage.getItem('kirana_verificationMethod');
    const transactionId = queryParams.get('transactionId') || sessionStorage.getItem('kirana_verificationTransactionId');
    const payMethod = queryParams.get('pay_method') || sessionStorage.getItem('kirana_verificationPayMethod') || 'Pay During Pickup';
    
    if (method === 'phonepe' && transactionId) {
      setLoading(true);
      // Clean up session storage so we don't trigger verification again on refresh
      sessionStorage.removeItem('kirana_verificationMethod');
      sessionStorage.removeItem('kirana_verificationTransactionId');
      sessionStorage.removeItem('kirana_verificationPayMethod');
      sessionStorage.removeItem('kirana_verificationOrderId');

      fetch(`${apiUrl}/payment/phonepe/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: transactionId,
          order_id: order.id,
          payment_method: payMethod
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          onVerifySuccess();
        } else {
          setError(data.error || 'Payment verification failed');
        }
      })
      .catch(err => {
        setError('Error verifying PhonePe payment.');
      })
      .finally(() => {
        setLoading(false);
        // Clean URL
        const cleanUrl = window.location.href.split('&method=phonepe')[0];
        window.history.replaceState({}, '', cleanUrl);
      });
    }
  }, []);



  // Confirm order action (Approve & Pay)
  const handleConfirmOrder = async (e) => {
    if (e) e.preventDefault();
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await saveFulfillmentDetails();
      const formData = new FormData();
      formData.append('payment_method', paymentMethod);
      formData.append('fulfillment_method', fulfillmentMethod);
      if (fulfillmentMethod === 'Delivery') {
        formData.append('delivery_address', deliveryAddress);
        formData.append('delivery_landmark', deliveryLandmark);
        formData.append('delivery_phone', deliveryPhone);
        if (deliveryLat) formData.append('delivery_latitude', deliveryLat);
        if (deliveryLng) formData.append('delivery_longitude', deliveryLng);
      }
      if (proofFile) {
        formData.append('payment_proof_image', proofFile);
      }

      let url = `${apiUrl}/orders/${order.id}/confirm`;
      if (paymentMethod === 'Manual UPI Payment') {
        url = `${apiUrl}/orders/${order.id}/submit-upi-payment`;
        formData.append('payment_utr', paymentUtr);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(response.ok ? 'Failed to parse server response.' : `Server Error: ${text.substring(0, 100)}`);
      }
      
      if (!response.ok) throw new Error(data.error || 'Failed to confirm order.');
 
      onVerifySuccess();
    } catch (err) {
      setError(err.message || 'Error confirming order.');
      setLoading(false);
    }
  };
 
   // Initiate PhonePe security deposit payment
   const handlePaySecurityDeposit = async () => {
     setLoading(true);
     setError('');
     try {
       const response = await fetch(`${apiUrl}/payment/phonepe/create-order`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({
           amount: 5000, // ₹50 in paise
           order_id: order.id,
           is_security_deposit: true,
           redirect_url: window.location.origin + '/?order_id=' + order.id + '&method=phonepe&pay_method=Pay%20During%20Pickup'
         })
       });
 
       const data = await response.json();
       if (!response.ok) throw new Error(data.error || 'Failed to initiate security deposit payment');
 
       if (data.redirectUrl) {
         window.location.href = data.redirectUrl;
       } else {
         throw new Error('Payment gateway URL not received');
       }
     } catch (err) {
       setError(err.message || 'Error creating security deposit order.');
       setLoading(false);
     }
   };

  // Initiate PhonePe full payment
  const handlePayOnlineFull = async () => {
    setLoading(true);
    setError('');
    try {
      await saveFulfillmentDetails();
      const response = await fetch(`${apiUrl}/payment/phonepe/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Math.round(parseFloat(order.amount) * 100), // convert rupees to paise
          order_id: order.id,
          is_security_deposit: false,
          redirect_url: window.location.origin + '/?order_id=' + order.id + '&method=phonepe&pay_method=PhonePe'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initiate PhonePe payment');

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Payment gateway URL not received');
      }
    } catch (err) {
      setError(err.message || 'Error creating PhonePe order.');
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

  const handleDownloadQR = async () => {
    if (order.qr_code_image) {
      try {
        const imageUrl = getFullImageUrl(order.qr_code_image);
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Extract extension from the URL if possible, default to .png
        const ext = imageUrl.split('.').pop() || 'png';
        a.download = `QR_${order.id}.${ext.length <= 4 ? ext : 'png'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error("Failed to download image, opening in new tab instead.", err);
        const link = document.createElement("a");
        link.href = getFullImageUrl(order.qr_code_image);
        link.download = `QR_${order.id}.png`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    const svgElement = document.querySelector("#QRCodeSVG svg");
    if (!svgElement) {
      console.error("QR Code SVG not found");
      return;
    }
    
    let svgData = new XMLSerializer().serializeToString(svgElement);
    if (!svgData.includes('xmlns=')) {
      svgData = svgData.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      const qrSize = 512;
      const padding = 40;
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + (padding * 2);
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${order.id}.png`;
      downloadLink.href = pngFile;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    
    img.onerror = (e) => {
       console.error("Error loading SVG into Image", e);
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };



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
                          download={`original_chitti_${order.id}.${order.original_chitti.split('.').pop()}`}
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
                        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewImage(getFullImageUrl(order.original_chitti))}
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
                        download={`rewritten_bill_${order.id}.${order.modified_bill.split('.').pop()}`}
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
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewImage(getFullImageUrl(order.modified_bill))}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Pricing Invoice Summary card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-3">
                {(() => {
                  const onlineTotalEst = originalItems.reduce((sum, item) => sum + ((parseFloat(item.mrp) || 0) * (parseFloat(item.quantity) || 1)), 0);
                  const myKiranamTotal = parseFloat(order.amount) || 0;
                  const savings = onlineTotalEst > myKiranamTotal ? onlineTotalEst - myKiranamTotal : 0;
                  
                  return (
                    <>
                      {onlineTotalEst > 0 && (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl mb-3 shadow-sm max-w-sm">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-slate-500 font-semibold">Online Market Est. Total</span>
                            <span className="text-slate-400 font-black line-through">₹{onlineTotalEst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-800 font-bold">MyKiranam Final Bill</span>
                            <span className="text-kirana-600 font-black">₹{myKiranamTotal.toFixed(2)}</span>
                          </div>
                          {savings > 0 && (
                            <div className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-lg font-bold flex items-center">
                              <span>🎉 You saved ₹{savings.toFixed(2)} compared to online quick-commerce apps!</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Bill Amount</span>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">₹{order.amount}</h3>
                        
                        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2">
                          <div className="flex justify-between items-center text-xs text-slate-700 font-bold">
                            <span>Payment Mode: Manual UPI / QR Code</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Please pay manually via your preferred UPI app. QR code provided at final checkout.</p>
                        </div>

                        {order.notes && (
                          <p className="text-xs text-slate-655 mt-2 bg-white px-3 py-2 rounded-xl border border-slate-100 italic">
                            <strong>Shop note:</strong> "{order.notes}"
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Hybrid Review Action Layout */}
              <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
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
          <div className="max-w-md mx-auto space-y-6 animate-fadeIn text-left">
            <h3 className="text-lg font-extrabold text-slate-900">{isDigital ? 'Fulfillment & Payment Options' : 'Select Fulfillment Option'}</h3>
            
            {/* Fulfillment Option Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Select Fulfillment Method
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {order.delivery_option !== 'Delivery Only' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentMethod('Pickup');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      fulfillmentMethod === 'Pickup'
                        ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🏪 Store Pickup</span>
                  </button>
                )}
                {['Delivery Only', 'Pickup + Delivery'].includes(order.delivery_option) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentMethod('Delivery');
                      if (paymentMethod === 'Pay During Pickup') {
                        setPaymentMethod('PhonePe');
                      }
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      fulfillmentMethod === 'Delivery'
                        ? 'bg-white text-slate-950 shadow-md border border-slate-100/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>🛵 Home Delivery</span>
                  </button>
                )}
              </div>

              {/* Show delivery estimates if delivery option is selected */}
              {fulfillmentMethod === 'Delivery' && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-[10px] text-emerald-800 font-bold flex justify-between items-center animate-fadeIn">
                  <span>Est. Delivery Charges: ₹{parseFloat(order.delivery_charges || 0).toFixed(2)}</span>
                  <span>Est. Delivery Time: {order.delivery_time || '30 mins'}</span>
                </div>
              )}
            </div>

            {/* Delivery Details Form */}
            {fulfillmentMethod === 'Delivery' && (
              <div className="p-4 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-3.5 animate-fadeIn">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>🛵 Delivery Information</span>
                </h3>

                <div className="space-y-3">
                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">Delivery Address <span className="text-crimson">*</span></label>
                    <textarea
                      required={fulfillmentMethod === 'Delivery'}
                      placeholder="Enter your full street address, flat/house number..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Landmark */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">Landmark <span className="text-crimson">*</span></label>
                    <input
                      type="text"
                      required={fulfillmentMethod === 'Delivery'}
                      placeholder="e.g. Opposite Metro Station, Near Park"
                      value={deliveryLandmark}
                      onChange={(e) => setDeliveryLandmark(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">Mobile Number <span className="text-crimson">*</span></label>
                    <input
                      type="text"
                      required={fulfillmentMethod === 'Delivery'}
                      placeholder="Enter 10-digit mobile number"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Share Geolocation */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-600">Accurate Location Coordinates</label>
                      <button
                        type="button"
                        disabled={fetchingLocation}
                        onClick={() => {
                          if (!navigator.geolocation) {
                            alert("Geolocation not supported by browser.");
                            return;
                          }
                          setFetchingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setDeliveryLat(pos.coords.latitude.toFixed(6));
                              setDeliveryLng(pos.coords.longitude.toFixed(6));
                              setLocationSuccess("📍 Accurate location coordinates captured successfully!");
                              setFetchingLocation(false);
                            },
                            (err) => {
                              console.error(err);
                              alert("Failed to fetch location. Please ensure location permissions are enabled.");
                              setFetchingLocation(false);
                            },
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                        className="text-[10px] font-bold text-kirana-600 bg-kirana-50 hover:bg-kirana-100 px-3 py-1.5 rounded-lg border border-kirana-200 flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <span>📍</span> {fetchingLocation ? 'Fetching...' : 'Share Current Location'}
                      </button>
                    </div>

                    {locationSuccess && (
                      <div className="p-2 bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold rounded-xl text-[9px]">
                        {locationSuccess}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


                {/* Payment Mode Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Manual UPI Payment')}
                      className={`flex-1 min-w-[100px] py-2 px-1 text-center text-[11px] font-bold rounded-xl transition-all ${
                        paymentMethod === 'Manual UPI Payment'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PhonePe')}
                      className={`flex-1 min-w-[100px] py-2 px-1 text-center text-[11px] font-bold rounded-xl transition-all ${
                        paymentMethod === 'PhonePe'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-slate-500 hover:text-purple-600'
                      }`}
                    >
                      PhonePe
                    </button>
                    {fulfillmentMethod === 'Pickup' && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Pay During Pickup')}
                        className={`flex-1 min-w-[100px] py-2 px-1 text-center text-[11px] font-bold rounded-xl transition-all ${
                          paymentMethod === 'Pay During Pickup'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Pay at Shop
                      </button>
                    )}
                  </div>
                </div>

                {/* Manual Seller UPI */}
                {paymentMethod === 'Manual UPI Payment' && (
                  <div className="space-y-4 bg-slate-50/50 p-5 border border-slate-150 rounded-3xl animate-fadeIn">
                    <div className="text-center space-y-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        ⚡ Direct UPI Transfer (0% Fee)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Pay directly to the shopkeeper's UPI address. No platform commissions or extra gateway fees.
                      </p>
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[9px] text-amber-800 font-bold text-center">
                        ⚠️ Avoid GPay (restricts screenshots). Use PhonePe, Paytm, or BHIM to upload proof.
                      </div>
                    </div>


                    {/* UPI ID Display */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-3.5 flex justify-between items-center shadow-sm">
                      <div className="min-w-0 pr-2">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Shopkeeper UPI ID</span>
                        <span className="font-extrabold text-xs text-slate-800 break-all select-all">{order.upi_id || 'mykiranam@upi'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(order.upi_id || 'mykiranam@upi');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex-shrink-0 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded-xl text-[10px] font-bold text-slate-700 transition-colors"
                      >
                        {copied ? '✓ Copied' : 'Copy ID'}
                      </button>
                    </div>

                    {/* QR Code Scan Fallback */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Manual QR Fallback</span>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-inner flex items-center justify-center">
                        {order.qr_code_image ? (
                          <img
                            src={getFullImageUrl(order.qr_code_image)}
                            alt="Store QR Code"
                            className="max-w-[200px] max-h-[200px] object-contain rounded"
                          />
                        ) : (
                          <div id="QRCodeSVG">
                            <QRCode
                              value={`upi://pay?pa=${order.upi_id || 'mykiranam@upi'}&pn=${encodeURIComponent(order.shop_name)}&am=${order.amount}&tn=${encodeURIComponent(order.custom_order_id || order.id)}&cu=INR`}
                              size={180}
                              level="M"
                            />
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleDownloadQR}
                        className="mt-3 text-[10px] font-bold text-slate-500 hover:text-slate-850 flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download QR Code</span>
                      </button>
                    </div>

                    {/* UTR Input Field */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Enter 12-digit UPI Ref / UTR Number <span className="text-crimson">*</span></label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        placeholder="e.g. 123456789012"
                        value={paymentUtr}
                        onChange={(e) => setPaymentUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none placeholder-slate-400 text-slate-800 font-bold"
                      />
                    </div>

                    {/* Payment screenshot upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Upload Transfer Screenshot Proof <span className="text-crimson">*</span></label>
                      <div className="relative border border-dashed border-slate-300 hover:border-kirana-500 rounded-2xl p-4 bg-white text-center cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setProofFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => setProofPreview(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-700 block">
                          {proofFile ? 'Replace Screenshot' : 'Click to Upload Screenshot'}
                        </span>
                        <span className="text-[8px] text-slate-400 mt-0.5">JPG, PNG up to 10MB</span>
                      </div>

                      {proofPreview && (
                        <div className="flex flex-col items-center justify-center p-2 border border-slate-150 rounded-xl bg-white max-w-[150px] mx-auto mt-2 relative">
                          <img
                            src={proofPreview}
                            alt="Screenshot Preview"
                            className="h-24 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => { setProofFile(null); setProofPreview(null); }}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full border border-red-250 leading-none text-[8px] font-bold shadow-sm"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleConfirmOrder}
                        disabled={loading || !proofFile || paymentUtr.length < 12}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white text-xs font-extrabold rounded-xl shadow transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <span>Confirm UPI Payment</span>
                      </button>
                      {(!proofFile || paymentUtr.length < 12) && (
                        <span className="block text-[8px] text-center text-crimson font-bold mt-1.5 animate-pulse">
                          * Please upload payment screenshot and enter valid 12-digit UTR to proceed
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Pay During Pickup Option */}
                {paymentMethod === 'Pay During Pickup' && (
                  <div className="space-y-4 bg-slate-50/50 p-5 border border-slate-150 rounded-3xl animate-fadeIn">
                    <div className="text-center space-y-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                        🏪 Pay at Pickup
                      </span>
                      <p className="text-xs text-slate-600 leading-normal font-semibold">
                        Pay the full bill amount at the store during pickup.
                      </p>
                    </div>

                    {/* Important notice / warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 shadow-sm text-left animate-fadeIn">
                      <div className="flex items-center space-x-2 text-amber-855 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Pickup Commitment & Policy Notice</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                        Please make sure to pick up your order on time.
                      </p>
                      {needsSecurityDeposit ? (
                        <p className="text-[11px] text-rose-805 leading-relaxed font-bold bg-white/70 p-2.5 rounded-xl border border-rose-200/50">
                          ⚠️ Security Deposit Required: Because your account is suspended (or you have 3 or more cancellations), you must pay a refundable ₹50 security deposit online via PhonePe to confirm this order. This deposit will be credited to the Kiranam platform account.
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-800 leading-relaxed font-bold bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                          ⚠️ Warning: Due to any circumstances if order is not picked, you will be losing profile score. Having 3 or more cancellations will require you to pay a ₹50 security deposit online for future 'Pay During Pickup' orders.
                        </p>
                      )}
                    </div>

                    {/* Summary card */}
                    {needsSecurityDeposit ? (
                      <div className="bg-white border border-slate-150 rounded-2xl p-3.5 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center text-xs text-slate-655">
                          <span>Total Bill Amount (Pay at shop):</span>
                          <span className="font-extrabold text-slate-800">₹{parseFloat(order.amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-rose-700 font-extrabold">
                          <span>Refundable Security Deposit to Pay Now:</span>
                          <span className="text-rose-900 font-black">₹50.00</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-150 rounded-2xl p-3.5 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>Total Bill Amount:</span>
                          <span className="font-extrabold text-slate-800">₹{parseFloat(order.amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-slate-800 font-extrabold">
                          <span>Amount to Pay at Shop:</span>
                          <span className="text-slate-900 font-black">₹{parseFloat(order.amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Confirm Order / Pay Security Deposit Button */}
                    <div className="pt-2">
                      {needsSecurityDeposit ? (
                        <button
                          type="button"
                          onClick={handlePaySecurityDeposit}
                          disabled={loading}
                          className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 animate-pulse"
                        >
                          <span>Pay ₹50 Security Deposit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmOrder}
                          disabled={loading}
                          className="w-full py-3.5 bg-slate-900 hover:bg-slate-955 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          <span>Confirm Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PhonePe Full Payment Option */}
                {paymentMethod === 'PhonePe' && (
                  <div className="space-y-4 bg-purple-50/50 p-5 border border-purple-200 rounded-3xl animate-fadeIn">
                    <div className="text-center space-y-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                        💳 Secure Online Payment
                      </span>
                      <p className="text-xs text-slate-600 leading-normal font-semibold">
                        Pay securely using PhonePe, GPay, Paytm or Cards.
                      </p>
                    </div>

                    <div className="bg-white border border-purple-200 rounded-2xl p-3.5 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Total Bill Amount:</span>
                        <span className="font-extrabold text-slate-800">₹{parseFloat(order.amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 text-purple-800 font-extrabold">
                        <span>Amount to Pay Online:</span>
                        <span className="text-purple-900 font-black">₹{parseFloat(order.amount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handlePayOnlineFull}
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <span>Pay ₹{parseFloat(order.amount || 0).toFixed(2)} via PhonePe</span>
                      </button>
                    </div>
                  </div>
                )}


            {/* General Action Buttons */}
            <div className="flex flex-col space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setViewState('review')}
                disabled={loading}
                className="w-full py-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Go Back to Review
              </button>
              <p className="text-[10px] text-center text-slate-450 mt-2">Zero fees. Secure payments powered by PhonePe.</p>
            </div>
          </div>
        )}

      </div>

      {previewImage && (
        <ImageModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}


    </div>
  );
};

export default OrderVerification;
