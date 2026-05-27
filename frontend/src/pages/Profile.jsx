import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, Mail, Phone, ShoppingBag, ShieldAlert, Award, Star, History, Clock, Bell, Volume2, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

const Profile = () => {
  const { user, extraData, refreshProfile } = useAuth();
  const { playSoundAlert } = useSocket();

  // Notification Preferences state
  const [preferences, setPreferences] = useState({
    pref_browser_notif: true,
    pref_sounds: true,
    pref_whatsapp: true,
    pref_email: true
  });
  
  // WhatsApp Linker state
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappSuccess, setWhatsappSuccess] = useState('');

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setPreferences({
        pref_browser_notif: user.pref_browser_notif !== false,
        pref_sounds: user.pref_sounds !== false,
        pref_whatsapp: user.pref_whatsapp !== false,
        pref_email: user.pref_email !== false
      });
      setWhatsappNumber(user.whatsapp_number || '');
    }
  }, [user]);



  const handleToggleChange = async (key) => {
    const updatedPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(updatedPrefs);
    
    try {
      const token = localStorage.getItem('token');
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
      await fetch(`${SOCKET_URL}/api/auth/profile/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPrefs)
      });
      playSoundAlert('success');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const handleSendOTP = async () => {
    if (!whatsappNumber) {
      setWhatsappError('Please enter a valid mobile number.');
      return;
    }
    setWhatsappLoading(true);
    setWhatsappError('');
    setWhatsappSuccess('');
    try {
      const token = localStorage.getItem('token');
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
      const response = await fetch(`${SOCKET_URL}/api/auth/profile/whatsapp/send-otp`, {
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
        setWhatsappSuccess('OTP sent successfully to your WhatsApp number!');
      } else {
        setWhatsappError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error('Error sending WhatsApp OTP:', err);
      setWhatsappError('Server connection error.');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setWhatsappError('Please enter the 6-digit OTP code.');
      return;
    }
    setWhatsappLoading(true);
    setWhatsappError('');
    setWhatsappSuccess('');
    try {
      const token = localStorage.getItem('token');
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
      const response = await fetch(`${SOCKET_URL}/api/auth/profile/whatsapp/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: otpCode })
      });
      
      const data = await response.json();
      if (response.ok) {
        setOtpSent(false);
        setOtpCode('');
        setWhatsappSuccess('WhatsApp number verified and linked successfully!');
        playSoundAlert('success');
        refreshProfile(); // reload database values
      } else {
        setWhatsappError(data.error || 'Failed to verify OTP.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setWhatsappError('Server connection error.');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const getRoleIcon = () => {
    if (user?.role === 'seller') return '🏪';
    return '🛍️';
  };

  const getProfileImage = () => {
    if (user?.profile_image) return user.profile_image;
    const colors = ['bg-amber-500', 'bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];
    const index = (user?.name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-full space-y-6 pb-24 px-2">
      {/* Grid container: two columns on desktop, one column on mobile */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-6 space-y-6 md:space-y-0">
        
        {/* COLUMN 1: Primary Profile & Financial Analytics Dashboard */}
        <div className="space-y-6">
          {/* Profile Header Block */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            
            {/* Avatar */}
            <div className="flex justify-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-md ${getProfileImage()}`}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* User Details */}
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center justify-center space-x-1.5 animate-fade-in">
                <span>{user?.name}</span>
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold uppercase tracking-wider">
                  {getRoleIcon()} {user?.role}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center space-x-1">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </p>
              {user?.phone && (
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center space-x-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{user?.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* --- CUSTOMER SPEND ANALYTICS SECTION --- */}
          {user?.role === 'customer' && extraData.spendStats && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Spend History Analytics</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">This Month</span>
                  <span className="block text-xs font-black text-slate-800 mt-1.5">
                    ₹{(extraData.spendStats.month || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-kirana-50 border border-kirana-200/50 rounded-2xl">
                  <span className="block text-[9px] text-slate-455 font-bold uppercase leading-none">Last 3 Mos</span>
                  <span className="block text-xs font-black text-slate-800 mt-1.5">
                    ₹{(extraData.spendStats.last3Months || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-950 rounded-2xl text-white">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">Lifetime</span>
                  <span className="block text-xs font-black text-kirana-300 mt-1.5">
                    ₹{(extraData.spendStats.lifetime || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --- SELLER REVENUE & SALES ANALYTICS SECTION --- */}
          {user?.role === 'seller' && extraData.sellerStats && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4 animate-fadeIn">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                <span>Revenue & Sales Analytics</span>
              </h3>

              {/* Total completed orders badge */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <span className="font-extrabold text-slate-800 block">Completions</span>
                    <span className="text-[10px] text-slate-400">Total orders finished</span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-white px-3 py-1 rounded-xl border border-emerald-100">
                  {extraData.sellerStats.completedOrdersCount} orders
                </span>
              </div>

              {/* Grid of revenue time ranges */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">Today (1 Day)</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.today || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">1 Week (7 Days)</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.week1 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">Last 2 Weeks</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.weeks2 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">1 Month</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.month1 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">6 Months</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.months6 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase leading-none">1 Year</span>
                  <span className="text-xs font-black text-slate-800 mt-1.5 block">
                    ₹{(extraData.sellerStats.year1 || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border border-kirana-500/25 bg-kirana-50/5 rounded-2xl col-span-2 flex justify-between items-center px-4 py-3">
                  <div className="text-left">
                    <span className="block text-[9px] text-slate-450 uppercase font-bold leading-none">Lifetime Sales</span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Overall shop turnover</span>
                  </div>
                  <span className="text-xs font-black text-kirana-800 bg-white px-3 py-1 rounded-xl border border-kirana-250">
                    ₹{(extraData.sellerStats.lifetime || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* COLUMN 2: Settings, Preferences & Operational Metrics Dashboard */}
        <div className="space-y-6">
          {/* --- WHATSAPP LINKING PANEL --- */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>WhatsApp Linking</span>
            </h3>

            {user?.verified_whatsapp ? (
              <div className="flex items-center space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">Verified & Linked</span>
                  <span className="text-[11px] text-slate-500 block">Number: +{user.whatsapp_number}</span>
                </div>
                <button
                  onClick={() => {
                    setOtpSent(false);
                    setWhatsappNumber('');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-amber-500 border border-slate-200 bg-white px-2.5 py-1 rounded-xl transition-all"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-505 leading-normal">
                  Link your WhatsApp number to receive fallback templates when your browser tab is closed!
                </p>
                
                {whatsappError && (
                  <div className="flex items-center space-x-1.5 text-red-550 text-[10px] font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{whatsappError}</span>
                  </div>
                )}

                {whatsappSuccess && (
                  <div className="flex items-start space-x-1.5 text-emerald-600 text-[10px] font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />
                    <span>{whatsappSuccess}</span>
                  </div>
                )}

                {!otpSent ? (
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">+91</span>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter WhatsApp Number"
                        maxLength={10}
                        className="w-full pl-11 pr-3 py-2 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-semibold rounded-xl outline-none transition-all placeholder:text-slate-300 text-slate-700"
                      />
                    </div>
                    <button
                      onClick={handleSendOTP}
                      disabled={whatsappLoading}
                      className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center space-x-1"
                    >
                      {whatsappLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-Digit OTP"
                        maxLength={6}
                        className="flex-1 px-3 py-2 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-semibold rounded-xl outline-none tracking-widest text-center transition-all placeholder:tracking-normal placeholder:text-slate-300"
                      />
                      <button
                        onClick={handleVerifyOTP}
                        disabled={whatsappLoading}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm"
                      >
                        {whatsappLoading ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                    <button
                      onClick={() => setOtpSent(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-655"
                    >
                      ← Change phone number
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- NOTIFICATION PREFERENCES PANEL --- */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Notification Channel Settings</span>
            </h3>

            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Browser Alerts</span>
                    <span className="text-[10px] text-slate-400 block">In-app notifications popups</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.pref_browser_notif}
                    onChange={() => handleToggleChange('pref_browser_notif')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Sound Alerts</span>
                    <span className="text-[10px] text-slate-400 block">Oscillator audible notification chimes</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.pref_sounds}
                    onChange={() => handleToggleChange('pref_sounds')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">WhatsApp Messages</span>
                    <span className="text-[10px] text-slate-400 block">Fallback templates when offline</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.pref_whatsapp}
                    onChange={() => handleToggleChange('pref_whatsapp')}
                    disabled={!user?.verified_whatsapp}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Email Updates</span>
                    <span className="text-[10px] text-slate-400 block">HTML receipts and verification codes</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.pref_email}
                    onChange={() => handleToggleChange('pref_email')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* --- CUSTOMER TRUST SECTION --- */}
          {user?.role === 'customer' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Customer Trust Metrics</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <span className="block text-[18px]">✅</span>
                  <span className="block text-xs font-black text-emerald-600 mt-1">
                    {extraData.trustMetrics?.successful_pickups || 0}
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase mt-0.5 font-bold">Pickups</span>
                </div>

                <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                  <span className="block text-[18px]">❌</span>
                  <span className="block text-xs font-black text-rose-600 mt-1">
                    {extraData.trustMetrics?.cancellations || 0}
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase mt-0.5 font-bold">Cancels</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="block text-[18px]">⚠️</span>
                  <span className="block text-xs font-black text-slate-700 mt-1">
                    {extraData.trustMetrics?.no_show_count || 0}
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase mt-0.5 font-bold">No-Show</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-550 leading-normal text-center italic">
                Keep cancellation and no-show counts low to receive high priority queues and early acceptance!
              </p>
            </div>
          )}

          {/* --- SELLER PERFORMANCE SECTION --- */}
          {user?.role === 'seller' && extraData.shop && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                <span>Store Performance Dashboard</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-xs text-slate-400 font-bold uppercase">Avg Response Time</span>
                  <span className="text-base font-black text-slate-800 mt-1 block flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-400 mr-1" />
                    {extraData.performanceMetrics?.response_time_avg || 0} min
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl">
                  <span className="block text-xs text-slate-400 font-bold uppercase">Active Queue Load</span>
                  <span className="text-base font-black text-slate-800 mt-1 block">
                    {extraData.shop?.active_orders || 0} orders
                  </span>
                </div>

                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl col-span-2 flex justify-around py-4">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Completion Rate</span>
                    <span className="text-sm font-black text-emerald-600">
                      {parseFloat(extraData.performanceMetrics?.order_completion_pct || 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="border-l border-slate-200"></div>
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Cancellation Rate</span>
                    <span className="text-sm font-black text-rose-500">
                      {parseFloat(extraData.performanceMetrics?.cancellation_pct || 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
