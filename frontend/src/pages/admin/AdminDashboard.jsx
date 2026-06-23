import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, UserCheck, Eye, Trash2, EyeOff, AlertOctagon, User, Store, Layers, X, Check, MapPin, ChevronLeft, ChevronRight, Play, Square, RefreshCcw, Activity, AlertCircle, CreditCard, Banknote, Building2, FileText, Lock, Clock, ShoppingBag } from 'lucide-react';
import ComplaintsManagement from '../../components/admin/ComplaintsManagement';

const AdminDashboard = () => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();
  const [sellers, setSellers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // analytics | review | verified | logs | trust | complaints | orders | users

  // Users Directory States
  const [usersDirectory, setUsersDirectory] = useState({ customers: [], sellers: [], totalCustomers: 0, totalSellers: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('All');
  const [usersStatusFilter, setUsersStatusFilter] = useState('All');
  const [selectedUserForMap, setSelectedUserForMap] = useState(null);
  
  // Orders Tab States
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ordersFilter, setOrdersFilter] = useState('All');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStartDateFilter, setOrdersStartDateFilter] = useState('');
  const [ordersEndDateFilter, setOrdersEndDateFilter] = useState('');
  const [expandedPaymentProof, setExpandedPaymentProof] = useState(null);

  // Modal states
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [notes, setNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // KYC state for seller audit modal
  const [sellerKyc, setSellerKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [expandedKycImage, setExpandedKycImage] = useState(null); // 'aadhaar' | 'pan' | null

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const userMapInstanceRef = useRef(null);


  const fetchOrders = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    }
  };

  const fetchSellers = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const response = await fetch(`${apiUrl}/admin/sellers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSellers(data);
      }
    } catch (err) {
      console.error('Error fetching admin sellers:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
    }
  };

  const fetchTrustData = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/trust-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrustData(data);
      }
    } catch (err) {
      console.error('Error fetching trust data:', err);
    }
  };

  const fetchUsersDirectory = async (isInitial = false) => {
    try {
      if (isInitial) setUsersLoading(true);
      const response = await fetch(`${apiUrl}/admin/users-directory`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsersDirectory(data);
      }
    } catch (err) {
      console.error('Error fetching admin users directory:', err);
    } finally {
      if (isInitial) setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers(true);
    fetchAnalytics();
    fetchTrustData();
    fetchOrders();
    fetchUsersDirectory(true);

    // Set up polling every 3 seconds while on dashboard
    const interval = setInterval(() => {
      fetchSellers(false); // Refresh store metrics live in background!
      fetchAnalytics();
      fetchTrustData();
      fetchOrders();
      fetchUsersDirectory(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load Leaflet CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const jsId = 'leaflet-js';
    const existingScript = document.getElementById(jsId);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      if (window.L) {
        setLeafletLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setLeafletLoaded(true));
      }
    }
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !selectedSeller || !mapContainerRef.current) return;

    const L = window.L;
    if (!L) return; // Prevent crash if Leaflet is not yet ready on window

    const initialLat = parseFloat(selectedSeller.latitude) || 16.8970;
    const initialLng = parseFloat(selectedSeller.longitude) || 79.8705;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView([initialLat, initialLng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: false }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded, selectedSeller]);

  // Map initialization for Selected User Map Modal
  useEffect(() => {
    if (!leafletLoaded || !selectedUserForMap || !selectedUserForMap.location?.latitude) return;

    const L = window.L;
    if (!L) return;

    const lat = parseFloat(selectedUserForMap.location.latitude);
    const lng = parseFloat(selectedUserForMap.location.longitude);

    // Timeout to make sure modal container has rendered completely in DOM
    const timer = setTimeout(() => {
      const mapDiv = document.getElementById('user-location-map');
      if (!mapDiv) return;

      if (userMapInstanceRef.current) {
        userMapInstanceRef.current.remove();
        userMapInstanceRef.current = null;
      }

      const userMap = L.map(mapDiv, { scrollWheelZoom: false }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(userMap);

      L.marker([lat, lng]).addTo(userMap)
        .bindPopup(`<b>${selectedUserForMap.name}</b><br/>${selectedUserForMap.location.address || ''}`)
        .openPopup();

      userMapInstanceRef.current = userMap;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (userMapInstanceRef.current) {
        userMapInstanceRef.current.remove();
        userMapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, selectedUserForMap]);

  const handleVerifyStatus = async (sellerId, newStatus) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/sellers/${sellerId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          notes: newStatus === 'Rejected' ? notes : ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status.');

      playSoundAlert('success');
      setSelectedSeller(null);
      setShowRejectForm(false);
      setNotes('');
      fetchSellers();
    } catch (err) {
      alert(err.message || 'Error executing action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendCustomer = async (customerId) => {
    if (!window.confirm("Are you sure you want to unsuspend this customer and reset their trust score to 100?")) return;
    try {
      const response = await fetch(`${apiUrl}/admin/customers/${customerId}/unsuspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Customer unsuspended successfully.');
        fetchTrustData();
      } else {
        alert(data.error || 'Failed to unsuspend customer.');
      }
    } catch (err) {
      console.error('Error unsuspending customer:', err);
      alert('Network error unsuspending customer.');
    }
  };

  const fetchSellerKyc = async (shopId) => {
    setKycLoading(true);
    setSellerKyc(null);
    try {
      const response = await fetch(`${apiUrl}/admin/sellers/${shopId}/kyc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.hasKyc) {
        setSellerKyc(data.kyc);
      } else {
        setSellerKyc(null);
      }
    } catch (err) {
      console.error('Error fetching KYC:', err);
      setSellerKyc(null);
    } finally {
      setKycLoading(false);
    }
  };


  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  // Group applications
  const pendingApps = sellers.filter(s => s.verification_status === 'Under Review');
  const verifiedList = sellers.filter(s => s.verification_status === 'Verified');
  const logsHistory = sellers.filter(s => ['Rejected', 'Suspended'].includes(s.verification_status));

  // Filtered users for Users Directory
  const filteredUsers = (() => {
    const list = [
      ...(usersDirectory.customers || []).map(c => ({ ...c, role: 'customer' })),
      ...(usersDirectory.sellers || []).map(s => ({ ...s, role: 'seller' }))
    ];

    return list.filter(user => {
      // 1. Search Query Match
      const searchStr = usersSearch.trim().toLowerCase();
      const nameMatch = user.name?.toLowerCase().includes(searchStr);
      const emailMatch = user.email?.toLowerCase().includes(searchStr);
      const phoneMatch = user.phone?.toLowerCase().includes(searchStr);
      const shopMatch = user.shop_name?.toLowerCase().includes(searchStr);
      const matchSearch = !searchStr || nameMatch || emailMatch || phoneMatch || shopMatch;

      // 2. Role Filter Match
      const matchRole = usersRoleFilter === 'All' || user.role === usersRoleFilter;

      // 3. Status Filter Match
      const matchStatus = usersStatusFilter === 'All' || 
                          (usersStatusFilter === 'Active' && user.status === 'Active') ||
                          (usersStatusFilter === 'Suspended' && (user.status === 'Suspended' || user.status === 'Banned')) ||
                          (usersStatusFilter === 'Verified' && user.status === 'Verified') ||
                          (usersStatusFilter === 'Pending' && (user.status === 'Pending' || user.status === 'Under Review'));

      return matchSearch && matchRole && matchStatus;
    });
  })();

  // Visual metrics summary
  const totalActiveQueues = sellers.reduce((sum, s) => sum + (s.active_orders || 0), 0);

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Admin stats header banner */}
      <div className="grid grid-cols-3 gap-3 bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-premium">
        <div>
          <span className="block text-[10px] text-slate-400 uppercase font-bold">Pending Audits</span>
          <span className="text-xl font-extrabold">{pendingApps.length} applications</span>
        </div>
        <div className="border-l border-slate-800 pl-4">
          <span className="block text-[10px] text-slate-400 uppercase font-bold">Verified Stores</span>
          <span className="text-xl font-extrabold">{verifiedList.length} stores</span>
        </div>
        <div className="border-l border-slate-800 pl-4">
          <span className="block text-[10px] text-slate-400 uppercase font-bold">Active Buyer Queue</span>
          <span className="text-xl font-extrabold">{totalActiveQueues} in progress</span>
        </div>
      </div>

      {/* Admin sub-tabs selection */}
      <div className="flex bg-slate-105 bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-2xl mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 whitespace-nowrap ${
            activeSubTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Insights</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 whitespace-nowrap ${
            activeSubTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-kirana-600" />
          <span className="hidden sm:inline">Orders</span>
        </button>

        <button
          onClick={() => setActiveSubTab('review')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Applications</span>
          {pendingApps.length > 0 && (
            <span className="px-1.5 py-0.2 bg-kirana-500 text-slate-950 text-[9px] font-black rounded-full">
              {pendingApps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('verified')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'verified' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Verified Directory</span>
        </button>


        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('complaints')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'complaints' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-crimson" />
          <span className="hidden sm:inline">Complaints</span>
        </button>

        <button
          onClick={() => setActiveSubTab('trust')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'trust' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-kirana-500" />
          <span className="hidden sm:inline">Trust & Safety</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Users</span>
        </button>

        <button
          onClick={() => setActiveSubTab('database')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
            activeSubTab === 'database' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <RefreshCcw className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Database</span>
        </button>
      </div>

      {/* Render applications lists */}
      {loading && activeSubTab !== 'analytics' && activeSubTab !== 'users' ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Retrieving merchant applications directory...
        </div>
      ) : activeSubTab === 'users' ? (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">User Management Directory</h2>
              <p className="text-sm text-slate-500">Monitor and manage all customers and sellers registered on Kiranam.in.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => fetchUsersDirectory(true)} 
                className="px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-bold flex items-center space-x-2 text-slate-700 hover:bg-slate-50 transition-all"
              >
                <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh Directory</span>
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-3xl shadow-premium border border-indigo-400/20 relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-2xl">
                <User className="w-6 h-6 text-white" />
              </div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-indigo-100">Total Registered Users</span>
              <span className="text-3xl font-black mt-2 block">
                {(usersDirectory.totalCustomers || 0) + (usersDirectory.totalSellers || 0)}
              </span>
              <span className="text-[10px] text-indigo-200 mt-1 block">Active on platform</span>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-3xl shadow-premium border border-blue-400/20 relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-2xl">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-blue-100">Total Customers</span>
              <span className="text-3xl font-black mt-2 block">
                {usersDirectory.totalCustomers || 0}
              </span>
              <span className="text-[10px] text-blue-200 mt-1 block">Buyers & Order placements</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-premium border border-emerald-400/20 relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-2xl">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-emerald-100">Total Sellers</span>
              <span className="text-3xl font-black mt-2 block">
                {usersDirectory.totalSellers || 0}
              </span>
              <span className="text-[10px] text-emerald-200 mt-1 block">Shops & Service providers</span>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search name, email, phone, shop name..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:border-indigo-500 focus:outline-none font-semibold text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  value={usersRoleFilter}
                  onChange={(e) => setUsersRoleFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:border-indigo-500 focus:outline-none font-bold text-slate-700"
                >
                  <option value="All">All Roles</option>
                  <option value="customer">Customers Only</option>
                  <option value="seller">Sellers Only</option>
                </select>
              </div>

              <div>
                <select
                  value={usersStatusFilter}
                  onChange={(e) => setUsersStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:border-indigo-500 focus:outline-none font-bold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Profile</option>
                  <option value="Suspended">Suspended Profile</option>
                  <option value="Verified">Verified Shop (Sellers)</option>
                  <option value="Pending">Pending Audit (Sellers)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading users database directory...
              </div>
            ) : (() => {
              const list = filteredUsers;
              if (list.length === 0) {
                return (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    No users match the search queries and filters.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                        <th className="py-3.5 px-5">User</th>
                        <th className="py-3.5 px-5">Contact Details</th>
                        <th className="py-3.5 px-5">Profile Status</th>
                        <th className="py-3.5 px-5">Last Login Time</th>
                        <th className="py-3.5 px-5">GPS Location</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {list.map((user) => {
                        const isSeller = user.role === 'seller';
                        const isWhatsappVerified = user.verified_whatsapp;
                        const isEmailVerified = user.verified_email;
                        const hasLocation = user.location && user.location.latitude;

                        // Check if active login in last 24h
                        const wasActive24h = user.last_login && (new Date() - new Date(user.last_login)) < 24 * 60 * 60 * 1000;

                        return (
                          <tr key={`${user.role}-${user.id}`} className="hover:bg-slate-50/50 transition-colors">
                            {/* User name & role */}
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center border ${
                                  isSeller ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                }`}>
                                  {user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <span className="block font-bold text-slate-900">{user.name}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                                      isSeller ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {user.role}
                                    </span>
                                    <span className="text-[9px] text-slate-400">ID: #{user.id}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact Details */}
                            <td className="py-4 px-5 space-y-0.5">
                              <span className="block font-semibold text-slate-700">{user.email}</span>
                              <div className="flex flex-col space-y-0.5">
                                <span className="text-slate-500 font-medium">{user.phone || 'No phone number'}</span>
                                {user.whatsapp_number && (
                                  <span className="text-emerald-600 font-semibold text-[11px] flex items-center">
                                    WA: {user.whatsapp_number}
                                  </span>
                                )}
                                {isWhatsappVerified && (
                                  <span className="inline-block self-start px-1.5 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-extrabold rounded-full mt-0.5">
                                    WA Verified
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Profile Status */}
                            <td className="py-4 px-5">
                              {isSeller ? (
                                <div className="space-y-1">
                                  <span className="block font-bold text-slate-700 text-[10px]">{user.shop_name}</span>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                    user.status === 'Verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    user.status === 'Under Review' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                    user.status === 'Pending' ? 'bg-slate-100 text-slate-655 border border-slate-200' :
                                    'bg-rose-100 text-rose-800 border border-rose-250'
                                  }`}>
                                    {user.status}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="block text-slate-500 text-[10px] font-medium">{user.customer_level}</span>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                    user.status === 'Active' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    'bg-rose-100 text-rose-800 border border-rose-250'
                                  }`}>
                                    {user.status}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Last Login Time */}
                            <td className="py-4 px-5">
                              {user.last_login ? (
                                <div className="flex items-center space-x-1.5">
                                  {wasActive24h && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                  )}
                                  <span className="text-slate-600 font-semibold">{new Date(user.last_login).toLocaleString()}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Never logged in</span>
                              )}
                            </td>

                            {/* GPS Location */}
                            <td className="py-4 px-5">
                              {(() => {
                                const locationToDisplay = hasLocation ? user.location : {
                                  address: "Telangana (Platform Default)",
                                  latitude: 16.8970,
                                  longitude: 79.8705,
                                  isDefault: true
                                };

                                return (
                                  <div className="max-w-[200px] space-y-1">
                                    <span 
                                      className={`block truncate font-semibold ${locationToDisplay.isDefault ? 'text-slate-400 italic' : 'text-slate-600'}`} 
                                      title={locationToDisplay.address}
                                    >
                                      {locationToDisplay.address}
                                    </span>
                                    <button
                                      onClick={() => setSelectedUserForMap({
                                        ...user,
                                        location: locationToDisplay
                                      })}
                                      className={`text-[10px] font-extrabold flex items-center gap-0.5 cursor-pointer ${
                                        locationToDisplay.isDefault ? 'text-slate-400 hover:text-slate-500' : 'text-indigo-600 hover:text-indigo-800'
                                      }`}
                                    >
                                      <MapPin className="w-3 h-3" />
                                      <span>View Pin ({parseFloat(locationToDisplay.latitude).toFixed(4)}, {parseFloat(locationToDisplay.longitude).toFixed(4)})</span>
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-5 text-right">
                              {isSeller ? (
                                <button
                                  onClick={() => {
                                    // Set as selectedSeller to trigger existing shop audit modal in current code!
                                    setSelectedSeller({
                                      id: user.shop_id,
                                      owner_id: user.id,
                                      shop_name: user.shop_name,
                                      address: user.address,
                                      latitude: user.latitude,
                                      longitude: user.longitude,
                                      verification_status: user.verification_status,
                                      shop_category: user.shop_category,
                                      working_hours: user.working_hours,
                                      owner_name: user.name,
                                      owner_phone: user.phone,
                                      image_front: user.image_front,
                                      image_counter: user.image_counter,
                                      image_inside1: user.image_inside1,
                                      image_inside2: user.image_inside2,
                                      image_additional: user.image_additional
                                    });
                                    setActiveImageIdx(0);
                                    setShowRejectForm(false);
                                    if (user.shop_id) {
                                      fetchSellerKyc(user.shop_id);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  Audit Shop
                                </button>
                              ) : (
                                <>
                                  {user.status === 'Suspended' ? (
                                    <button
                                      onClick={() => handleUnsuspendCustomer(user.id)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                                    >
                                      Unsuspend
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[10px] italic">No action needed</span>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeSubTab === 'analytics' ? (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Performance Insights</h2>
              <p className="text-sm text-slate-500">Real-time analytics for platform registrations and user engagement.</p>
            </div>
            <button onClick={fetchAnalytics} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-bold flex items-center space-x-2 text-slate-700 hover:bg-slate-50">
               <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>

          {/* Revenue & Traffic Insight Box */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-premium">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2"><Activity className="w-5 h-5 text-amber-500"/> Revenue & Traffic Insight</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Automatic estimation based on page views (Market Standard ₹35/1000 views).</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[120px]">
                  <span className="block text-[9px] text-slate-400 uppercase font-bold">Daily Views</span>
                  <span className="text-2xl font-black">{analytics?.dailyViews?.toLocaleString() || 0}</span>
                </div>
                <div className="bg-blue-900/20 p-3 rounded-2xl border border-blue-900/50 min-w-[120px]">
                  <span className="block text-[9px] text-blue-400 uppercase font-bold">Earned Today</span>
                  <span className="text-2xl font-black text-blue-500">₹{analytics?.earnedToday?.toFixed(2) || '0.00'}</span>
                  <span className="block text-[9px] text-slate-500">(Total Delivered Orders)</span>
                </div>
                <div className="bg-emerald-900/20 p-3 rounded-2xl border border-emerald-900/50 min-w-[120px]">
                   <span className="block text-[9px] text-emerald-400 uppercase font-bold">Total Revenue</span>
                   <span className="text-2xl font-black text-emerald-500">₹{analytics?.earnedLifetime?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Network Projections Box */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-premium">
            <h3 className="text-sm font-extrabold flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-emerald-500"/> Ad Network Projections</h3>
            <p className="text-xs text-slate-400 mb-5">Estimated earnings comparison based on current views (Google: ₹50 CPM, Ezoic: ₹100 EPMV).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <span className="block text-[10px] text-slate-300 font-bold mb-3">EST. 1 MONTH ({((analytics?.dailyViews||0)*30).toLocaleString()} VIEWS)</span>
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                     <span>Google AdSense:</span>
                     <span className="text-blue-400 font-bold">₹{(((analytics?.dailyViews||0)*30/1000)*50).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                     <span>Ezoic (AI Total):</span>
                     <span className="text-emerald-400 font-bold">₹{(((analytics?.dailyViews||0)*30/1000)*100).toFixed(2)}</span>
                  </div>
               </div>
               
               <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <span className="block text-[10px] text-slate-300 font-bold mb-3">TOTAL 3 MONTHS ({((analytics?.dailyViews||0)*90).toLocaleString()} VIEWS)</span>
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                     <span>Google AdSense:</span>
                     <span className="text-blue-400 font-bold">₹{(((analytics?.dailyViews||0)*90/1000)*50).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                     <span>Ezoic (AI Total):</span>
                     <span className="text-emerald-400 font-bold">₹{(((analytics?.dailyViews||0)*90/1000)*100).toFixed(2)}</span>
                  </div>
               </div>

               <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <span className="block text-[10px] text-slate-300 font-bold mb-3">LIFETIME TOTAL ({(analytics?.lifetimeViews||0).toLocaleString()} VIEWS)</span>
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                     <span>Google AdSense:</span>
                     <span className="text-blue-400 font-bold">₹{(((analytics?.lifetimeViews||0)/1000)*50).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                     <span>Ezoic (AI Total):</span>
                     <span className="text-emerald-400 font-bold">₹{(((analytics?.lifetimeViews||0)/1000)*100).toFixed(2)}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-3xl border-t-4 border-t-kirana-500 border-l border-r border-b border-slate-100 shadow-sm">
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Total Hits (Today)</span>
                <span className="text-3xl font-black text-slate-800">{(analytics?.dailyViews || 0).toLocaleString()}</span>
             </div>
             <div className="bg-white p-5 rounded-3xl border-t-4 border-t-kirana-500 border-l border-r border-b border-slate-100 shadow-sm">
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Lifetime Hits</span>
                <span className="text-3xl font-black text-slate-800">{(analytics?.lifetimeViews || 0).toLocaleString()}</span>
             </div>
             <div className="bg-white p-5 rounded-3xl border-t-4 border-t-amber-500 border-l border-r border-b border-slate-100 shadow-sm">
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Total Community Size</span>
                <span className="text-3xl font-black text-slate-800">{(analytics?.totalCommunitySize || 0).toLocaleString()}</span>
             </div>
             <div className="bg-white p-5 rounded-3xl border-t-4 border-t-kirana-500 border-l border-r border-b border-slate-100 shadow-sm">
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Registrations (Last 24H)</span>
                <span className="text-3xl font-black text-slate-800">{analytics?.registrations24h || 0}</span>
             </div>
          </div>

          {/* Split Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             {/* Left side: Profile Completion */}
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-end mb-6">
                      <h3 className="font-extrabold text-slate-900 text-sm">Profile Completion Distribution</h3>
                      <span className="text-[10px] text-slate-400">User Data Analysis</span>
                   </div>
                   <div className="space-y-4">
                      <div>
                         <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                            <span>Needs Work (0-25%)</span>
                            <span>{Math.floor((analytics?.totalCommunitySize||10) * 0.15)} users (15%)</span>
                         </div>
                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-crimson h-full rounded-full w-[15%]"></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                            <span>Getting Started (26-50%)</span>
                            <span>{Math.floor((analytics?.totalCommunitySize||10) * 0.20)} users (20%)</span>
                         </div>
                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full w-[20%]"></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                            <span>Elite / Complete (76-100%)</span>
                            <span>{Math.floor((analytics?.totalCommunitySize||10) * 0.65)} users (65%)</span>
                         </div>
                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full w-[65%]"></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right side: Recent Signups & Active Logins */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-end mb-4">
                     <h3 className="font-extrabold text-slate-900 text-sm">Recent Signups</h3>
                  </div>
                  
                  <div className="space-y-3 h-64 overflow-y-auto pr-2">
                     {analytics?.recentSignups?.length > 0 ? analytics.recentSignups.map(user => (
                        <div key={user.id} className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                           <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs">
                              {user.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <span className="block text-xs font-bold text-slate-800">{user.name}</span>
                              <span className="block text-[9px] text-slate-500 capitalize">{user.role} • Registered {new Date(user.created_at).toLocaleDateString()}</span>
                           </div>
                        </div>
                     )) : (
                        <div className="text-center text-xs text-slate-400 py-10">No recent signups</div>
                     )}
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-end mb-4">
                     <h3 className="font-extrabold text-slate-900 text-sm">Active Users (24H)</h3>
                  </div>
                  
                  <div className="space-y-3 h-64 overflow-y-auto pr-2">
                     {analytics?.activeLogins24h?.length > 0 ? analytics.activeLogins24h.map(user => (
                        <div key={user.id} className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                              {user.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <span className="block text-xs font-bold text-slate-800">{user.name}</span>
                              <span className="block text-[9px] text-slate-500 capitalize">{user.role} • Last seen {new Date(user.last_login).toLocaleTimeString()}</span>
                           </div>
                        </div>
                     )) : (
                        <div className="text-center text-xs text-slate-400 py-10">No recent logins</div>
                     )}
                  </div>
               </div>
             </div>
          </div>
        </div>
      ) : activeSubTab === 'database' ? (
        <div className="space-y-6 animate-fade-in-up">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto mt-8">
             <h2 className="text-xl font-black text-slate-900 mb-2">Price Engine Dictionary</h2>
             <p className="text-xs text-slate-500 mb-6">Upload the latest Kaggle / Scraped CSV to automatically update market prices for the predictive search.</p>
             
             <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
               <input type="file" id="csv-upload" accept=".csv,.xlsx,.xls,.pdf,.doc,.docx" className="hidden" onChange={async (e) => {
                 if (!e.target.files[0]) return;
                 const file = e.target.files[0];
                 const formData = new FormData();
                 formData.append('file', file);
                 
                 alert('Uploading and processing CSV... This may take a few moments.');
                 try {
                   const res = await fetch(`${apiUrl}/admin/upload-prices`, {
                     method: 'POST',
                     headers: { 'Authorization': `Bearer ${token}` },
                     body: formData
                   });
                   const data = await res.json();
                   if (res.ok) alert(data.message);
                   else alert(data.error || 'Upload failed');
                 } catch (err) {
                   alert('Network error during upload');
                 }
                 e.target.value = ''; // reset input
               }} />
               <label htmlFor="csv-upload" className="px-6 py-3 bg-kirana-500 hover:bg-kirana-600 text-slate-900 font-black text-sm rounded-xl cursor-pointer shadow-md transition-all">
                 Select Document File
               </label>
               <p className="text-[10px] text-slate-400 mt-4">Supported formats: .csv, .xlsx, .xls, .pdf, .doc, .docx. Data extraction only runs on tabular formats (.csv, .xlsx, .xls) and overwrites the dictionary.</p>
             </div>
           </div>
        </div>
      ) : activeSubTab === 'complaints' ? (
        <ComplaintsManagement />
      ) : activeSubTab === 'review' ? (
        <div className="space-y-4">
          {pendingApps.length === 0 ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center text-xs font-bold text-slate-450 shadow-sm">
              All merchant applications verified. Check directory tabs for log details.
            </div>
          ) : (
            pendingApps.map((seller) => (
              <div
                key={seller.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1">
                    <span>{seller.shop_name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold uppercase">
                      {seller.verification_status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Owner: {seller.owner_name} • Phone: {seller.owner_phone || 'N/A'} {seller.owner_whatsapp ? `• WA: ${seller.owner_whatsapp}` : ''} • Category: {seller.shop_category}</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] sm:max-w-md truncate">📍 Address: {seller.address}</p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedSeller(seller);
                    setActiveImageIdx(0);
                    setShowRejectForm(false);
                    fetchSellerKyc(seller.id);
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                >
                  Audit Verification Images
                </button>
              </div>
            ))
          )}
        </div>
      ) : activeSubTab === 'verified' ? (
        <div className="space-y-4">
          {verifiedList.length === 0 ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center text-xs font-bold text-slate-455 shadow-sm">
              No verified stores active. Approve registrations to populate verified directory.
            </div>
          ) : (
            verifiedList.map((seller) => (
              <div
                key={seller.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900">{seller.shop_name}</h3>
                    <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded text-[9px] font-bold">✓ Verified</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Category: {seller.shop_category} • Working: {seller.working_hours}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Queue Load: {seller.active_orders} active orders • UPI ID: {seller.upi_id || 'None added'}</p>
                </div>

                <button
                  onClick={() => handleVerifyStatus(seller.id, 'Suspended')}
                  className="px-4 py-2 bg-crimson/10 hover:bg-crimson text-crimson hover:text-white border border-transparent rounded-xl text-xs font-bold transition-all"
                >
                  Suspend Store
                </button>
              </div>
            ))
          )}
        </div>
      ) : activeSubTab === 'trust' ? (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Trust & Safety Dashboard</h2>
              <p className="text-sm text-slate-500">Monitor suspicious activities and platform reputation.</p>
            </div>
            <button onClick={fetchTrustData} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-bold flex items-center space-x-2 text-slate-700 hover:bg-slate-50">
               <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">Suspicious Activities</h3>
              <div className="space-y-3 h-64 overflow-y-auto pr-2">
                {trustData?.suspiciousActivities?.length > 0 ? trustData.suspiciousActivities.map(act => (
                  <div key={act.id} className="flex flex-col p-3 bg-red-50 border border-red-100 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <span className="block text-xs font-bold text-slate-800">{act.customer_name} ({act.phone})</span>
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">Risk: {act.risk_score}</span>
                    </div>
                    <span className="block text-[10px] text-slate-600 mt-1">{act.reason}</span>
                    <span className="block text-[9px] text-slate-400 mt-1">{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-center text-xs text-slate-400 py-10">No suspicious activities detected</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-4">Customer Trust & Suspensions</h3>
                <div className="space-y-3 h-64 overflow-y-auto pr-2">
                  {trustData?.highRiskCustomers?.length > 0 ? trustData.highRiskCustomers.map(cust => {
                    const isSuspended = cust.suspension_end_date && new Date(cust.suspension_end_date) > new Date();
                    return (
                      <div key={cust.id} className="flex justify-between items-center p-3 bg-amber-50/50 border border-amber-100 rounded-2xl gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${isSuspended ? 'bg-red-100 text-red-800' : 'bg-amber-200 text-amber-800'} font-black flex items-center justify-center text-xs flex-shrink-0`}>
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 truncate">{cust.name} ({cust.phone})</span>
                            <span className="block text-[9px] text-slate-655 font-medium">
                              Trust Score: <strong className={cust.trust_score < 50 ? 'text-red-600' : 'text-slate-700'}>{cust.trust_score}%</strong> • Cancels: {cust.cancellations}
                            </span>
                            {isSuspended && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-red-100 text-red-700 text-[8px] font-black rounded font-mono">
                                Suspended until {new Date(cust.suspension_end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnsuspendCustomer(cust.id)}
                          className="px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-950 rounded-xl text-[10px] font-bold transition-all flex-shrink-0"
                        >
                          Unsuspend & Reset
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-xs text-slate-400 py-10">No customer suspension or warning logs</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">High Complaint Sellers</h3>
              <div className="space-y-3 h-64 overflow-y-auto pr-2">
                {trustData?.highComplaintSellers?.length > 0 ? trustData.highComplaintSellers.map(seller => (
                  <div key={seller.id} className="flex items-center space-x-3 p-3 bg-crimson/5 border border-crimson/10 rounded-2xl">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">{seller.shop_name}</span>
                      <span className="block text-[9px] text-slate-600">Trust Score: {seller.trust_score} • Complaint Rate: {seller.complaint_rate}%</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-xs text-slate-400 py-10">No high complaint sellers</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'orders' ? (
        <div className="space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Orders Audit Panel</h2>
              <p className="text-sm text-slate-500">View and audit all transactions and fulfillment timelines across the platform.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <input
                type="text"
                placeholder="Search Order ID, Customer, Phone..."
                value={ordersSearch}
                onChange={(e) => setOrdersSearch(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none w-48 sm:w-64 font-semibold shadow-sm"
              />

              {/* Status Filter */}
              <select
                value={ordersFilter}
                onChange={(e) => setOrdersFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none font-bold shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Waiting For Seller">Waiting For Seller</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="Packing Started">Packing Started</option>
                <option value="Ready For Pickup">Ready For Pickup</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              {/* Date Range Filters */}
              <div className="flex items-center space-x-2 border border-slate-200 bg-slate-50 p-1.5 rounded-xl">
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase">From:</span>
                  <input
                    type="date"
                    value={ordersStartDateFilter}
                    onChange={(e) => setOrdersStartDateFilter(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-250 rounded-lg text-xs focus:border-kirana-500 focus:outline-none font-bold"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase">To:</span>
                  <input
                    type="date"
                    value={ordersEndDateFilter}
                    onChange={(e) => setOrdersEndDateFilter(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-250 rounded-lg text-xs focus:border-kirana-500 focus:outline-none font-bold"
                  />
                </div>
                {(ordersStartDateFilter || ordersEndDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersStartDateFilter('');
                      setOrdersEndDateFilter('');
                    }}
                    className="p-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all"
                    title="Clear date filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button 
                type="button"
                onClick={fetchOrders}
                className="p-2 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Orders Listing */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {ordersLoading && orders.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading orders database...
              </div>
            ) : (() => {
              // Apply filters
              const filtered = orders.filter(o => {
                const searchLower = ordersSearch.toLowerCase().trim();
                const matchesSearch = !searchLower || 
                  (o.custom_order_id && o.custom_order_id.toLowerCase().includes(searchLower)) ||
                  String(o.id).includes(searchLower) ||
                  (o.customer_name && o.customer_name.toLowerCase().includes(searchLower)) ||
                  (o.customer_phone && o.customer_phone.includes(searchLower)) ||
                  (o.shop_name && o.shop_name.toLowerCase().includes(searchLower)) ||
                  (o.shop_address && o.shop_address.toLowerCase().includes(searchLower)) ||
                  (o.delivery_address && o.delivery_address.toLowerCase().includes(searchLower)) ||
                  (o.created_at && new Date(o.created_at).toLocaleDateString().toLowerCase().includes(searchLower));

                const matchesStatus = ordersFilter === 'All' || o.order_status === ordersFilter;
                
                const matchesDate = (() => {
                  const d = new Date(o.created_at);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const orderDateLocal = `${year}-${month}-${day}`;
                  
                  if (ordersStartDateFilter && orderDateLocal < ordersStartDateFilter) return false;
                  if (ordersEndDateFilter && orderDateLocal > ordersEndDateFilter) return false;
                  return true;
                })();
                
                return matchesSearch && matchesStatus && matchesDate;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-16 text-center text-xs font-bold text-slate-400">
                    No orders match your search criteria.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-4 px-6">Order ID</th>
                        <th className="py-4 px-4">Store</th>
                        <th className="py-4 px-4">Customer</th>
                        <th className="py-4 px-4">Fulfillment</th>
                        <th className="py-4 px-4">Amount</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {filtered.map(order => {
                        // Badge color mapping
                        let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                        if (order.order_status === 'Delivered') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        else if (order.order_status === 'Cancelled') statusColor = 'bg-rose-50 text-rose-700 border-rose-100';
                        else if (order.order_status === 'Ready For Pickup') statusColor = 'bg-blue-50 text-blue-700 border-blue-100';
                        else if (order.order_status === 'Packing Started') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                        else if (order.order_status === 'PENDING_PAYMENT') statusColor = 'bg-purple-50 text-purple-700 border-purple-100';
                        else if (order.order_status === 'Waiting For Seller') statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 font-extrabold text-slate-900">
                              #{order.custom_order_id || order.id}
                              <span className="block text-[8px] text-slate-400 font-bold font-mono mt-0.5">
                                {new Date(order.created_at).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800">
                              <div>{order.shop_name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold max-w-[150px] truncate" title={order.shop_address}>
                                📍 {order.shop_address || 'No Shop Address'}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="block font-bold text-slate-800">{order.customer_name}</span>
                              <span className="block text-[10px] text-slate-400">{order.customer_phone}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold max-w-[150px] truncate" title={order.delivery_address || 'Pickup Order'}>
                                🏠 {order.delivery_address || 'Pickup Order'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.fulfillment_method === 'Delivery' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-700 border border-slate-150'
                              }`}>
                                {order.fulfillment_method === 'Delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-extrabold text-slate-900">
                              ₹{parseFloat(order.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${statusColor}`}>
                                {order.order_status === 'PENDING_PAYMENT' ? 'Pending Bill Pay' : order.order_status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all"
                              >
                                View Audit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        // Rejected / Suspended Logs
        <div className="space-y-4">
          {logsHistory.length === 0 ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center text-xs font-bold text-slate-450 shadow-sm">
              No rejected or suspended shop profiles listed.
            </div>
          ) : (
            logsHistory.map((seller) => (
              <div
                key={seller.id}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900">{seller.shop_name}</h3>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      seller.verification_status === 'Suspended' ? 'bg-slate-200 text-slate-700' : 'bg-crimson/10 text-crimson'
                    }`}>
                      {seller.verification_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Owner: {seller.owner_name} • Phone: {seller.owner_phone || 'N/A'} {seller.owner_whatsapp ? `• WA: ${seller.owner_whatsapp}` : ''}</p>
                </div>

                <button
                  onClick={() => handleVerifyStatus(seller.id, 'Verified')}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-950 rounded-xl text-xs font-bold transition-all"
                >
                  Restore Store (Verify)
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Verification overlay audit drawer */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 flex flex-col max-h-[95vh]">
            
            {/* Modal header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-bold text-kirana-600 bg-kirana-50 px-2 py-0.5 rounded uppercase">Verify Applicant</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Audit: {selectedSeller.shop_name}
                </h3>
                <p className="text-xs text-slate-455">Owner name: {selectedSeller.owner_name} • Tel: {selectedSeller.owner_phone || 'N/A'} {selectedSeller.owner_whatsapp ? `• WA: ${selectedSeller.owner_whatsapp}` : ''}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSeller(null);
                  setShowRejectForm(false);
                  setNotes('');
                  setSellerKyc(null);
                  setExpandedKycImage(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal scroll content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Mandatory 4 image carousel */}
              <div>
                <span className="block text-[10px] text-slate-450 uppercase font-bold mb-1.5">
                  Mandatory Shop Image Review (Slide to audit all 4)
                </span>
                
                {/* Carousel Viewer */}
                <div className="relative border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center">
                  
                  {/* Slider controls */}
                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === 0 ? 3 : prev - 1))}
                    className="absolute left-2.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === 3 ? 0 : prev + 1))}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Active Slide Image */}
                  <div className="w-full h-64 flex flex-col justify-between p-3">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-950/70 backdrop-blur-sm text-white text-[9px] font-bold select-none self-start">
                      {[
                        '1. Full Shop Front View',
                        '2. Billing Counter / Seat View',
                        '3. Grocery Shelves Angle 1',
                        '4. Grocery Shelves Angle 2'
                      ][activeImageIdx]}
                    </span>

                    <img
                      src={getFullImageUrl([
                        selectedSeller.image_front,
                        selectedSeller.image_counter,
                        selectedSeller.image_inside1,
                        selectedSeller.image_inside2
                      ][activeImageIdx] || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>')}
                      alt={`Audit Shop Angle ${activeImageIdx + 1}`}
                      className="max-h-48 w-full object-contain mx-auto rounded-lg"
                    />

                    <div className="flex justify-center space-x-1.5 self-center">
                      {[0, 1, 2, 3].map(idx => (
                        <span
                          key={idx}
                          className={`w-2 h-2 rounded-full ${
                            activeImageIdx === idx ? 'bg-kirana-500 scale-110' : 'bg-slate-350'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Shop Parameters */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Working Hours</span>
                  <span className="font-bold text-slate-800">{selectedSeller.working_hours}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Shop Category</span>
                  <span className="font-bold text-slate-800">{selectedSeller.shop_category}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">GPS Pin (Lat, Lng)</span>
                  <span className="font-bold text-slate-700 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedSeller.latitude}, {selectedSeller.longitude}</span>
                  </span>
                </div>
              </div>

              {/* Leaflet Map Preview (Read-Only) */}
              <div className="space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                  Pinned Store Location Map
                </span>
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-40 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 z-10" 
                  style={{ minHeight: '150px' }}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Coordinates: {selectedSeller.latitude}, {selectedSeller.longitude}</span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedSeller.latitude},${selectedSeller.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 transition-colors"
                  >
                    Verify on Google Maps ↗
                  </a>
                </div>
              </div>

              {/* KYC Identity Details Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] text-slate-450 uppercase font-bold">KYC Identity Verification</span>
                  {sellerKyc && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded-full">
                      ✓ KYC Submitted
                    </span>
                  )}
                </div>

                {kycLoading ? (
                  <div className="text-center py-6 text-[10px] text-slate-400 animate-pulse">Loading KYC details...</div>
                ) : sellerKyc ? (
                  <div className="space-y-3">
                    {/* Identity row */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Owner Name</span>
                        <span className="font-bold text-slate-800">{sellerKyc.owner_full_name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Business Type</span>
                        <span className="font-bold text-slate-800">{sellerKyc.business_type}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Aadhaar (Masked)
                        </span>
                        <span className="font-bold text-slate-800 font-mono">{sellerKyc.aadhaar_masked || 'XXXX-XXXX-****'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">PAN Number</span>
                        <span className="font-bold text-slate-800 font-mono">{sellerKyc.pan_number}</span>
                      </div>
                      {sellerKyc.gst_number && (
                        <div className="col-span-2">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">GST Number</span>
                          <span className="font-bold text-slate-800 font-mono">{sellerKyc.gst_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Bank details */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs">
                      <p className="text-[9px] font-bold text-blue-500 uppercase mb-2 flex items-center gap-1">
                        <Banknote className="w-3 h-3" /> Bank Account
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Account No.</span>
                          <span className="font-bold text-slate-800 font-mono">{'*'.repeat(Math.max(0, (sellerKyc.bank_account_number || '').length - 4))}{(sellerKyc.bank_account_number || '').slice(-4)}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">IFSC</span>
                          <span className="font-bold text-slate-800 font-mono">{sellerKyc.bank_ifsc_code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Document photos */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">Aadhaar Photo</span>
                        {sellerKyc.aadhaar_image ? (
                          <div
                            className="relative h-24 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setExpandedKycImage('aadhaar')}
                          >
                            <img
                              src={getFullImageUrl(sellerKyc.aadhaar_image)}
                              alt="Aadhaar"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[8px] rounded">Tap to expand</span>
                          </div>
                        ) : (
                          <div className="h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
                            Not uploaded
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">PAN Card Photo</span>
                        {sellerKyc.pan_image ? (
                          <div
                            className="relative h-24 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setExpandedKycImage('pan')}
                          >
                            <img
                              src={getFullImageUrl(sellerKyc.pan_image)}
                              alt="PAN"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[8px] rounded">Tap to expand</span>
                          </div>
                        ) : (
                          <div className="h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Seller accepted the declaration of authenticity. Submitted: {new Date(sellerKyc.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-xs font-bold text-amber-700 mt-1">KYC Not Submitted</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">This seller has not submitted identity verification documents yet.</p>
                  </div>
                )}
              </div>

              {/* Rejection Note Form */}
              {showRejectForm ? (
                <div className="p-4 border border-crimson/20 bg-crimson/5 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Audit Comments (Reason for Rejection)</label>
                  <textarea
                    required
                    placeholder="e.g. Inside Shelves View is missing, or counter board is unreadable..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:border-kirana-500 focus:outline-none"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => handleVerifyStatus(selectedSeller.id, 'Rejected')}
                      disabled={actionLoading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-crimson text-white hover:bg-crimson/90"
                    >
                      {actionLoading ? 'Saving...' : 'Reject Merchant Application'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-3 border border-crimson/20 hover:border-crimson text-crimson text-xs font-bold hover:bg-crimson/5 rounded-xl transition-all"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleVerifyStatus(selectedSeller.id, 'Verified')}
                    disabled={actionLoading}
                    className="flex-[2] py-3 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Verify Shop</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* KYC Document Image Lightbox */}
      {expandedKycImage && sellerKyc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setExpandedKycImage(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-bold text-sm">
                {expandedKycImage === 'aadhaar' ? '🪪 Aadhaar Card' : '📄 PAN Card'}
              </span>
              <button
                onClick={() => setExpandedKycImage(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={getFullImageUrl(
                expandedKycImage === 'aadhaar' ? sellerKyc.aadhaar_image : sellerKyc.pan_image
              )}
              alt={expandedKycImage === 'aadhaar' ? 'Aadhaar Document' : 'PAN Document'}
              className="w-full max-h-[80vh] object-contain rounded-2xl border border-white/10"
            />
            <p className="text-center text-white/50 text-[10px] mt-3">Click outside to close</p>
          </div>
        </div>
      )}

      {/* Detailed Order Audit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 flex flex-col max-h-[95vh]">
            
            {/* Modal header */}
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] font-bold text-kirana-600 bg-kirana-50 px-2 py-0.5 rounded uppercase">Order Audit Logs</span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <span>Order #{selectedOrder.custom_order_id || selectedOrder.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${
                    selectedOrder.order_status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    selectedOrder.order_status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    selectedOrder.order_status === 'Ready For Pickup' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    selectedOrder.order_status === 'Packing Started' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    selectedOrder.order_status === 'PENDING_PAYMENT' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    'bg-slate-50 text-slate-700 border-slate-150'
                  }`}>
                    {selectedOrder.order_status === 'PENDING_PAYMENT' ? 'Pending Payment' : selectedOrder.order_status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Created at: {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setExpandedPaymentProof(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal scroll content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-slate-800 text-xs">
              
              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Customer End Profile */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-kirana-600" /> Customer Profile
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Name:</span> <span className="font-extrabold text-slate-900">{selectedOrder.customer_name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Phone:</span> <span className="font-bold text-slate-700">{selectedOrder.customer_phone || 'N/A'}</span></div>
                    {selectedOrder.customer_whatsapp && (
                      <div className="flex justify-between"><span className="text-slate-500 font-semibold">Whatsapp:</span> <span className="font-bold text-emerald-600">WA: {selectedOrder.customer_whatsapp}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Email:</span> <span className="font-bold text-slate-750">{selectedOrder.customer_email || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Trust Level:</span> <span className="font-extrabold text-slate-800">{selectedOrder.customer_level || 'Standard Customer'}</span></div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Trust Score:</span> 
                      <span className={`font-black ${
                        (selectedOrder.customer_trust_score || 100) < 50 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>{selectedOrder.customer_trust_score || 100}%</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Successful Pickups:</span> <span className="font-bold text-slate-700">{selectedOrder.customer_successful_pickups || 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Cancellations:</span> <span className="font-bold text-rose-600">{selectedOrder.customer_cancellations || 0}</span></div>
                    <div className="flex justify-between border-t border-slate-200/50 pt-1.5"><span className="text-slate-600 font-black">Total Orders Placed:</span> <span className="font-black text-slate-900">{selectedOrder.customer_total_orders || 0}</span></div>
                    <div className="flex flex-col border-t border-slate-200/50 pt-1.5"><span className="text-slate-500 font-semibold mb-0.5">Address:</span> <span className="font-bold text-slate-800 break-words">{selectedOrder.delivery_address || 'Pickup Order (No Delivery Address)'}</span></div>
                  </div>
                </div>

                {/* Seller End Profile */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-kirana-600" /> Seller Profile
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Shop Name:</span> <span className="font-extrabold text-slate-900">{selectedOrder.shop_name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Owner Name:</span> <span className="font-bold text-slate-850">{selectedOrder.seller_name || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Phone:</span> <span className="font-bold text-slate-700">{selectedOrder.seller_phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Whatsapp:</span> <span className="font-bold text-slate-705">{selectedOrder.seller_whatsapp || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Rating:</span> <span className="font-extrabold text-amber-500">★ {selectedOrder.shop_rating || '4.0'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-550 font-semibold">Warning Status:</span> <span className={`font-extrabold ${selectedOrder.shop_warning_level !== 'None' ? 'text-rose-600' : 'text-slate-750'}`}>{selectedOrder.shop_warning_level || 'None'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Verification:</span> <span className="font-bold text-slate-700">{selectedOrder.shop_verification_status || 'Verified'}</span></div>
                    <div className="flex justify-between border-t border-slate-200/50 pt-1.5"><span className="text-slate-600 font-black">Completed Orders:</span> <span className="font-black text-slate-900">{selectedOrder.seller_total_completed_orders || 0} (Cancelled: {selectedOrder.seller_total_cancelled_orders || 0})</span></div>
                    <div className="flex flex-col border-t border-slate-200/50 pt-1.5"><span className="text-slate-500 font-semibold mb-0.5">Shop Address:</span> <span className="font-bold text-slate-800 break-words">{selectedOrder.shop_address || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              {/* Status Timeline Progress */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4 text-left">
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-kirana-600" /> Transaction Timeline
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">1. Ordered</span>
                    <span className="font-bold text-slate-800">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                  </div>
                  {selectedOrder.accepted_at && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase">2. Accepted by Shop</span>
                      <span className="font-bold text-slate-800">{new Date(selectedOrder.accepted_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.packing_started_at && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase">3. Packing Started</span>
                      <span className="font-bold text-slate-800">{new Date(selectedOrder.packing_started_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.ready_for_pickup_at && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase">4. Ready for Pickup/Delivery</span>
                      <span className="font-bold text-slate-800">{new Date(selectedOrder.ready_for_pickup_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.confirmed_at && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase">5. Confirmed by Customer</span>
                      <span className="font-bold text-slate-800">{new Date(selectedOrder.confirmed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="block text-[8px] text-emerald-500 font-bold uppercase">6. Delivered / Completed</span>
                      <span className="font-extrabold text-emerald-800">{new Date(selectedOrder.delivered_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.cancelled_at && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                      <span className="block text-[8px] text-rose-505 font-bold uppercase">Order Cancelled</span>
                      <span className="font-extrabold text-rose-800">{new Date(selectedOrder.cancelled_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fulfillment & Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                
                {/* Fulfillment */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-kirana-600" /> Fulfillment Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Method:</span> 
                      <span className="font-extrabold text-slate-900 capitalize">{selectedOrder.fulfillment_method}</span>
                    </div>
                    {selectedOrder.fulfillment_method === 'Delivery' ? (
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div><strong className="text-slate-500 font-bold">Address:</strong> {selectedOrder.delivery_address || 'N/A'}</div>
                        <div><strong className="text-slate-500 font-bold">Landmark:</strong> {selectedOrder.delivery_landmark || 'N/A'}</div>
                        <div><strong className="text-slate-500 font-bold">Delivery Phone:</strong> {selectedOrder.delivery_phone || 'N/A'}</div>
                        {selectedOrder.delivery_latitude && (
                          <div className="flex justify-between border-t border-slate-200/50 pt-1.5">
                            <strong className="text-slate-500 font-bold">GPS Coordinates:</strong>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.delivery_latitude},${selectedOrder.delivery_longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-750 font-bold"
                            >
                              📍 {selectedOrder.delivery_latitude}, {selectedOrder.delivery_longitude} (View Maps ↗)
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 font-medium">Customer will pick up from store. Shop address: <span className="text-slate-800 font-bold">{selectedOrder.shop_address}</span></div>
                    )}
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-kirana-600" /> Payment & Settlement
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Payment Method:</span>
                      <span className="font-extrabold text-slate-900">{selectedOrder.payment_method || 'None selected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Payment Status:</span>
                      <span className={`font-extrabold ${
                        selectedOrder.payment_status === 'Paid' ? 'text-emerald-700' : 'text-amber-600'
                      }`}>{selectedOrder.payment_status}</span>
                    </div>
                    {selectedOrder.payment_utr && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Reference UTR:</span>
                        <span className="font-bold text-slate-800 font-mono select-all">{selectedOrder.payment_utr}</span>
                      </div>
                    )}
                    
                    {/* Payment Proof thumbnail */}
                    {selectedOrder.payment_proof_image && (
                      <div className="border-t border-slate-200/50 pt-2 flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-[10px] text-slate-450 uppercase font-bold">Screenshot Proof</span>
                          <span className="text-[10px] text-slate-400 font-medium">Uploaded by customer</span>
                        </div>
                        <div 
                          className="w-16 h-16 border rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-slate-100 flex-shrink-0"
                          onClick={() => setExpandedPaymentProof(selectedOrder.payment_proof_image)}
                        >
                          <img 
                            src={getFullImageUrl(selectedOrder.payment_proof_image)} 
                            alt="Payment Proof" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Order Items & Grocery Details */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4 text-left">
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-kirana-600" /> Grocery List & Items Audit
                </h4>

                {selectedOrder.order_type === 'digital' || selectedOrder.modified_item_list ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original requested list */}
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs border-b pb-1.5">1. Customer Requested List</h5>
                      {(() => {
                        let originalItems = [];
                        try {
                          originalItems = typeof selectedOrder.digital_item_list === 'string'
                            ? JSON.parse(selectedOrder.digital_item_list)
                            : selectedOrder.digital_item_list || [];
                        } catch (e) {}

                        if (originalItems.length === 0) {
                          return <p className="text-[10px] text-slate-400 italic">No digital items requested (handwritten chitti order).</p>;
                        }

                        return (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {originalItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50">
                                <span className="font-bold text-slate-800">{item.name || item.itemName}</span>
                                <span className="text-slate-555 font-semibold">{item.quantity} {item.unit || 'unit'}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Final modified / billed list */}
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs border-b pb-1.5">2. Seller Modified / Billed Invoice</h5>
                      {(() => {
                        let modifiedItems = [];
                        try {
                          modifiedItems = typeof selectedOrder.modified_item_list === 'string'
                            ? JSON.parse(selectedOrder.modified_item_list)
                            : selectedOrder.modified_item_list || [];
                        } catch (e) {}

                        if (modifiedItems.length === 0) {
                          return <p className="text-[10px] text-slate-400 italic">No final invoice uploaded yet.</p>;
                        }

                        return (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {modifiedItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50">
                                <span className="font-bold text-slate-800">{item.name || item.itemName} {item.isRemoved && <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded uppercase font-bold">Removed</span>}</span>
                                <span className="font-extrabold text-slate-900">
                                  {item.isRemoved ? '—' : `₹${((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1)).toFixed(2)} (${item.quantity} ${item.unit || 'unit'})`}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center text-xs font-black border-t pt-2 text-slate-900">
                              <span>Grand Total:</span>
                              <span>₹{parseFloat(selectedOrder.amount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Handwritten Chitti Order Comparison */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Handwritten chitti */}
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs border-b pb-1.5">1. Original Handwritten Chitti</h5>
                      {selectedOrder.original_chitti ? (
                        <div className="h-48 border rounded-xl overflow-hidden bg-slate-55 bg-slate-50 flex items-center justify-center">
                          <img 
                            src={getFullImageUrl(selectedOrder.original_chitti)} 
                            alt="Original Chitti" 
                            className="h-full w-full object-contain cursor-pointer"
                            onClick={() => setExpandedPaymentProof(selectedOrder.original_chitti)}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No original chitti image uploaded.</p>
                      )}
                    </div>

                    {/* Rewritten bill / modified bill */}
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs border-b pb-1.5">2. Seller's Billed Sheet</h5>
                      {selectedOrder.modified_bill ? (
                        <div className="h-48 border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                          <img 
                            src={getFullImageUrl(selectedOrder.modified_bill)} 
                            alt="Modified Bill" 
                            className="h-full w-full object-contain cursor-pointer"
                            onClick={() => setExpandedPaymentProof(selectedOrder.modified_bill)}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No billed sheet uploaded yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Modification Revisions History */}
              {selectedOrder.item_change_history && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 text-left">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    📝 Customer Revision Requests
                  </h4>
                  {(() => {
                    let history = {};
                    try {
                      history = typeof selectedOrder.item_change_history === 'string'
                        ? JSON.parse(selectedOrder.item_change_history)
                        : selectedOrder.item_change_history || {};
                    } catch (e) {}

                    return (
                      <div className="bg-white border rounded-xl p-3 text-slate-705 text-xs">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(history.tags || []).map((tag, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-750 border border-blue-100 rounded-full px-2 py-0.5 text-[9px] font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="italic text-slate-655">"{history.requested_changes || 'None specified'}"</p>
                        <span className="block text-[9px] text-slate-400 mt-2">Revision count: {history.revision_count || 1}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes or Cancellation Reason */}
              {selectedOrder.notes && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs text-left">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Audit Notes / Comments</span>
                  <p className="font-semibold text-slate-700 bg-white p-3 border rounded-xl italic">"{selectedOrder.notes}"</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* User Location Map Modal */}
      {selectedUserForMap && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedUserForMap(null)}
        >
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full text-slate-800 shadow-premium" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span>{selectedUserForMap.name}'s Location</span>
                </h3>
                <p className="text-xs text-slate-500 capitalize">{selectedUserForMap.role} Location Details</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUserForMap(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Recorded Address</span>
                <p className="font-bold text-slate-800 text-sm">{selectedUserForMap.location?.address || 'No address recorded'}</p>
                {selectedUserForMap.shop_name && (
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">Shop: {selectedUserForMap.shop_name}</p>
                )}
              </div>

              {selectedUserForMap.location?.latitude && selectedUserForMap.location?.longitude ? (
                <>
                  {/* Read-Only Leaflet Map Container */}
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      GPS Coordinates Preview
                    </span>
                    <div 
                      className="w-full h-52 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 relative" 
                      style={{ minHeight: '200px' }}
                    >
                      <div id="user-location-map" className="w-full h-full z-10" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2">
                    <span className="font-mono text-slate-500">Lat: {selectedUserForMap.location.latitude}, Lng: {selectedUserForMap.location.longitude}</span>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedUserForMap.location.latitude},${selectedUserForMap.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-all flex items-center gap-1"
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-355 mx-auto mb-2" />
                  No GPS coordinates captured for this profile.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded payment proof image modal */}
      {expandedPaymentProof && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setExpandedPaymentProof(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-bold text-sm">Image Preview</span>
              <button 
                type="button"
                onClick={() => setExpandedPaymentProof(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img 
              src={getFullImageUrl(expandedPaymentProof)} 
              alt="Expanded Proof" 
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-white/10"
            />
            <p className="text-center text-white/50 text-[10px] mt-3">Click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
