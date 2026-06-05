import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, UserCheck, Eye, Trash2, EyeOff, AlertOctagon, User, Store, Layers, X, Check, MapPin, ChevronLeft, ChevronRight, Play, Square, RefreshCcw, Activity, AlertCircle } from 'lucide-react';
import ComplaintsManagement from '../../components/admin/ComplaintsManagement';

const AdminDashboard = () => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();
  const [sellers, setSellers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // analytics | review | verified | logs | trust | complaints
  // Modal states
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [notes, setNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);


  const fetchSellers = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

  useEffect(() => {
    fetchSellers();
    fetchAnalytics();
    fetchTrustData();

    // Set up polling every 3 seconds while on dashboard
    const interval = setInterval(() => {
      fetchSellers(); // Refresh store metrics live too!
      fetchAnalytics();
      fetchTrustData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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


  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  // Group applications
  const pendingApps = sellers.filter(s => s.verification_status === 'Under Review');
  const verifiedList = sellers.filter(s => s.verification_status === 'Verified');
  const logsHistory = sellers.filter(s => ['Rejected', 'Suspended'].includes(s.verification_status));

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
      {loading && activeSubTab !== 'analytics' ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Retrieving merchant applications directory...
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
                  <p className="text-xs text-slate-500 mt-1">Owner: {seller.owner_name} • Category: {seller.shop_category}</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] sm:max-w-md truncate">📍 Address: {seller.address}</p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedSeller(seller);
                    setActiveImageIdx(0);
                    setShowRejectForm(false);
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

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">High Risk Customers</h3>
              <div className="space-y-3 h-64 overflow-y-auto pr-2">
                {trustData?.highRiskCustomers?.length > 0 ? trustData.highRiskCustomers.map(cust => (
                  <div key={cust.id} className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-black flex items-center justify-center text-xs">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800">{cust.name} ({cust.phone})</span>
                      <span className="block text-[9px] text-slate-600">Trust Score: {cust.trust_score} • Cancels: {cust.cancellations}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-xs text-slate-400 py-10">No high risk customers</div>
                )}
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
                  <p className="text-xs text-slate-500 mt-1">Owner: {seller.owner_name} • Phone: {seller.owner_phone}</p>
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
                <p className="text-xs text-slate-455">Owner name: {selectedSeller.owner_name} • Tel: {selectedSeller.owner_phone}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSeller(null);
                  setShowRejectForm(false);
                  setNotes('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal scroll content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Mandatory 5 image carousel */}
              <div>
                <span className="block text-[10px] text-slate-450 uppercase font-bold mb-1.5">
                  Mandatory Shop Image Review (Slide to audit all 5)
                </span>
                
                {/* Carousel Viewer */}
                <div className="relative border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center">
                  
                  {/* Slider controls */}
                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === 0 ? 4 : prev - 1))}
                    className="absolute left-2.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveImageIdx(prev => (prev === 4 ? 0 : prev + 1))}
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
                        '4. Grocery Shelves Angle 2',
                        '5. Additional Angle / Inside Store'
                      ][activeImageIdx]}
                    </span>

                    <img
                      src={getFullImageUrl([
                        selectedSeller.image_front,
                        selectedSeller.image_counter,
                        selectedSeller.image_inside1,
                        selectedSeller.image_inside2,
                        selectedSeller.image_additional
                      ][activeImageIdx] || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>')}
                      alt={`Audit Shop Angle ${activeImageIdx + 1}`}
                      className="max-h-48 w-full object-contain mx-auto rounded-lg"
                    />

                    <div className="flex justify-center space-x-1.5 self-center">
                      {[0, 1, 2, 3, 4].map(idx => (
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
    </div>
  );
};

export default AdminDashboard;
