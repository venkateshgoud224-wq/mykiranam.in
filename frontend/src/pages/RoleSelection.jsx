import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, ArrowRight, ShoppingBag, ShieldAlert } from 'lucide-react';

const RoleSelection = () => {
  const { updateRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRole = async (selectedRole) => {
    setLoading(true);
    setError('');

    let locationData = {};

    if (selectedRole === 'seller' && 'geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        const { latitude, longitude } = position.coords;
        locationData = { latitude, longitude };
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            locationData.address = data.display_name || 'Location based on GPS';
          }
        } catch (e) {
          console.warn('Reverse geocoding failed', e);
        }
      } catch (geoErr) {
        console.warn('Geolocation failed or denied:', geoErr);
      }
    }

    try {
      await updateRole(selectedRole, locationData);
    } catch (err) {
      setError(err.message || 'Failed to assign role. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-y-auto py-8">
      {/* Background decoration */}
      <div className="absolute top-[10%] right-[10%] w-96 h-96 rounded-full bg-kirana-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-96 h-96 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl text-center space-y-6 sm:space-y-8 z-10 py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-kirana-500 text-slate-950 flex items-center justify-center font-black">
              🏪
            </div>
            <span className="font-extrabold text-lg">mykiranam.in</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            How will you use Kiranam?
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Choose your workspace role to begin testing the hyperlocal queue workflow platform.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold max-w-md mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Card 1: Customer */}
          <button
            onClick={() => handleSelectRole('customer')}
            disabled={loading}
            className="group relative flex flex-col justify-between p-6 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-kirana-500 rounded-3xl text-left transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-kirana-500 group-hover:text-slate-950 flex items-center justify-center text-slate-400 transition-all shadow-md">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white group-hover:text-kirana-400 transition-all">
                  Customer App
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Snap grocery lists, order online, monitor waiting queues, verify manual bills, and pick up pre-packed items.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 mt-8 text-xs font-bold text-slate-400 group-hover:text-kirana-400 transition-all">
              <span>Enter Customer</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Card 2: Seller */}
          <button
            onClick={() => handleSelectRole('seller')}
            disabled={loading}
            className="group relative flex flex-col justify-between p-6 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-kirana-500 rounded-3xl text-left transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-kirana-500 group-hover:text-slate-950 flex items-center justify-center text-slate-400 transition-all shadow-md">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white group-hover:text-kirana-400 transition-all">
                  Store Dashboard
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Complete self-verification uploads, verify phone via OTP, manage active queues, and compile rewritten bills.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 mt-8 text-xs font-bold text-slate-400 group-hover:text-kirana-400 transition-all">
              <span>Enter Store Owner</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {loading && (
          <p className="text-xs font-semibold text-kirana-500 animate-pulse">
            Configuring workspace layout, please wait...
          </p>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
