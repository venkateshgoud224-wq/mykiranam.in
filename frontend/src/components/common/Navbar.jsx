import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useGeolocation, FALLBACK_MARKETS } from '../../hooks/useGeolocation';
import { LogOut, Bell, MapPin, Store, User, CheckCircle2, AlertCircle } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

const Navbar = ({ onSetCoords, currentCoords }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // GPS diagnostics local state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS Geolocation is not supported by your browser, or is blocked on insecure HTTP connections. Please use a secure HTTPS link.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSetCoords(pos.coords.latitude, pos.coords.longitude, 'My Real Coordinates');
        setShowLocationModal(false);
        setGpsLoading(false);
      },
      (err) => {
        console.error("GPS error callback triggered:", err);
        let msg = "Could not fetch GPS coordinates.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser/device settings.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please check your GPS connection or network settings.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please try again in an area with better signal.";
        }
        
        // Add insecure origin diagnostic note
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          msg += " (Note: Geolocation requires HTTPS to operate on mobile devices).";
        }

        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const isFallbackMarket = currentCoords && FALLBACK_MARKETS.some(
    (m) => Math.abs(currentCoords.latitude - m.latitude) < 0.0001
  );

  return (
    <>
      <header className="z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm safe-top">
        {/* Container is flex flex-col on mobile, sm:flex-row on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:py-0 sm:h-16 mx-auto max-w-7xl gap-2.5 sm:gap-0">
          
          {/* ROW 1 (Mobile logo and controls grouped) */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            {/* Brand Logo */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-kirana-500 text-white shadow-premium">
                <Store className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  Kiranam<span className="text-kirana-500">.in</span>
                </span>
                <div className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-slate-400 -mt-1">
                  Hyperlocal Queue Engine
                </div>
              </div>
            </div>

            {/* Mobile Utilities (Notifications and Red Logout Button) */}
            <div className="flex items-center space-x-1.5 sm:hidden">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-655 hover:text-slate-950 rounded-xl hover:bg-slate-50 transition-all"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-crimson text-[8px] font-bold text-white ring-2 ring-white animate-pulse-ring">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationsDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>
              )}

              {user && (
                <button
                  onClick={logout}
                  className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-xl transition-all border border-rose-100/50 flex items-center justify-center shadow-sm"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ROW 2 (Mobile location) / Desktop Middle Area */}
          {user && user.role === 'customer' && currentCoords && (
            <div className="w-full sm:w-auto flex justify-center sm:justify-start">
              <button
                onClick={() => {
                  setGpsError(null);
                  setGpsLoading(false);
                  setShowLocationModal(!showLocationModal);
                }}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start space-x-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 hover:border-slate-200 transition-all shadow-sm max-w-full sm:max-w-xs md:max-w-sm"
                title="Change simulated location"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-kirana-500 flex-shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
                  <span className="truncate text-slate-800 font-bold text-left">{currentCoords.address || 'Pick Location'}</span>
                </div>
                <span className="text-[9px] text-kirana-700 font-extrabold bg-kirana-100/60 px-1.5 py-0.5 rounded-md flex-shrink-0 border border-kirana-200/50">Change</span>
              </button>
            </div>
          )}

          {/* Desktop Controls (Notifications & Premium Rose Logout Badge) */}
          <div className="hidden sm:flex items-center space-x-3">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-600 hover:text-slate-950 rounded-xl hover:bg-slate-50 transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5.5 h-5.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-crimson text-[9px] font-bold text-white ring-2 ring-white animate-pulse-ring">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationsDropdown onClose={() => setShowNotifications(false)} />
                )}
              </div>
            )}

            {user && (
              <div className="flex items-center space-x-2.5">
                <span className="hidden md:inline text-xs font-bold text-slate-500">
                  Hi, {user.name} ({user.role})
                </span>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-xl transition-all border border-rose-100/50 font-bold text-xs shadow-sm"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Geolocation selector overlay modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 space-y-4 my-8">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-kirana-50 flex items-center justify-center text-kirana-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Choose Location</h3>
                <p className="text-[10px] text-slate-400">Select simulated Bangalore market coordinates</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Select one of the major commercial kirana hubs in Bangalore to see distance and queue updates change dynamically:
            </p>

            {/* Currently Active Location Card */}
            {currentCoords && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !isFallbackMarket 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md animate-pulse' 
                      : 'bg-kirana-100 text-kirana-700'
                  }`}>
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Active Location</span>
                    <span className="block text-xs font-bold text-slate-800 truncate leading-tight">
                      {currentCoords.address || 'Custom Coordinates'}
                    </span>
                    <span className="block text-[8px] text-slate-450 font-semibold mt-0.5">
                      Lat: {Number(currentCoords.latitude).toFixed(5)} • Lng: {Number(currentCoords.longitude).toFixed(5)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0 pl-2">
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider ${
                    !isFallbackMarket 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50' 
                      : 'bg-kirana-100 text-kirana-800 border border-kirana-200/50'
                  }`}>
                    {!isFallbackMarket ? 'Live GPS' : 'Simulated'}
                  </span>
                </div>
              </div>
            )}

            {gpsError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs font-semibold leading-normal animate-shake">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}

            <div className="space-y-1.5 max-h-36 sm:max-h-48 overflow-y-auto pr-1">
              {FALLBACK_MARKETS.map((m, idx) => {
                const isSelected = currentCoords && Math.abs(currentCoords.latitude - m.latitude) < 0.0001;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSetCoords(m.latitude, m.longitude, m.name);
                      setShowLocationModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 text-xs rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-kirana-500 bg-kirana-50/50 text-kirana-950 font-bold'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-kirana-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleGPSLocation}
                disabled={gpsLoading}
                className="w-full py-3 sm:py-2.5 bg-slate-100 disabled:bg-slate-50 border border-slate-200/60 hover:bg-slate-200 text-slate-700 disabled:text-slate-400 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center space-x-2"
              >
                {gpsLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Acquiring GPS...</span>
                  </>
                ) : (
                  <span>Use GPS Geolocation</span>
                )}
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full px-5 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition-all text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
