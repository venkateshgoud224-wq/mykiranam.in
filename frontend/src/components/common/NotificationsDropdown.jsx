import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { BellRing, Check, Trash2, X, ShoppingBag, XCircle, FileSpreadsheet } from 'lucide-react';

const NotificationsDropdown = ({ onClose }) => {
  const { notifications, unreadCount, markAllAsRead, clearNotifications, markAsRead, playSoundAlert } = useSocket();

  const getIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <ShoppingBag className="w-4 h-4 text-amber-500" />;
      case 'order_cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'bill_uploaded':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      default:
        return <BellRing className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-[90vw] sm:w-[450px] bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all">
      {/* Dropdown Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 gap-3 sm:gap-0">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg text-slate-800 whitespace-nowrap">Alert Center</span>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 text-sm font-bold bg-amber-500 text-white rounded-full whitespace-nowrap">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
          <button
            onClick={() => playSoundAlert('new_order')}
            className="px-2.5 py-1.5 text-sm font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5"
            title="Test sound chime"
          >
            <span>🔊</span> Test Chime
          </button>
          <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-all"
                title="Mark all as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-red-500 transition-all"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Scroll */}
      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <BellRing className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">All caught up!</p>
            <p className="text-xs text-slate-400">No active alerts at the moment.</p>
          </div>
        ) : (
          notifications.map((notif, idx) => (
            <div
              key={idx}
              onClick={() => !notif.read_status && markAsRead(notif.id)}
              className={`flex items-start space-x-3 p-3.5 transition-all cursor-pointer hover:bg-slate-50 ${
                !notif.read_status ? 'bg-amber-50/20 font-medium' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-800 block mb-0.5">{notif.title || 'Update'}</span>
                <p className="text-sm text-slate-600 leading-normal break-words">{notif.message}</p>
                <span className="text-[10px] text-slate-400 block mt-1.5">
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!notif.read_status && (
                <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-2"></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsDropdown;
