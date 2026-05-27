import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, UserCheck, Eye, Trash2, EyeOff, AlertOctagon, User, Store, Layers, X, Check, MapPin, ChevronLeft, ChevronRight, Play, Square, RefreshCcw, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('review'); // review | verified | logs  
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

  useEffect(() => {
    fetchSellers();

    // Set up polling every 3 seconds while on dashboard
    const interval = setInterval(() => {
      fetchSellers(); // Refresh store metrics live too!
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
      <div className="flex bg-slate-105 bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-lg mx-auto">
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
      </div>

      {/* Render applications lists */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Retrieving merchant applications directory...
        </div>
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
