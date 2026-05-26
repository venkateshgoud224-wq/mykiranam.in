import React from 'react';
import { Store, ShoppingBag, User, Settings, Layers, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BottomNavigation = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();

  if (!user || user.role === 'pending') return null;

  const renderCustomerTabs = () => (
    <>
      <button
        onClick={() => onTabChange('shops')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'shops'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <Store className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'shops' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Nearby Shops
        </span>
      </button>

      <button
        onClick={() => onTabChange('orders')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'orders'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <ShoppingBag className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'orders' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          My Orders
        </span>
      </button>

      <button
        onClick={() => onTabChange('profile')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'profile'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <User className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'profile' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Profile
        </span>
      </button>
    </>
  );

  const renderSellerTabs = () => (
    <>
      <button
        onClick={() => onTabChange('seller-active')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'seller-active' || ['seller-new', 'seller-completed'].includes(activeTab)
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <Layers className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'seller-active' || ['seller-new', 'seller-completed'].includes(activeTab)
            ? 'text-slate-900 font-black'
            : 'text-slate-400'
        }`}>
          Active Queue
        </span>
      </button>

      <button
        onClick={() => onTabChange('seller-settings')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'seller-settings'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <Settings className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'seller-settings' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Store Config
        </span>
      </button>

      <button
        onClick={() => onTabChange('profile')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'profile'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <User className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'profile' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Profile
        </span>
      </button>
    </>
  );

  const renderAdminTabs = () => (
    <>
      <button
        onClick={() => onTabChange('admin-sellers')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'admin-sellers'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <ShieldAlert className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'admin-sellers' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Applications
        </span>
      </button>

      <button
        onClick={() => onTabChange('profile')}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all outline-none"
      >
        <div className={`transition-all duration-300 rounded-xl flex items-center justify-center w-8 h-8 ${
          activeTab === 'profile'
            ? 'bg-kirana-500 text-slate-950 shadow-sm scale-110'
            : 'text-slate-400 hover:text-slate-600'
        }`}>
          <User className="w-4.5 h-4.5" />
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-all duration-300 ${
          activeTab === 'profile' ? 'text-slate-900 font-black' : 'text-slate-400'
        }`}>
          Profile
        </span>
      </button>
    </>
  );

  const renderContent = () => {
    if (user.role === 'customer') return renderCustomerTabs();
    if (user.role === 'seller') return renderSellerTabs();
    if (user.role === 'admin') return renderAdminTabs();
    return null;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-slate-100 shadow-lg md:hidden safe-bottom">
      <div className="flex items-center justify-around h-full max-w-md mx-auto">
        {renderContent()}
      </div>
    </nav>
  );
};

export default BottomNavigation;
