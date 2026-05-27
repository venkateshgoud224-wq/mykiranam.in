import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useGeolocation } from './hooks/useGeolocation';
import Home from './pages/Home';
import RoleSelection from './pages/RoleSelection';
import NearbyShops from './pages/customer/NearbyShops';
import InstantOrder from './pages/customer/InstantOrder';
import MyOrders from './pages/customer/MyOrders';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerSettings from './pages/seller/SellerSettings';
import AdminDashboard from './pages/admin/AdminDashboard'; // Import Admin Panel
import Profile from './pages/Profile';
import WhatsAppVerificationRequired from './pages/WhatsAppVerificationRequired';
import Navbar from './components/common/Navbar';
import BottomNavigation from './components/common/BottomNavigation';
import { Store, ShoppingBag, User, Settings, Layers, Bell, ShieldAlert } from 'lucide-react';

const DashboardContent = () => {
  const { user, apiUrl } = useAuth();
  const { coords, setCoords } = useGeolocation();

  // Selected tab state (initialises based on role)
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem('kirana_activeTab');
    if (savedTab) {
      // Basic validation to ensure tab matches role
      if (user.role === 'customer' && !savedTab.startsWith('seller') && !savedTab.startsWith('admin')) return savedTab;
      if (user.role === 'seller' && savedTab.startsWith('seller')) return savedTab;
      if (user.role === 'admin' && savedTab.startsWith('admin')) return savedTab;
      if (savedTab === 'profile') return savedTab;
    }
    if (user.role === 'admin') return 'admin-sellers';
    return user.role === 'customer' ? 'shops' : 'seller-active';
  });

  // Flow states
  const [selectedShop, setSelectedShop] = useState(() => {
    const savedShop = sessionStorage.getItem('kirana_selectedShop');
    try {
      return savedShop ? JSON.parse(savedShop) : null;
    } catch (e) {
      return null;
    }
  });

  // Persist state
  useEffect(() => {
    sessionStorage.setItem('kirana_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedShop) {
      sessionStorage.setItem('kirana_selectedShop', JSON.stringify(selectedShop));
    } else {
      sessionStorage.removeItem('kirana_selectedShop');
    }
  }, [selectedShop]);

  // Handle scanned shop QR logic
  useEffect(() => {
    const scannedShopId = sessionStorage.getItem('kirana_scannedShopId');
    if (scannedShopId && user && user.role === 'customer') {
      const fetchShop = async () => {
        try {
          const res = await fetch(`${apiUrl}/shops/${scannedShopId}`);
          if (res.ok) {
            const data = await res.json();
            // Data might be nested under data.shop or returned directly depending on the backend
            // Looking at standard conventions, it could be the object directly or nested
            const shopData = data.shop || data; 
            if (shopData && shopData._id) {
              setSelectedShop(shopData);
              setActiveTab('instant-order');
            }
            sessionStorage.removeItem('kirana_scannedShopId');
          }
        } catch (err) {
          console.error("Failed to fetch scanned shop:", err);
        }
      };
      fetchShop();
    }
  }, [user, apiUrl]);

  // Desktop side bar menu item layout mapping
  const renderSidebar = () => {
    const handleTabClick = (tab) => {
      setActiveTab(tab);
    };

    const customerMenuItems = [
      { id: 'shops', label: 'Nearby Shops', icon: Store },
      { id: 'orders', label: 'My Orders', icon: ShoppingBag },
      { id: 'profile', label: 'Profile', icon: User }
    ];

    const sellerMenuItems = [
      { id: 'seller-new', label: 'New Chittis', icon: Bell },
      { id: 'seller-active', label: 'Active Queue', icon: Layers },
      { id: 'seller-completed', label: 'Completed Log', icon: ShoppingBag },
      { id: 'seller-settings', label: 'Store Config', icon: Settings },
      { id: 'profile', label: 'Profile', icon: User }
    ];

    const adminMenuItems = [
      { id: 'admin-sellers', label: 'Applicant Audits', icon: ShieldAlert },
      { id: 'profile', label: 'Profile', icon: User }
    ];

    let menuItems = customerMenuItems;
    if (user.role === 'seller') menuItems = sellerMenuItems;
    if (user.role === 'admin') menuItems = adminMenuItems;

    return (
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-4 space-y-6 flex-shrink-0 h-[calc(100vh-64px)] sticky top-16">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-3">Workspace Menu</span>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-kirana-500 text-slate-950 shadow-sm'
                      : 'text-slate-655 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    );
  };

  const renderMainPanel = () => {
    switch (activeTab) {
      // Customer dashboards
      case 'shops':
        return (
          <NearbyShops
            coords={coords}
            onSelectShop={(shop) => setSelectedShop(shop)}
            onTabChange={setActiveTab}
          />
        );
      case 'instant-order':
        return (
          <InstantOrder
            selectedShop={selectedShop}
            onBackToShops={() => setActiveTab('shops')}
            onTabChange={setActiveTab}
          />
        );
      case 'orders':
        return <MyOrders />;

      // Seller dashboards
      case 'seller-new':
      case 'seller-revisions':
      case 'seller-active':
      case 'seller-completed':
        return (
          <SellerDashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        );
      case 'seller-settings':
        return <SellerSettings />;

      // Admin dashboards
      case 'admin-sellers':
        return <AdminDashboard />;

      // Shared profiles
      case 'profile':
        return <Profile />;

      default:
        if (user.role === 'admin') return <AdminDashboard />;
        return user.role === 'customer' ? <NearbyShops coords={coords} /> : <SellerDashboard activeTab="seller-active" />;
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <Navbar onSetCoords={setCoords} currentCoords={coords} />

      {/* Main Workspace Frame */}
      <div className="flex-1 min-h-0 w-full flex">
        {/* Sidebar Left (Desktop) */}
        {renderSidebar()}

        {/* Content Panel Right */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto w-full pb-20 sm:pb-6">
          {renderMainPanel()}
        </main>
      </div>

      {/* Bottom Nav Bar (Mobile) */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  // Capture shopId from URL if present, regardless of authentication state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get('shopId');
    if (shopId) {
      sessionStorage.setItem('kirana_scannedShopId', shopId);
      // Clean up URL to prevent refetching on manual reloads
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-100 select-none">
        <div className="w-10 h-10 border-4 border-kirana-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-400">Loading Kiranam Workspace...</span>
      </div>
    );
  }

  if (!user) {
    return <Home />;
  }

  if (user.role === 'pending') {
    return <RoleSelection />;
  }

  // WhatsApp verification is now optional and can be completed in the profile section
  // if (!user.verified_whatsapp && user.role !== 'admin') {
  //   // return <WhatsAppVerificationRequired />;
  // }

  return <DashboardContent />;
};

export default App;
