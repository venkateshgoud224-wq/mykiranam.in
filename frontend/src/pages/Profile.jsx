import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, Mail, Phone, ShoppingBag, ShieldAlert, Award, Star, History, Clock, Bell, Volume2, MessageSquare, CheckCircle2, AlertCircle, Info, FileText, ShieldCheck, ScrollText, Sparkles, TrendingUp, TrendingDown, Coins, Zap, Ban, Eye, RefreshCw, Heart, Users, Check, X, Percent, Store, Database, Package } from 'lucide-react';

const Profile = () => {
  const { user, extraData, refreshProfile, deleteAccount, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
  const [isChangingWhatsapp, setIsChangingWhatsapp] = useState(false);
  
  // Mandatory Alert State
  const [showMandatoryAlert, setShowMandatoryAlert] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Advantages Explorer Active Tab
  const [advantagesTab, setAdvantagesTab] = useState('comparison');

  // Seller reviews state
  const [sellerReviews, setSellerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'seller' && extraData.shop?.id) {
      const fetchSellerReviews = async () => {
        setReviewsLoading(true);
        try {
          const response = await fetch(`${apiUrl}/reviews/shop/${extraData.shop.id}`);
          if (response.ok) {
            const data = await response.json();
            setSellerReviews(data);
          }
        } catch (err) {
          console.error('Error fetching seller reviews:', err);
        } finally {
          setReviewsLoading(false);
        }
      };
      fetchSellerReviews();
    }
  }, [user, extraData.shop, apiUrl]);

  useEffect(() => {
    refreshProfile();
    // Check for mandatory alert flag
    if (sessionStorage.getItem('whatsapp_mandatory_alert')) {
      setShowMandatoryAlert(true);
      sessionStorage.removeItem('whatsapp_mandatory_alert');
      
      // Auto-scroll to WhatsApp section for emphasis
      setTimeout(() => {
        const waSection = document.getElementById('whatsapp-linker');
        if (waSection) {
          waSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
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
      setEditForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
      
      // Auto-set matching tab if user role loads
      if (user.role === 'seller' && advantagesTab === 'money') {
        setAdvantagesTab('store');
      } else if (user.role === 'customer' && advantagesTab === 'store') {
        setAdvantagesTab('money');
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editForm.name || !editForm.email) {
      setEditError('Name and email are required.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/auth/profile/details`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (response.ok) {
        setIsEditingProfile(false);
        playSoundAlert('success');
        refreshProfile();
      } else {
        setEditError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setEditError('Server connection error.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleChange = async (key) => {
    const updatedPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(updatedPrefs);
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiUrl}/auth/profile/settings`, {
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
        setOtpSent(false);
        setOtpCode('');
        setWhatsappSuccess('WhatsApp number verified and linked successfully!');
        setIsChangingWhatsapp(false);
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setDeleteError("Please type 'DELETE' to confirm deletion.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAccount();
      playSoundAlert('success');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
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
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4">
      
      {showMandatoryAlert && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl flex items-start space-x-3 shadow-sm animate-bounce-short">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
          <div>
            <h3 className="font-black text-sm text-red-800">Action Required: WhatsApp Verification is Mandatory</h3>
            <p className="text-xs font-semibold mt-1">
              You must verify your WhatsApp number below before you can place or accept any orders on mykiranam.in.
            </p>
          </div>
        </div>
      )}

      {/* Grid container: two columns on desktop, one column on mobile */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 space-y-6 lg:space-y-0">
        
        {/* COLUMN 1: Primary Profile & Financial Analytics Dashboard */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Header Block */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-md text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-16 h-16 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            <div className="h-28 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 w-full absolute top-0 left-0 transition-transform duration-500 group-hover:scale-105" />
            
            <div className="p-6 relative pt-12 mt-4 space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-xl border-4 border-white z-10 relative ${getProfileImage()}`}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              
              {/* User Details */}
              <div className="relative z-10">
                {!isEditingProfile ? (
                  <>
                    <h2 className="text-xl font-black text-slate-900 flex flex-col items-center justify-center space-y-2 animate-fade-in">
                      <span>{user?.name}</span>
                      <span className="text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold uppercase tracking-wider inline-flex items-center shadow-sm">
                        {getRoleIcon()} <span className="ml-1">{user?.role}</span>
                      </span>
                    </h2>
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <p className="text-xs text-slate-500 flex items-center justify-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{user?.email}</span>
                      </p>
                      {user?.phone && (
                        <p className="text-xs text-slate-500 flex items-center justify-center space-x-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{user?.phone}</span>
                        </p>
                      )}
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="mt-3 w-full py-1.5 text-[10px] font-bold text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition-all uppercase tracking-wider"
                      >
                        Edit Profile Details
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-inner space-y-3 text-left">
                    {editError && (
                      <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center space-x-1.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>{editError}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Login Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value.replace(/\D/g, '')})}
                        maxLength={10}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
                          setEditError('');
                        }}
                        className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={editLoading}
                        className="flex-1 py-1.5 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-lg transition-all"
                      >
                        {editLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- SHORT MARKETING MESSAGE CARD (CUSTOMER ONLY) --- */}
          {user?.role === 'customer' && (
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-l-4 border-amber-500 rounded-3xl p-5 shadow-sm text-left relative overflow-hidden">
              <span className="absolute -right-3 -bottom-3 text-7xl text-amber-500/10 font-serif select-none pointer-events-none">“</span>
              <ul className="text-xs text-amber-900 font-semibold italic space-y-1 relative z-10">
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>Buy only what you need</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>Zero hidden fees & surprise bills</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>No long billing queues or impulse traps</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>Verify product quality before payment</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>Pick up orders from trusted local stores</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1.5 select-none text-amber-500">•</span>
                  <span>Estimated average prices of online app stores compared in real-time</span>
                </li>
              </ul>
              <div className="mt-3 text-[9px] text-amber-700 font-bold uppercase tracking-wider flex items-center space-x-1">
                <span>✨</span>
                <span>The MyKiranam Promise</span>
              </div>
            </div>
          )}

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
        <div className="lg:col-span-8 space-y-6">
          {/* --- WHATSAPP LINKING PANEL --- */}
          <div id="whatsapp-linker" className={`bg-white border ${showMandatoryAlert ? 'border-red-300 shadow-red-500/20 shadow-lg ring-4 ring-red-50' : 'border-slate-100'} rounded-3xl p-5 shadow-md relative overflow-hidden transition-all duration-500`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <MessageSquare className="w-32 h-32" />
            </div>
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>WhatsApp Linking</span>
            </h3>

            {user?.verified_whatsapp && !isChangingWhatsapp ? (
              <div className="flex items-center space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">Verified & Linked</span>
                  <span className="text-[11px] text-slate-500 block">Number: +{user.whatsapp_number}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setOtpSent(false);
                    setWhatsappNumber('');
                    setWhatsappError('');
                    setWhatsappSuccess('');
                    setIsChangingWhatsapp(true);
                  }}
                  className="text-xs font-extrabold text-slate-600 hover:text-amber-600 active:bg-slate-50 border border-slate-200 bg-white px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 touch-manipulation flex-shrink-0"
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
                  <div className="space-y-2">
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
                    {user?.verified_whatsapp && isChangingWhatsapp && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsChangingWhatsapp(false);
                          setWhatsappNumber(user.whatsapp_number || '');
                          setWhatsappError('');
                          setWhatsappSuccess('');
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-2 cursor-pointer active:scale-95 touch-manipulation"
                      >
                        Cancel Change
                      </button>
                    )}
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
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setOtpSent(false);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 cursor-pointer active:scale-95 touch-manipulation w-full text-center"
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

          {/* --- SELLER CUSTOMER REVIEWS & RATINGS SECTION --- */}
          {user?.role === 'seller' && extraData.shop && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4 mt-6">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span>Customer Feedback & Reviews ({sellerReviews.length})</span>
              </h3>

              {reviewsLoading ? (
                <div className="py-8 text-center text-xs font-bold text-slate-450 animate-pulse">
                  Loading reviews...
                </div>
              ) : sellerReviews.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Star className="w-8 h-8 text-slate-200 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No customer reviews received yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {sellerReviews.map((review) => (
                    <div key={review.id} className="border border-slate-100 bg-slate-50/40 p-4 rounded-2xl space-y-2 text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-kirana-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-sm">
                            {review.customer_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 flex items-center">
                              {review.customer_name}
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 ml-1" />
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold block">
                              {new Date(review.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Overall rating badge */}
                        <div className="flex items-center space-x-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-black text-amber-700">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{review.overall_experience}.0</span>
                        </div>
                      </div>

                      {/* Text */}
                      {review.review_text && (
                        <p className="text-xs text-slate-655 font-medium italic leading-relaxed pl-1">
                          "{review.review_text}"
                        </p>
                      )}

                      {/* Sub-ratings grid */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-100/50 p-2 rounded-xl border border-slate-200/40 text-[9px] font-bold text-slate-500 text-center">
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase font-semibold">Product</span>
                          <span className="text-slate-800 flex items-center justify-center mt-0.5">
                            {review.product_quality} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" />
                          </span>
                        </div>
                        <div className="border-x border-slate-200/60">
                          <span className="block text-[8px] text-slate-400 uppercase font-semibold">Service</span>
                          <span className="text-slate-800 flex items-center justify-center mt-0.5">
                            {review.service_quality} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" />
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase font-semibold">Accuracy</span>
                          <span className="text-slate-800 flex items-center justify-center mt-0.5">
                            {review.order_accuracy} <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-400 text-amber-400" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- FULL PAGE WIDTH SECTIONS --- */}
      <div className="w-full space-y-6 mt-6">
        {/* --- MYKIRANAM ADVANTAGES & VALUE PROPOSITION (CUSTOMER ONLY) --- */}
        {user?.role === 'customer' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Why Choose MyKiranam?</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Your complete customer value proposition & smart shopping advantages</p>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none space-x-2 border-b border-slate-150">
                {[
                  { id: 'comparison', label: '⚖️ Price Comparison' },
                  { id: 'money', label: '💰 Money Saving' },
                  { id: 'time', label: '⚡ Time Saving' },
                  { id: 'impulse', label: '🎯 No Impulse' },
                  { id: 'quality', label: '🛡️ Quality' },
                  { id: 'returns', label: '🔄 Returns' },
                  { id: 'trust', label: '🤝 Trust & Local' },
                  { id: 'difference', label: '⚖️ The Difference' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdvantagesTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      advantagesTab === tab.id
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-655 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab contents */}
              <div className="mt-4 animate-fade-in">

                {advantagesTab === 'money' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">1. No Convenience Fees</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Pick up your ready order from the nearby shop. Pay only for the groceries you purchase.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Convenience/Handling/Surge Fees on Other Apps</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> MyKiranam: Zero Hidden Charges</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">2. No Hidden Charges</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Know the exact price of your items before you visit the store with our transparent quotation system.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Extra Packaging/Platform/Surge Fees</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Transparent Quote upfront</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Percent className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">3. Local Kirana Pricing</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Receive competitive pricing directly from nearby stores. Compare prices across neighborhood sellers.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Support neighborhood local merchants</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Best local prices & shop comparison</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">4. No Membership Charges</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            No premium plans or monthly subscription traps. Every feature is available for free.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Subscription required for features</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> 100% Free access for all users</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'time' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">5. No Long Shopping Trips</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Instead of traveling, finding parking, searching for items, and standing in queues, just pick up a ready-packed order.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Traditional trips: 30 mins to 2 hours</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> MyKiranam: 5 to 15 minutes quick pickup</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">6. No Waiting In Billing Queues</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Skip the weekend crowds and endless queues at supermarkets. Your items are pre-billed and packed.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Standing in billing queues for hours</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Order ready in advance, grab and go</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">7. No Searching Through Aisles</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            No need to wander around looking for items. Simply submit your grocery list once, and let the seller compile it for you.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Finding products in huge aisles</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Submit list, seller collects all items</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FileText className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">8. Digital Grocery Planning</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Create clean digital lists. Avoid paper list clutter, prevent forgetting items, and repeat orders with a single tap.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Zero lost paper slips or forgotten list items</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Easy template repeats & instant sharing</span>
                        </div>
                      </div>

                      {/* Card 5 (NEW POINT ADDED BY USER) */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2 lg:col-span-2 xl:col-span-1">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">9. No App Browsing & Comparison Fatigue</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Stop wasting hours browsing products, checking availability, and comparing prices across 3-4 different delivery apps. Submit your list once, and get instant quotes directly from nearby shops.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Switching between multiple apps to compare items & prices</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> One-time list submission, receive direct local quotations</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'impulse' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">10. Avoid Unplanned Purchases</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Supermarkets are designed to trigger impulse purchases like snacks, chocolates, and drinks near checkout. Stick strictly to your list on MyKiranam.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Entering for ₹2,000, leaving with ₹3,000 bill</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Spend exactly what you budgeted</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">11. No Quantity Regret</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Don't fall for "Buy 5kg and save 10%" deals when you only need 1kg. Buy only the exact quantity you require.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Forced bulk offers wasting money</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Custom precise quantities</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">12. No surprise Billing Shock</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Know the final amount in advance. In supermarkets, you only find out the total when items are scanned at checkout.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Surprise total of ₹3,200 (estimated ₹2,000)</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> View and accept quote before purchase</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'quality' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Eye className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">13. Inspect Before Paying</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Check the physical condition, brands, and expiry dates of products at the counter before handing over any payment.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Discovering bad items after delivery driver leaves</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Verify physical condition prior to payment</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">14. Verify Product Quality Personally</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Ensure freshness of items like vegetables, eggs, and dairy products. If you are not satisfied, reject the product instantly.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Spoiled/bruised goods delivered in opaque bags</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Direct tactile/visual inspection</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Sparkles className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">15. Verify Correct Brand</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Sellers might substitute brands on standard delivery apps without asking. At the kirana, reject unauthorized brand replacements immediately.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Unwanted brand swaps by delivery app packers</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Keep original requested brands only</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">16. Verify Expiry Date</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Check the manufacturing and expiry date of packaged foods yourself, avoiding near-expiry items that delivery packers clear out.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Near-expiry inventory dumped on online orders</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Pick fresh stocks with peace of mind</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'returns' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><RefreshCw className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">17. No Waiting For Refunds</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Issues are caught before purchase. Since you inspect goods at pickup before paying, no refund tickets need to be raised.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Waiting 3-5 days for online refund approvals</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Zero-refund process, zero wallet lockup</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">18. Minimal Refund Disputes</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Because physical verification happens at the counter, payment is completed after full satisfaction. Disputes are virtually eliminated.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Arguing with customer support bots</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Mutual agreement directly with shop owner</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><RefreshCw className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">19. Instant Replacement</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            If an item is damaged or incorrect, the shopkeeper can swap it immediately from their shelves while you are at the shop.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Scheduling replacement courier slots</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Instant swap at checkout counter</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">20. Faster Problem Resolution</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            No middleman customer service agents. Resolve quantity or item changes instantly by talking directly to the shop owner.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Exchanging tickets and waiting hours for replies</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Real-time human interaction</span>
                        </div>
                      </div>

                      {/* Card 5 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2 lg:col-span-2 xl:col-span-1">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">21. No Return Pickup Delays</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Since you haven't taken the product home yet, returning unsatisfactory items requires zero return pick-up arrangements.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Staying home waiting for a return pickup agent</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Leave unwanted items at the store instantly</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'trust' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Star className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">22. Seller Ratings</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Customers rate shops based on accuracy, pricing, and speed. Top-rated reliable stores receive higher visibility on the app.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Direct feedback Loop rewards good service</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">23. Customer Ratings & Trust Score</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Sellers also rate buyers. Keeping pickups prompt and avoiding false order cancellations increases your priority queue ranking.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> High-trust customers get faster quote response</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">24. Balanced Marketplace</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            A fair ecosystem where both buyer and seller are accountable for their actions, creating mutual trust and community bonding.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Prevents fraud or abuse from either side</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Heart className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">25. Support Local Kirana Stores</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Your money stays within the local community, supporting neighborhood economy and local shopkeepers instead of corporate giants.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Keep 100% money in the local economy</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2 lg:col-span-2 xl:col-span-1">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><User className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">26. Trusted Nearby Sellers</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Buy groceries from shops you already know, run by friendly neighbors whom you trust and interact with daily.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Personalized service from familiar faces</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'difference' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl">
                      <h4 className="text-xs font-bold text-amber-900 mb-3 flex items-center"><Sparkles className="w-4 h-4 mr-1 text-amber-600" /> The MyKiranam Difference</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Red side */}
                        <div className="bg-white p-4 rounded-xl border border-red-100 space-y-2.5">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block bg-red-50 px-2 py-0.5 rounded-lg w-max">Instead Of:</span>
                          <ul className="space-y-2 text-[11px] text-slate-655 font-medium">
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Long, tiring supermarket visits</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> High convenience charges & surge pricing</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Platform fees & packing charges</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Slow, frustrating online refund delays</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Unplanned impulse spending at checkout</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Surprise billing shocks</li>
                            <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Wasting time comparing 3-4 delivery apps</li>
                          </ul>
                        </div>

                        {/* Green side */}
                        <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2.5 shadow-sm shadow-emerald-50">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block bg-emerald-50 px-2 py-0.5 rounded-lg w-max">MyKiranam Provides:</span>
                          <ul className="space-y-2 text-[11px] text-slate-800 font-bold">
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Planned, budget-controlled shopping</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Transparent quotations before purchase</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Ready-for-pickup orders prepared for you</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Direct product verification before payment</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Zero convenience or hidden fees</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Smart spending & better budget control</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Rapid pickup saving your valuable time</li>
                            <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Supporting local neighborhood shops</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'comparison' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">1. Instant Local Estimates</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Our AI Price Engine searches recent order histories to estimate basket costs across neighborhood stores instantly.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Estimated quotes without bothering sellers</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">2. Find the Cheapest Shop</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Identify which nearby merchant offers the absolute lowest total estimate for your specific list of items.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Compare full basket prices side-by-side</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">3. Save Time & Avoid App Fatigue</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Stop wasting hours browsing products and checking availability across 3-4 different quick-commerce apps. Submit your list once.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Manual app switching comparison</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> One-click comprehensive analysis</span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">4. Support Local Merchants</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Empower friendly neighborhood shopkeepers digitally while keeping your hard-earned money in the local economy.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Healthy, community-centric commerce</span>
                        </div>
                      </div>

                      {/* Card 5 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><ShoppingBag className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">5. Online App Benchmarks</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Compare estimated local store quotes against quick-commerce apps (including handling charges) to visualize your savings.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Clear visibility into real-time savings</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- MYKIRANAM ADVANTAGES & VALUE PROPOSITION (SELLER ONLY) --- */}
          {user?.role === 'seller' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Why Should Kirana Stores Join MyKiranam?</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Turn your kirana shop into an online store and scale your neighborhood business</p>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none space-x-2 border-b border-slate-150">
                {[
                  { id: 'store', label: '🏪 Store & Sales' },
                  { id: 'flexibility', label: '⚡ Flexibility' },
                  { id: 'database', label: '🗄️ Price Database' },
                  { id: 'growth', label: '📈 Digital Growth' },
                  { id: 'operations', label: '📦 Operations' },
                  { id: 'benefits', label: '🏆 Key Benefits' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdvantagesTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      advantagesTab === tab.id
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-655 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab contents */}
              <div className="mt-4 animate-fade-in">
                {advantagesTab === 'store' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Store className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">1. Turn Shop Into Online Store</h4>
                          </div>
                          <p className="text-[11px] text-slate-505 leading-relaxed">
                            Your shop is no longer limited to walk-in customers. Customers in your area discover you online, request quotes, and place grocery orders directly from their phones.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Limited to walk-in physical customers</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Hyperlocal online store discovery</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">2. Reach More Nearby Customers</h4>
                          </div>
                          <p className="text-[11px] text-slate-505 leading-relaxed">
                            Tap into a wider audience of nearby families and tech-savvy households who prefer sending lists and planning pickups online.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Relying on foot traffic near your store</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Expand digital footprint across neighborhood</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">3. Increase Sales Without Branches</h4>
                          </div>
                          <p className="text-[11px] text-slate-505 leading-relaxed">
                            Grow your business digitally and receive orders online even when customers are not visiting your physical shop. No expansion overheads.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Costly expansion to open new branches</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Zero-cost digital branch expansion</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'flexibility' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">4. Convert Slow Hours Into Revenue</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Many stores experience periods with few walk-ins. Instead of waiting, stay online, accept orders, prepare quotes, and generate additional revenue.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Empty store hours translate to zero sales</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Turn idle hours into active digital revenue</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">5. Go Online/Offline Whenever You Want</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            You control your availability. Go online or offline anytime. Accept orders only when it's convenient for you. No rigid fixed schedules.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Tied to fixed, exhausting physical opening timings</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Dynamic online availability toggle</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'database' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FileText className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">6. No Daily Price Writing On Chittis</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Sellers enter prices manually at first. Over time, products and prices are stored in your system. Update prices once and reuse them for future quotes.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Rewriting prices on paper chittis repeatedly</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Smart digital chitti quotation creator</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Database className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">7. Build Your Own Price Database</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Every quotation helps build your store database. In a few weeks, frequently sold products and previous prices are instantly available, reducing repetitive tasks.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Remembering rates or searching registers</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Automatic catalog & price memory database</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">8. Faster Order Processing</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Use historical product data instead of manually calculating every order. Speed up your billing, quotation creation, and checkout.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Manual calculations taking 5-10 mins per customer</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Lightning fast quotes and billing processing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'growth' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">9. Compete With Large Platforms</h4>
                          </div>
                          <p className="text-[11px] text-slate-555 leading-relaxed">
                            Compete digitally with quick-commerce apps by offering online visibility, digital ordering, customer ratings, and quotations, without losing personal relationships.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Losing business to big online quick-commerce platforms</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Equal digital footing with local edge</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">10. Build A Digital Customer Base</h4>
                          </div>
                          <p className="text-[11px] text-slate-555 leading-relaxed">
                            Let customers find you online, reorder easily, save your shop as a favorite, and rate your service. Over time, this creates a loyal digital customer list.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> No records or way to engage regular shoppers</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Build a traceable, loyal digital database</span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Sparkles className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">11. Understand Local Market Trends</h4>
                          </div>
                          <p className="text-[11px] text-slate-555 leading-relaxed">
                            MyKiranam helps you understand frequently requested items, popular products, customer demand, and seasonal demand changes to stock items effectively.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Blocked capital in slow-moving dead inventory</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Optimal inventory stocking via demand insights</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'operations' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Truck className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">12. Pure Pickup Model</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Unlike typical platforms, customer picks up order directly. No extra management, no extra expenses, and no disputes. Focus strictly on order preparation.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> High commissions (15-30%) and logistics hassles</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Zero-commission pickup ecosystem</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                            <h4 className="text-xs font-bold text-slate-800">13. Save Time and Energy</h4>
                          </div>
                          <p className="text-[11px] text-slate-550 leading-relaxed">
                            Avoid repeatedly writing prices, creating quotations manually, and searching for product rates. MyKiranam helps reuse previous data and simplify daily operations.
                          </p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                          <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Tiring and repetitive manual coordination</span>
                          <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Streamlined digital workflows saving hours daily</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {advantagesTab === 'benefits' && (
                  <div className="space-y-6">
                    {/* Grid of Main Benefits Checklist */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center">
                        <Award className="w-4 h-4 mr-1 text-amber-500" /> Main Benefits For Sellers
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          'Receive Online Orders',
                          'Increase Daily Sales',
                          'Turn Your Shop Into An Online Store',
                          'Build A Product Price Database',
                          'Save Time Creating Quotations',
                          'Go Online Whenever You Want',
                          'Convert Slow Hours Into Revenue',
                          'Understand Customer Demand',
                          'Compete Digitally',
                          'Grow Without Opening New Branches'
                        ].map((benefit, idx) => (
                          <div key={idx} className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                            <span className="text-emerald-600 font-extrabold">✅</span>
                            <span className="text-xs font-bold text-slate-700">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* One Line Summary Banner */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-2xl shadow-md text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Store className="w-24 h-24" />
                      </div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-amber-100 mb-1">One Line Summary</span>
                      <p className="text-sm font-black md:text-base leading-snug">
                        "When there are no customers in your shop, your shop can still receive customers online."
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- PLATFORM INFO & POLICIES --- */}
          {/* Temporarily hidden for PhonePe gateway purpose */}
          {false && (user?.role === 'customer' || user?.role === 'seller') && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-amber-500" />
                <span>Platform Information & Policies</span>
              </h3>
              
              <div className="space-y-3">
                {/* About Accordion */}
                <details className="group border border-slate-100 bg-slate-50 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span>About MyKiranam.in</span>
                    </div>
                    <span className="text-slate-400 group-open:-rotate-180 transition-transform duration-300">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white space-y-3">
                    <p className="mt-3">
                      <strong>MyKiranam.in</strong> is a hyperlocal, queue-managed marketplace designed to digitize and empower neighborhood Kirana stores while providing a wait-free, transparent shopping experience to consumers.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="p-3 bg-blue-50/50 border border-blue-100/30 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                          <Store className="w-3.5 h-3.5" />
                          <span>Supporting Local Commerce</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          We do not use dark stores or warehouse models. We connect you directly to local shopkeepers, ensuring 100% of your money benefits the neighborhood economy.
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100/30 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Queue-Managed Flow</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Our platform balances merchant loads. If a shop gets too busy, it flags itself to avoid long queues, recommending alternative nearby shops.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-700 mb-1">Our Core Pillars:</h4>
                      <ul className="space-y-1">
                        <li className="flex items-start">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mr-1.5 flex-shrink-0 mt-0.5" />
                          <span><strong>Zero Platform Markups:</strong> No inflated item prices, commissions, or packaging fees.</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mr-1.5 flex-shrink-0 mt-0.5" />
                          <span><strong>Direct Interaction:</strong> Build trust with familiar faces in your neighborhood community.</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mr-1.5 flex-shrink-0 mt-0.5" />
                          <span><strong>Sustainable Logistics:</strong> No courier fleets required; consumers pick up on their own terms.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </details>

                {/* Refund & Cancellation Rules Accordion */}
                <details className="group border border-slate-100 bg-slate-50 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-2">
                      <ScrollText className="w-4 h-4 text-emerald-500" />
                      <span>Refund & Cancellation Rules</span>
                    </div>
                    <span className="text-slate-400 group-open:-rotate-180 transition-transform duration-300">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white space-y-3">
                    <p className="mt-3">
                      To protect both buyers and sellers, MyKiranam enforces a balanced and structured order lifecycle policy. Please read the rules below carefully:
                    </p>

                    <div className="p-3 bg-amber-50/55 border border-amber-100/50 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-amber-800 font-extrabold text-[11px]">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>Warning System & Cancellation Limits (Phase 7A)</span>
                      </div>
                      <p className="text-[10px] text-slate-655 leading-normal">
                        Every order cancelled by a customer reduces their <strong>Reliability/Trust Score</strong> by <strong>5%</strong>. Excessive cancellations trigger strict account restrictions:
                      </p>
                      <ul className="space-y-1.5 text-[10px] pl-1">
                        <li className="flex items-start">
                          <span className="font-bold text-slate-750 mr-1">• 1 to 2 Cancellations:</span>
                          <span className="text-slate-500">Reliability score deduction only; no other restrictions.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold text-slate-750 mr-1">• 3 Cancellations:</span>
                          <span className="text-amber-700 font-semibold">
                            ⚠️ A formal Warning ("Frequent Cancellations") is issued. Additionally, you must pay a refundable ₹50 security deposit online via PhonePe for future "Pay During Pickup" orders.
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-bold text-slate-750 mr-1">• 4 Cancellations:</span>
                          <span className="text-rose-600 font-bold">
                            🚫 Temporary account suspension for 7 days & active order limit restricted to 2.
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                        <h4 className="font-bold text-slate-850 flex items-center text-xs">
                          <ScrollText className="w-4 h-4 text-blue-500 mr-1.5" />
                          Order Stage Cancellation Rules
                        </h4>
                        <ul className="space-y-2 text-[10px] pl-1">
                          <li className="flex items-start">
                            <span className="p-0.5 bg-emerald-100 text-emerald-700 rounded-md mr-1.5 mt-0.5"><Check className="w-3 h-3" /></span>
                            <span>
                              <strong>Before Bill is Updated:</strong> You can cancel your order <strong>as many times as you want</strong>. There are absolutely no warnings, limits, or trust score reductions at this stage.
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="p-0.5 bg-rose-100 text-rose-700 rounded-md mr-1.5 mt-0.5"><X className="w-3 h-3" /></span>
                            <span>
                              <strong>After Bill is Updated / After Pickup:</strong> These cancellations represent <strong>serious warnings</strong> and directly impact your account limits.
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-3 bg-blue-50/30 rounded-2xl border border-blue-100/50 space-y-2">
                        <h4 className="font-bold text-slate-850 flex items-center text-xs">
                          <Info className="w-4 h-4 text-blue-500 mr-1.5" />
                          Store-Visit Dissatisfaction Waiver
                        </h4>
                        <p className="text-[10px] text-slate-550 leading-relaxed">
                          If you visit the store and find yourself <strong>unsatisfied with the product quality, brand, or quantity</strong>, you may cancel the order at the store counter by specifying the reason.
                        </p>
                        <p className="text-[10px] text-slate-655 leading-relaxed font-bold">
                          ⚠️ To waive the cancellation warning on your account:
                        </p>
                        <ul className="list-disc pl-4 text-[9.5px] text-slate-500 space-y-1">
                          <li>You must <strong>raise a support ticket</strong> detailing the reasons for dissatisfaction.</li>
                          <li>The admin will verify if you actually went to the store and cancelled due to genuine quality issues.</li>
                          <li>If verified, or if the seller approves (verifying that they agree the product was not satisfactory or that you visited and decided to reject), the cancellation is <strong>waived and not counted</strong>.</li>
                          <li>Sellers can also raise a ticket if a customer cancels claiming they visited, but actually did not show up.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center mb-1">
                          <Ban className="w-3.5 h-3.5 text-rose-500 mr-1.5" />
                          No Cancellation After Pickup
                        </h4>
                        <p className="text-slate-500 pl-5 leading-normal">
                          Orders cannot be cancelled once they are picked up, payment is completed, and the handoff OTP is verified by the seller. Verify the physical items, brand names, quantities, and expiry dates at the counter <strong>before</strong> providing the OTP and completing the transaction.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center mb-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
                          No-Pickup / No-Show Policy
                        </h4>
                        <p className="text-slate-500 pl-5 leading-normal">
                          Failing to collect an approved, prepared order by the end of the day impacts the merchant. Repeated no-shows will reduce customer trust score, trigger account warnings, and require a refundable <strong>₹50 security deposit</strong> on future orders.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center mb-1">
                          <Coins className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                          Refund Policy & Timelines
                        </h4>
                        <p className="text-slate-500 pl-5 leading-normal mb-3">
                          If you choose to cancel a pre-paid order before seller acceptance, or if a seller cancels your order, an automatic refund is initiated. Once approved by the support desk (usually within 24 hours), refunds are processed to your original payment source within <strong>3-5 business days</strong>.
                        </p>
                        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 ml-5 space-y-2">
                          <div className="flex items-center space-x-1.5 text-rose-850 font-extrabold text-[11px]">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <span>CRITICAL: Pre-Paid Orders & Store-Visit Rejections</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-normal">
                            If you made an online pre-payment/UPI transfer and are <strong>not satisfied with the products upon visiting the store</strong>:
                          </p>
                          <ul className="list-disc pl-4 text-[9.5px] text-slate-500 space-y-1">
                            <li>You <strong>must collect your refund amount directly from the seller in cash or direct transfer at the store counter</strong>.</li>
                            <li>Please ask the seller at the moment to refund you. It is extremely difficult for the platform to trace back your transaction offline and refund you via support tickets raised post-cancellation. Therefore, we **strictly instruct users to collect refunds from the seller directly at the store**.</li>
                            <li>You must still raise a support ticket to waive the cancellation warning, but actual monetary refunds for counter-cancelled items cannot be paid out through tickets.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Privacy Policy Accordion */}
                <details className="group border border-slate-100 bg-slate-50 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      <span>Privacy Policy</span>
                    </div>
                    <span className="text-slate-400 group-open:-rotate-180 transition-transform duration-300">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white space-y-3">
                    <p className="mt-3">
                      At MyKiranam, we are committed to keeping your personal data private and secure.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <span className="p-1 bg-purple-50 text-purple-650 rounded-lg mr-2 mt-0.5"><Users className="w-3.5 h-3.5" /></span>
                        <div>
                          <strong className="text-slate-700">Information We Collect:</strong>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-normal">We collect your registered name, verified WhatsApp number (for order status alerts), location coordinates (for calculating store distances), and transactional history.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="p-1 bg-purple-50 text-purple-650 rounded-lg mr-2 mt-0.5"><Eye className="w-3.5 h-3.5" /></span>
                        <div>
                          <strong className="text-slate-700">How We Share Information:</strong>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-normal">We only share your grocery list (chitti), name, and phone number with the specific shopkeeper you place an order with. We do not sell, rent, or trade your data to third-party ad networks or brokers.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="p-1 bg-purple-50 text-purple-650 rounded-lg mr-2 mt-0.5"><ShieldCheck className="w-3.5 h-3.5" /></span>
                        <div>
                          <strong className="text-slate-700">Data Security & Encryption:</strong>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-normal">All communication between our servers and database is encrypted. Sensitive payment screenshots and digital proofs are securely handled and deleted automatically after audit cycles.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Terms & Conditions Accordion */}
                <details className="group border border-slate-100 bg-slate-50 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Terms & Conditions</span>
                    </div>
                    <span className="text-slate-400 group-open:-rotate-180 transition-transform duration-300">▼</span>
                  </summary>
                  <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white space-y-3">
                    <p className="mt-3">
                      By accessing and using the MyKiranam platform, you agree to abide by our platform guidelines, terms of service, and rules:
                    </p>
                    <ul className="space-y-2 pl-1">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 mr-2 flex-shrink-0 mt-0.5">1</span>
                        <div className="leading-normal text-slate-500">
                          <strong className="text-slate-700">Contract of Sale:</strong> MyKiranam acts as a technology facilitator. The contract of sale is established strictly between the buyer and the shop owner. MyKiranam is not liable for merchant stock availability, incorrect pricing, or product quality issues.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 mr-2 flex-shrink-0 mt-0.5">2</span>
                        <div className="leading-normal text-slate-500">
                          <strong className="text-slate-700">Binding Quotations:</strong> Prices displayed initially are estimates. The offline bill or digital quote generated by the seller, once approved by the customer, constitutes a binding transaction estimate. The physical invoice provided at the checkout counter is final and binding.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 mr-2 flex-shrink-0 mt-0.5">3</span>
                        <div className="leading-normal text-slate-500">
                          <strong className="text-slate-700">Reciprocal Trust & Ratings:</strong> To maintain marketplace health, customers rate shops on pricing and quality, and shopkeepers rate customers on pickup promptness. Low trust ratings restrict profile options, limit concurrent orders, or lead to suspension.
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 mr-2 flex-shrink-0 mt-0.5">4</span>
                        <div className="leading-normal text-slate-500">
                          <strong className="text-slate-700">Dispute Resolution Window:</strong> Any product quality complaints or billing disputes must be filed via the support ticket module within <strong>24 hours of order completion</strong>. Submissions must include clear picture evidence of the invoice and disputed items.
                        </div>
                      </li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* --- DANGER ZONE SECTION --- */}
          <div className="bg-rose-50/30 border border-rose-100 rounded-3xl p-5 shadow-sm space-y-4 hover:border-rose-200 transition-all duration-300">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-rose-600 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Danger Zone</span>
            </h3>
            <div className="space-y-3">
              <p className="text-[11px] text-rose-700/80 leading-relaxed font-semibold">
                Permanently delete your MyKiranam account and all associated data. This action is irreversible.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-rose-200 flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer"
              >
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>

      {/* DOUBLE-CONFIRMATION DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600 w-full" />
            <div className="p-6 space-y-5">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-2xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Confirm Account Deletion</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-2xl text-[11px] text-rose-800 font-medium leading-relaxed space-y-2">
                <p>
                  Deleting your account will immediately and permanently:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Remove your profile information and preferences.</li>
                  {user?.role === 'seller' && (
                    <li>Delete your store listings and verification status.</li>
                  )}
                  <li>De-link your WhatsApp mobile number.</li>
                  <li>Set any previous completed order links to anonymous.</li>
                </ul>
                <p className="font-bold mt-1 text-rose-900">
                  ⚠️ Note: If you have active orders in progress, this request will be rejected.
                </p>
              </div>

              {deleteError && (
                <div className="text-[10px] font-bold text-red-650 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-550 flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Type <span className="text-rose-600 font-black">DELETE</span> below to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2.5 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 rounded-xl outline-none transition-all placeholder:text-slate-350 tracking-wider text-center"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-2xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmationText !== 'DELETE'}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-rose-200 cursor-pointer text-center"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
