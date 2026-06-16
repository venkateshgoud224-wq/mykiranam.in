import React, { useState } from 'react';
import { ChevronLeft, ArrowRight, QrCode, ClipboardList, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UPITestPage = () => {
  const { apiUrl, token } = useAuth();
  const [upiId, setUpiId] = useState('kiranastore@ybl');
  const [sellerName, setSellerName] = useState('Sri Lakshmi Kirana');
  const [amount, setAmount] = useState('500');
  const [orderId, setOrderId] = useState('MK12345');
  
  const [upiLaunchFailed, setUpiLaunchFailed] = useState(false);
  const [logStatus, setLogStatus] = useState('');

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(sellerName)}&am=${amount}&tn=${encodeURIComponent(orderId)}&cu=INR`;

  const logUpiLaunchError = async (errorMsg) => {
    setLogStatus('Logging event to backend...');
    try {
      const userAgent = navigator.userAgent;
      let browser = "Unknown Browser";
      if (userAgent.indexOf("Chrome") > -1) browser = "Chrome";
      else if (userAgent.indexOf("Safari") > -1) browser = "Safari";
      else if (userAgent.indexOf("Firefox") > -1) browser = "Firefox";

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const deviceType = isMobile ? "Mobile" : "Desktop";

      const res = await fetch(`${apiUrl}/payment/upi-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deepLink: upiUrl,
          browser,
          deviceType,
          errorMsg,
          orderId: 99999 // test ID
        })
      });
      if (res.ok) {
        setLogStatus('Event logged successfully!');
      } else {
        setLogStatus('Failed to log event backend-side.');
      }
    } catch (err) {
      console.error("Failed to log UPI error:", err);
      setLogStatus('Error logging event: ' + err.message);
    }
  };

  const handleLaunchUpi = () => {
    setLogStatus('Launching UPI app...');
    setUpiLaunchFailed(false);
    const startTime = Date.now();
    let appOpened = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
        setLogStatus('App opened successfully (detected visibility change)!');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const duration = Date.now() - startTime;
      if (!appOpened && duration < 2500) {
        setUpiLaunchFailed(true);
        logUpiLaunchError("UPI app launch timed out (App not installed or protocol blocked)");
      }
    }, 2000);

    try {
      window.location.href = upiUrl;
    } catch (err) {
      setUpiLaunchFailed(true);
      logUpiLaunchError(err.message || "Redirect exception");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-150 rounded-3xl p-6 shadow-premium space-y-6">
        
        <div className="flex items-center space-x-2">
          <a href="/customer" className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Developer Tools</span>
            <h2 className="text-base font-extrabold text-slate-900">UPI Deep Link Tester</h2>
          </div>
        </div>

        <div className="p-4 bg-violet-50 border border-violet-100 text-violet-850 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 font-bold">
            <Info className="w-4 h-4 text-violet-600" />
            <span>Direct Deep Linking</span>
          </div>
          <p className="leading-relaxed">
            Use this page to construct customized deep links and test launcher behaviors on physical mobile browsers.
          </p>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Seller UPI ID (pa)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Seller Shop Name (pn)</label>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none font-bold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Amount (₹) (am)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none font-bold text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Order ID (tn)</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Constructed URL */}
        <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl space-y-1.5">
          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Generated Deep Link</span>
          <textarea
            readOnly
            value={upiUrl}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[10px] font-mono text-slate-700 select-all focus:outline-none"
          />
        </div>

        {/* Launch actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleLaunchUpi}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Test Pay Now Link</span>
          </button>

          {logStatus && (
            <div className="text-center text-[10px] font-bold text-slate-500 italic bg-slate-100 p-2 rounded-xl border">
              ℹ️ Status: {logStatus}
            </div>
          )}

          {upiLaunchFailed && (
            <div className="p-3 bg-red-50 border border-red-150 text-red-800 rounded-2xl text-[10px] font-semibold space-y-1 animate-fadeIn flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="block font-black text-red-900">App Launch Failed / Timeout Detected</span>
                <span>The launch timeout fired after 2 seconds. The error event has been logged to the server logs.</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UPITestPage;
