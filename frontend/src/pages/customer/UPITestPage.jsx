import React, { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight, QrCode, ClipboardList, Info, AlertTriangle, CheckCircle, Smartphone, AlertCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateUpiId, validateAmount, validateNoteAndName, buildUpiDeepLink, getBrowserCompatibilityInfo } from '../../utils/upiValidator';

const UPITestPage = () => {
  const { apiUrl, token } = useAuth();
  
  // Inputs
  const [upiId, setUpiId] = useState('kiranastore@ybl');
  const [sellerName, setSellerName] = useState('Sri Lakshmi Kirana');
  const [amount, setAmount] = useState('1.00');
  const [orderId, setOrderId] = useState('MK12345');
  const [selectedApp, setSelectedApp] = useState('upi'); // 'upi', 'phonepe', 'gpay', 'paytm', 'bhim'

  // Validation States
  const [vpaError, setVpaError] = useState(null);
  const [amountError, setAmountError] = useState(null);
  const [noteWarning, setNoteWarning] = useState(null);
  const [noteError, setNoteError] = useState(null);

  // Browser/Compatibility info
  const [compatibility, setCompatibility] = useState({ browserName: '', isMobile: false, warning: null });

  // Dialog and Launch states
  const [upiLaunchFailed, setUpiLaunchFailed] = useState(false);
  const [logStatus, setLogStatus] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [generatedLinkUsed, setGeneratedLinkUsed] = useState('');

  useEffect(() => {
    setCompatibility(getBrowserCompatibilityInfo());
  }, []);

  // Validate on inputs change
  useEffect(() => {
    const vpaRes = validateUpiId(upiId);
    setVpaError(vpaRes.isValid ? null : vpaRes.error);

    const amtRes = validateAmount(amount);
    setAmountError(amtRes.isValid ? null : amtRes.error);

    const noteRes = validateNoteAndName(sellerName, orderId);
    if (!noteRes.isValid) {
      setNoteError(noteRes.error);
      setNoteWarning(null);
    } else {
      setNoteError(null);
      setNoteWarning(noteRes.warning || null);
    }
  }, [upiId, sellerName, amount, orderId]);

  const finalDeepLink = buildUpiDeepLink(upiId, sellerName, amount, orderId, selectedApp);

  const triggerLogEvent = async (errorMsg, app = selectedApp) => {
    setLogStatus('Logging diagnostics to server...');
    try {
      const res = await fetch(`${apiUrl}/payment/upi-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deepLink: finalDeepLink,
          upiId: upiId,
          amount: amount,
          transactionNote: orderId,
          browser: compatibility.browserName,
          deviceType: compatibility.isMobile ? 'Mobile' : 'Desktop',
          upiAppOpened: app.toUpperCase(),
          errorMsg: errorMsg,
          orderId: 99999 // developer test order id
        })
      });
      if (res.ok) {
        setLogStatus('Diagnostics logged successfully!');
      } else {
        setLogStatus('Failed to save diagnostics on server.');
      }
    } catch (err) {
      console.error("Failed to log UPI error:", err);
      setLogStatus('Error logging: ' + err.message);
    }
  };

  const handleLaunchUpi = (appProto = selectedApp) => {
    if (vpaError || amountError || noteError) {
      alert("Please fix validation errors before launching.");
      return;
    }

    setLogStatus(`Launching ${appProto.toUpperCase()} app...`);
    setUpiLaunchFailed(false);
    setGeneratedLinkUsed(buildUpiDeepLink(upiId, sellerName, amount, orderId, appProto));

    const startTime = Date.now();
    let appOpened = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
        setLogStatus(`App opened successfully (detected visibility change)!`);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Timeout to detect if user remained on page
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const duration = Date.now() - startTime;
      if (!appOpened && duration < 2500) {
        setUpiLaunchFailed(true);
        triggerLogEvent("UPI app launch timed out (Protocol handler not registered/blocked)", appProto);
      }
      // Show feedback modal asking user if payment actually succeeded inside their app
      setShowFeedbackModal(true);
    }, 2000);

    try {
      window.location.href = buildUpiDeepLink(upiId, sellerName, amount, orderId, appProto);
    } catch (err) {
      setUpiLaunchFailed(true);
      triggerLogEvent(err.message || "Redirect exception", appProto);
      setShowFeedbackModal(true);
    }
  };

  const handleFeedbackSubmit = (success, errorMsg = '') => {
    setShowFeedbackModal(false);
    const statusText = success ? "PAYMENT_SUCCESSFUL" : `PAYMENT_FAILED: ${errorMsg}`;
    triggerLogEvent(statusText);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-lg bg-slate-800/85 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 relative z-10">
          <a href="/customer" className="p-2.5 bg-slate-700/50 hover:bg-slate-750 border border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 block font-mono">Developer Suite</span>
            <h2 className="text-lg font-black text-white tracking-tight">UPI Deep Link Diagnostics</h2>
          </div>
        </div>

        {/* Browser Warning Alert */}
        {compatibility.warning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-2xl space-y-1.5 text-xs animate-fadeIn relative z-10">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
              <span>Compatibility Note</span>
            </div>
            <p className="leading-relaxed opacity-90">{compatibility.warning}</p>
          </div>
        )}

        {/* Inputs section */}
        <div className="space-y-4 relative z-10 bg-slate-850/40 p-4 border border-slate-700/30 rounded-2xl">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">Construct Intent URL</span>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seller UPI ID (pa)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-slate-900 border ${vpaError ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-700 focus:border-violet-500'} rounded-xl text-xs focus:outline-none font-bold text-white transition-all`}
              placeholder="e.g. kiranastore@ybl"
            />
            {vpaError && (
              <span className="text-[10px] text-rose-400 font-bold block flex items-center space-x-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>{vpaError}</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seller Shop Name (pn)</label>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-xl text-xs focus:outline-none font-bold text-white transition-all"
              placeholder="e.g. Sri Lakshmi Kirana"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount (₹) (am)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-900 border ${amountError ? 'border-rose-500/50 focus:border-rose-500' : 'border-slate-700 focus:border-violet-500'} rounded-xl text-xs focus:outline-none font-bold text-white transition-all`}
                placeholder="e.g. 500.00"
              />
              {amountError && (
                <span className="text-[10px] text-rose-400 font-bold block flex items-center space-x-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>{amountError}</span>
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID (tn)</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-xl text-xs focus:outline-none font-bold text-white transition-all"
                placeholder="e.g. MK12345"
              />
              {noteWarning && (
                <span className="text-[9px] text-amber-400 font-bold block mt-1">
                  ⚠️ {noteWarning}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* UPI Application Intent Selector */}
        <div className="space-y-2 relative z-10">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Select Application Launch Protocol</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'upi', label: 'Generic', color: 'from-slate-700 to-slate-800' },
              { id: 'phonepe', label: 'PhonePe', color: 'from-purple-700 to-purple-800' },
              { id: 'gpay', label: 'Google Pay', color: 'from-blue-700 to-indigo-800' },
              { id: 'paytm', label: 'Paytm', color: 'from-cyan-700 to-blue-800' },
              { id: 'bhim', label: 'BHIM', color: 'from-amber-700 to-orange-850' },
            ].map(app => (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedApp(app.id)}
                className={`py-2 px-1 text-center text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedApp === app.id
                    ? 'border-violet-500 bg-gradient-to-br ' + app.color + ' text-white shadow-md scale-[1.03]'
                    : 'border-slate-700 bg-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{app.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live URL Output */}
        <div className="bg-slate-900/60 p-4 border border-slate-750 rounded-2xl space-y-1.5 relative z-10">
          <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">Generated Deep Link</span>
          <textarea
            readOnly
            value={finalDeepLink}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-violet-300 select-all focus:outline-none"
          />
        </div>

        {/* Launcher Actions */}
        <div className="space-y-3 relative z-10">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleLaunchUpi()}
              disabled={!!(vpaError || amountError || noteError)}
              className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-[0.99] disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch {selectedApp.toUpperCase()} Deep Link</span>
            </button>
          </div>

          {logStatus && (
            <div className="text-center text-[10px] font-bold text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 p-2.5 rounded-xl">
              ℹ️ Status: {logStatus}
            </div>
          )}

          {upiLaunchFailed && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-2xl text-[10px] font-semibold space-y-1.5 animate-fadeIn">
              <span className="block font-black text-rose-250 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>App Launch Timeout Triggered</span>
              </span>
              <p className="opacity-90">
                The deep link did not respond within 2 seconds. The issue has been registered. You can report the exact app-side error using the diagnostic modal below.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* FEEDBACK DIAGNOSTIC MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            
            <div className="text-center space-y-2">
              <span className="text-3xl block">🔍</span>
              <h3 className="text-base font-extrabold text-white">How did the UPI launch perform?</h3>
              <p className="text-xs text-slate-400">
                Please submit the behavior you observed to pinpoint the root cause.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleFeedbackSubmit(true)}
                className="w-full p-3.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Success: Payment completed successfully</span>
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="border-t border-slate-800 my-4" />
              
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono mb-2">Select App-Side Error Message:</span>
              
              {[
                { title: "Transaction restricted", desc: "Blocked P2P deep link with am/tn parameters" },
                { title: "Payment cannot be processed", desc: "Bank or app security restriction" },
                { title: "Your money has not been debited", desc: "Immediate app reject" },
                { title: "App failed to open", desc: "No installed app or bad link protocol" },
              ].map(err => (
                <button
                  key={err.title}
                  type="button"
                  onClick={() => handleFeedbackSubmit(false, err.title)}
                  className="w-full p-3.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-300 text-xs font-bold rounded-xl text-left transition-all"
                >
                  <span className="block font-black text-rose-200">{err.title}</span>
                  <span className="block text-[9px] text-slate-400 font-normal mt-0.5">{err.desc}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const reason = prompt("Enter the exact error message text:");
                  if (reason !== null) {
                    handleFeedbackSubmit(false, reason || 'Custom failure');
                  }
                }}
                className="w-full p-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 text-center transition-all"
              >
                Specify Other / Custom Error...
              </button>
            </div>

            {/* Root cause analysis explainer card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed space-y-1">
              <span className="block font-black text-violet-400 font-mono uppercase">Root Cause Analysis Note:</span>
              <p>
                <strong>NPCI Guidelines:</strong> UPI Deep Links (`upi://pay`) pointing to personal VPAs (e.g. `@ybl`, `@okaxis`, `@paytm`) are restricted from carrying Amount (`am`) or Note (`tn`) parameters in external app frames. This security policy triggers the bank's rejection mechanisms, returning "restricted" messages inside UPI apps.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="text-xs text-slate-500 hover:text-slate-400 font-bold px-3 py-1.5"
              >
                Skip / Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default UPITestPage;
