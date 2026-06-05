import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Store, Layers, Bell, CheckSquare, RefreshCw, Clock, ShieldAlert, FileWarning, Award } from 'lucide-react';
import NewOrders from './NewOrders';
import ActiveOrders from './ActiveOrders';
import CompletedOrders from './CompletedOrders';
import SelfVerification from './SelfVerification';

const SellerDashboard = ({ activeTab, onTabChange }) => {
  const { token, apiUrl, extraData, refreshProfile } = useAuth();
  const { socket } = useSocket();
  
  // Orders list state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchStoreOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching store orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch orders if shop is verified
    if (extraData.shop && extraData.shop.verification_status === 'Verified') {
      fetchStoreOrders();
    } else {
      setLoading(false);
    }
  }, [extraData.shop?.verification_status]);

  // Sync Socket events
  useEffect(() => {
    if (!socket || !extraData.shop || extraData.shop.verification_status !== 'Verified') return;

    const handleOrderUpdate = () => {
      fetchStoreOrders();
      refreshProfile();
    };

    socket.on('new_order', handleOrderUpdate);
    socket.on('order_status_updated', handleOrderUpdate);

    return () => {
      socket.off('new_order', handleOrderUpdate);
      socket.off('order_status_updated', handleOrderUpdate);
    };
  }, [socket, extraData.shop?.verification_status]);

  // Status patch
  const handleUpdateStatus = async (orderId, newStatus, reason = '') => {
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          reason
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update order status.');
      
      fetchStoreOrders();
      refreshProfile();
    } catch (err) {
      alert(err.message || 'Error updating status.');
      throw err;
    }
  };

  if (!extraData.shop) {
    return (
      <div className="py-12 text-center max-w-md mx-auto text-xs font-bold text-slate-400">
        Syncing store profile credentials...
      </div>
    );
  }

  const { verification_status } = extraData.shop;

  // --- UNVERIFIED MERCHANT WORKFLOW RENDERING ---
  if (verification_status !== 'Verified') {
    return (
      <div className="space-y-6">
        
        {/* Under Review Warning */}
        {verification_status === 'Under Review' && (
          <div className="max-w-md mx-auto bg-white border border-slate-100 p-8 rounded-3xl text-center space-y-4 shadow-premium">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              ⏳
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Verification Application Pending</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your uploaded 5 mandatory shop images and store parameters are currently **Under Review** by the Kiranam admin panel.
            </p>
            <p className="text-[10px] text-slate-400 italic">
              Unverified shops remain hidden from customer searches and cannot receive orders. We will notify you once approved.
            </p>
            <button
              onClick={refreshProfile}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Refresh Status
            </button>
          </div>
        )}

        {/* Suspended Warning */}
        {verification_status === 'Suspended' && (
          <div className="max-w-md mx-auto bg-white border border-crimson/20 p-8 rounded-3xl text-center space-y-4 shadow-premium">
            <div className="w-16 h-16 bg-crimson/10 text-crimson rounded-full flex items-center justify-center mx-auto">
              🚨
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Store Profile Suspended</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your merchant directory access has been suspended by administration.
            </p>
            <p className="text-[10px] text-slate-400">
              Please contact help@mykiranam.in to audit verification logs or resolve disputes.
            </p>
          </div>
        )}

        {/* Pending & Rejected Application workflows */}
        {(verification_status === 'Pending' || verification_status === 'Rejected') && (
          <div className="space-y-4">
            {verification_status === 'Rejected' && (
              <div className="p-4 bg-crimson/10 border border-crimson/20 rounded-2xl flex items-start space-x-3 text-xs text-crimson max-w-md mx-auto text-left">
                <FileWarning className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Application Rejected by Admin:</strong>
                  <p className="mt-1">Please review the checklist, verify your mobile OTP, re-upload the 5 mandatory pictures, and resubmit.</p>
                </div>
              </div>
            )}
            <SelfVerification onVerifySubmitted={refreshProfile} />
          </div>
        )}

      </div>
    );
  }

  // --- VERIFIED WORKFLOW BOARDS ---
  const freshOrders = orders.filter(o => o.order_status === 'Waiting For Seller' && !o.item_change_history);
  const revisionOrders = orders.filter(o => o.order_status === 'Waiting For Seller' && !!o.item_change_history);
  const activeQueue = orders.filter(o => [
    'Accepted',
    'Bill Uploaded',
    'Waiting For Customer Confirmation',
    'Confirmed',
    'Packing Started',
    'Packing Completed',
    'Ready For Pickup'
  ].includes(o.order_status));
  const completedHistory = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.order_status));

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'seller-new':
        return <NewOrders newOrders={freshOrders} onUpdateStatus={handleUpdateStatus} onTabChange={onTabChange} />;
      case 'seller-revisions':
        return <NewOrders newOrders={revisionOrders} onUpdateStatus={handleUpdateStatus} onTabChange={onTabChange} />;
      case 'seller-active':
        return <ActiveOrders activeOrders={activeQueue} onUpdateStatus={handleUpdateStatus} />;
      case 'seller-completed':
        return <CompletedOrders completedOrders={completedHistory} />;
      default:
        return <ActiveOrders activeOrders={activeQueue} onUpdateStatus={handleUpdateStatus} />;
    }
  };

  const getShopBadgeColor = (status) => {
    if (status === 'Available') return 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20';
    if (status === 'Busy') return 'bg-accent-amber/10 text-accent-amber border-accent-amber/20';
    return 'bg-slate-200 text-slate-500';
  };

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Store Header */}
      {extraData.shop && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
              <span>🏪 {extraData.shop.shop_name}</span>
              <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded text-[8px] font-bold">Verified</span>
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
              <span className={`px-2 py-0.5 rounded font-bold border ${getShopBadgeColor(extraData.shop.availability_status)}`}>
                {extraData.shop.availability_status}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-bold flex items-center">
                <Clock className="w-3 h-3 mr-0.5 text-slate-400" />
                Wait: {extraData.shop.waiting_time}m
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-bold">Queue: {extraData.shop.active_orders}/{extraData.shop.max_active_orders}</span>
            </div>
          </div>
          <button
            onClick={() => { fetchStoreOrders(); refreshProfile(); }}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-655 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full mx-auto overflow-hidden">
        <button
          onClick={() => onTabChange('seller-new')}
          className={`flex-1 py-2.5 px-1 text-center text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:space-x-1 ${
            activeTab === 'seller-new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-750'
          }`}
        >
          <Bell className="w-3.5 h-3.5 hidden sm:block" />
          <span className="truncate">New</span>
          {freshOrders.length > 0 && (
            <span className="px-2 py-0.5 bg-kirana-500 text-slate-950 text-[10px] font-black rounded-full leading-none">
              {freshOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('seller-active')}
          className={`flex-1 py-2.5 px-1 text-center text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:space-x-1 ${
            activeTab === 'seller-active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <Layers className="w-3.5 h-3.5 hidden sm:block" />
          <span className="truncate">Active</span>
          {activeQueue.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-full leading-none">
              {activeQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('seller-revisions')}
          className={`flex-1 py-2.5 px-1 text-center text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:space-x-1 ${
            activeTab === 'seller-revisions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <span className="text-sm hidden sm:block">⚠️</span>
          <span className="truncate">Revisions</span>
          {revisionOrders.length > 0 && (
            <span className="px-2 py-0.5 bg-crimson text-white text-[10px] font-black rounded-full leading-none">
              {revisionOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('seller-completed')}
          className={`flex-1 py-2.5 px-1 text-center text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1 sm:space-x-1 ${
            activeTab === 'seller-completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-755'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 hidden sm:block" />
          <span className="truncate">Completed</span>
        </button>

      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Refreshing orders list...
        </div>
      ) : (
        renderActiveTabContent()
      )}
    </div>
  );
};

export default SellerDashboard;
