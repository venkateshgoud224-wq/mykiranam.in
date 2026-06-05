import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Clock, Wallet, Award, Store } from 'lucide-react';

const SavingsDashboard = () => {
  const { apiUrl, token } = useAuth();
  const [savingsData, setSavingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        const res = await fetch(`${apiUrl}/savings/customer`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavingsData(data);
        }
      } catch (err) {
        console.error('Error fetching savings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavings();
  }, [apiUrl, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-kirana-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { savings, badges, favoriteShopName } = savingsData || { savings: {}, badges: [], favoriteShopName: 'None' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-kirana-500 to-kirana-600 rounded-2xl p-6 text-slate-900 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-2">Your Lifetime Value</h1>
          <p className="text-sm font-semibold opacity-90">Thank you for being part of the MyKiranam community.</p>
        </div>
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Trophy className="w-32 h-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Money Saved</p>
            <p className="text-2xl font-black text-slate-900">₹{savings?.total_savings || '0.00'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Time Saved</p>
            <p className="text-2xl font-black text-slate-900">
              {savings?.total_time_saved ? Math.floor(savings.total_time_saved / 60) : 0}h {savings?.total_time_saved ? savings.total_time_saved % 60 : 0}m
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Favorite Shop</p>
            <p className="text-lg font-bold text-slate-900 line-clamp-1">{favoriteShopName}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-kirana-500" />
            Your Achievements
          </h2>
        </div>
        <div className="p-4">
          {badges && badges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 flex items-start space-x-3 bg-gradient-to-br from-white to-slate-50">
                  <div className="w-10 h-10 rounded-full bg-kirana-100 text-kirana-600 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{badge.badge_name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-2">
                      Earned: {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No achievements yet. Keep ordering to earn badges!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsDashboard;
