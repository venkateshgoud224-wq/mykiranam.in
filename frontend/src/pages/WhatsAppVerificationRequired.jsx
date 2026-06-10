import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Store, MessageSquare, ArrowRight, Lock, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

const WhatsAppVerificationRequired = ({ onSkip }) => {
  const { user, refreshProfile, logout, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!whatsappNumber || whatsappNumber.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/auth/profile/whatsapp/send-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ whatsappNumber })
      });

      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setSuccess('OTP sent successfully to your WhatsApp number!');
        if (playSoundAlert) playSoundAlert('success');
      } else {
        setError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error('Error sending WhatsApp OTP:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/auth/profile/whatsapp/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: otpCode })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('WhatsApp number verified and linked successfully!');
        if (playSoundAlert) playSoundAlert('success');
        
        // Wait briefly for success animation, then refresh user profile state
        setTimeout(async () => {
          await refreshProfile();
        }, 1500);
      } else {
        setError(data.error || 'Failed to verify OTP.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-gradient-to-br from-amber-50/60 via-stone-50 to-emerald-50/40 text-slate-800 flex flex-col justify-between selection:bg-amber-200 selection:text-slate-900 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-200/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-200/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            mykiranam<span className="text-amber-600 font-black">.in</span>
          </span>
        </div>
        <button
          onClick={logout}
          className="text-xs font-black text-slate-500 hover:text-rose-600 active:scale-[0.98] outline-none flex items-center space-x-1 border border-slate-200 bg-white/80 px-3 py-1.5 rounded-xl transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Form container */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto px-4 z-10 overflow-hidden py-4">
        
        {/* Info header */}
        <div className="text-center mb-4 space-y-1 flex-shrink-0">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <MessageSquare className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-900">WhatsApp Verification Required</h2>
          <p className="text-slate-500 text-xs font-semibold max-w-[320px] mx-auto leading-normal">
            To provide robust live transaction alerts, please link and verify your active WhatsApp number.
          </p>
        </div>

        {/* Blocking Glassmorphism Card */}
        <div className="w-full flex-shrink-0">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col justify-between w-full h-[360px] max-h-[360px] transition-all duration-300">
            <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-24 h-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />

            <div className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col justify-center min-h-0">
              {success && (
                <div className="p-3 mb-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold text-left flex items-start space-x-1.5 flex-shrink-0 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{success}</span>
                </div>
              )}

              {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold text-left flex items-start space-x-1.5 flex-shrink-0 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {!otpSent ? (
                /* STEP 1: INPUT PHONE NUMBER */
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">
                      WhatsApp Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 font-bold select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        disabled={loading}
                        placeholder="9876543210"
                        maxLength={10}
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-normal ml-1">
                      We will instantly dispatch a free 6-digit secure code to this WhatsApp account.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>{loading ? 'Sending Code...' : 'Send OTP via WhatsApp'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                  {onSkip && (
                    <button
                      type="button"
                      onClick={onSkip}
                      disabled={loading}
                      className="w-full py-2 text-center text-[11px] font-bold text-slate-400 hover:text-slate-700 active:scale-[0.98] transition-all"
                    >
                      Skip for now
                    </button>
                  )}
                </form>
              ) : (
                /* STEP 2: VERIFY OTP */
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-1.5 text-left animate-none">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">
                      Enter 6-Digit Secure Code
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        disabled={loading}
                        placeholder="XXXXXX"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-bold tracking-widest text-center outline-none text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] text-slate-400 font-bold">
                        Sent to +91 {whatsappNumber}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setOtpSent(false); 
                          setOtpCode(''); 
                          setError(''); 
                          setSuccess(''); 
                        }}
                        className="text-[11px] sm:text-xs font-black text-amber-600 hover:text-amber-700 outline-none px-3 py-2 cursor-pointer active:scale-95 touch-manipulation"
                      >
                        Change number
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify Secure Code'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSendOTP}
                    className="w-full text-center text-[10px] font-black text-slate-500 hover:text-slate-800 active:scale-[0.98] outline-none"
                  >
                    Didn't receive code? Resend OTP
                  </button>
                  {onSkip && (
                    <button
                      type="button"
                      onClick={onSkip}
                      disabled={loading}
                      className="w-full py-1 text-center text-[11px] font-bold text-slate-400 hover:text-slate-700 active:scale-[0.98] transition-all"
                    >
                      Skip for now
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white/50 backdrop-blur-md text-center text-[10px] font-black text-slate-400 z-20 flex-shrink-0 flex flex-col items-center justify-center">
        <div className="mb-2 space-x-3 flex flex-wrap justify-center gap-y-1">
          <a href="/terms.html" className="hover:text-amber-600 transition-colors">Terms</a>
          <a href="/privacy.html" className="hover:text-amber-600 transition-colors">Privacy</a>
          <a href="/refund.html" className="hover:text-amber-600 transition-colors">Refund Policy</a>
          <a href="/contact.html" className="hover:text-amber-600 transition-colors">Contact Us</a>
        </div>
        <div>© 2026 mykiranam.in Hyperlocal Marketplace. Operated by Nelapatla Venkatesh.</div>
      </footer>
    </div>
  );
};

export default WhatsAppVerificationRequired;
