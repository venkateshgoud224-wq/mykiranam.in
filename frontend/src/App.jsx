import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useGeolocation } from './hooks/useGeolocation';
import Home from './pages/Home';
import RoleSelection from './pages/RoleSelection';
import NearbyShops from './pages/customer/NearbyShops';
import InstantOrder from './pages/customer/InstantOrder';
import CustomerQuotes from './pages/customer/CustomerQuotes';
import MyOrders from './pages/customer/MyOrders';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerSettings from './pages/seller/SellerSettings';
import MyProducts from './pages/seller/MyProducts';
import AdminDashboard from './pages/admin/AdminDashboard'; // Import Admin Panel
import Profile from './pages/Profile';
import SavingsDashboard from './pages/customer/SavingsDashboard';
import WhatsAppVerificationRequired from './pages/WhatsAppVerificationRequired';
import SupportAssistant from './pages/SupportAssistant';
import UPITestPage from './pages/customer/UPITestPage';
import Navbar from './components/common/Navbar';
import BottomNavigation from './components/common/BottomNavigation';
import { Store, ShoppingBag, User, Settings, Layers, Bell, ShieldAlert, Trophy, HelpCircle, Scale, Package } from 'lucide-react';

// Capture shopId and orderId from URL immediately upon script load to ensure it's available for child components
const urlParams = new URLSearchParams(window.location.search);
const initialShopId = urlParams.get('shopId');
if (initialShopId) {
  sessionStorage.setItem('kirana_scannedShopId', initialShopId);
}
const initialOrderId = urlParams.get('order_id');
if (initialOrderId) {
  sessionStorage.setItem('kirana_verificationOrderId', initialOrderId);
}
const initialMethod = urlParams.get('method');
if (initialMethod) {
  sessionStorage.setItem('kirana_verificationMethod', initialMethod);
}
const initialTransactionId = urlParams.get('transactionId');
if (initialTransactionId) {
  sessionStorage.setItem('kirana_verificationTransactionId', initialTransactionId);
}
const initialPayMethod = urlParams.get('pay_method');
if (initialPayMethod) {
  sessionStorage.setItem('kirana_verificationPayMethod', initialPayMethod);
}
if (initialShopId || initialOrderId) {
  window.history.replaceState({}, document.title, window.location.pathname);
}

const DashboardContent = () => {
  const { user, apiUrl, extraData } = useAuth();
  const { coords, setCoords } = useGeolocation();

  // Selected tab state (initialises based on role)
  const [activeTab, setActiveTab] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('order_id') || sessionStorage.getItem('kirana_verificationOrderId')) {
      return 'orders';
    }
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
            if (shopData && (shopData.id || shopData._id)) {
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
      { id: 'savings', label: 'My Savings', icon: Trophy },
      { id: 'support', label: 'Help & Support', icon: HelpCircle },
      { id: 'profile', label: 'Profile', icon: User }
    ];

    const isVerifiedSeller = extraData.shop?.verification_status === 'Verified';

    const sellerMenuItems = isVerifiedSeller ? [
      { id: 'seller-new', label: 'New Chittis', icon: Bell },
      { id: 'seller-active', label: 'Active Queue', icon: Layers },
      { id: 'seller-completed', label: 'Completed Log', icon: ShoppingBag },
      { id: 'seller-products', label: 'My Products', icon: Package },
      { id: 'seller-disputes', label: 'Disputes & Trust', icon: Scale },
      { id: 'seller-settings', label: 'Store Config', icon: Settings },
      { id: 'support', label: 'Help & Support', icon: HelpCircle },
      { id: 'profile', label: 'Profile', icon: User }
    ] : [
      { id: 'seller-active', label: 'Verification Status', icon: ShieldAlert },
      { id: 'support', label: 'Help & Support', icon: HelpCircle },
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
    // Intercept seller tabs if not verified
    if (user.role === 'seller' && extraData.shop?.verification_status !== 'Verified') {
      if (activeTab !== 'profile' && activeTab !== 'support') {
        return (
          <SellerDashboard
            activeTab="seller-active"
            onTabChange={setActiveTab}
          />
        );
      }
    }

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
      case 'quotes':
        return (
          <CustomerQuotes
            onSelectShop={(shop) => setSelectedShop(shop)}
            onBackToShops={() => setActiveTab('shops')}
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
        return <MyOrders coords={coords} />;
      case 'savings':
        return <SavingsDashboard />;

      // Seller dashboards
      case 'seller-new':
      case 'seller-revisions':
      case 'seller-active':
      case 'seller-completed':
      case 'seller-disputes':
        return (
          <SellerDashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        );
      case 'seller-products':
        return <MyProducts />;
      case 'seller-settings':
        return <SellerSettings />;

      // Admin dashboards
      case 'admin-sellers':
        return <AdminDashboard />;

      // Shared profiles
      case 'profile':
        return <Profile onTabChange={setActiveTab} />;

      case 'support':
        return <SupportAssistant />;

      default:
        if (user.role === 'admin') return <AdminDashboard />;
        return user.role === 'customer' ? (
          <NearbyShops 
            coords={coords} 
            onSelectShop={(shop) => setSelectedShop(shop)}
            onTabChange={setActiveTab}
          />
        ) : (
          <SellerDashboard activeTab="seller-active" onTabChange={setActiveTab} />
        );
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <Navbar onSetCoords={setCoords} currentCoords={coords} setActiveTab={setActiveTab} />

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
  // Direct route bypass for testing mobile deep links
  if (window.location.pathname === '/upi-test') {
    return <UPITestPage />;
  }

  const { user, loading } = useAuth();

  const [whatsappSkipped, setWhatsappSkipped] = useState(() => {
    return sessionStorage.getItem('whatsapp_skipped') === 'true';
  });

  // Dynamic robots meta management to disallow indexing of dashboard and private pages
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    
    if (!user) {
      robotsMeta.setAttribute('content', 'index,follow');
    } else {
      robotsMeta.setAttribute('content', 'noindex,nofollow');
    }
  }, [user]);

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

  // WhatsApp verification is mandatory before seeing the dashboard, unless skipped
  if (!user.verified_whatsapp && user.role !== 'admin' && !whatsappSkipped) {
    return (
      <WhatsAppVerificationRequired 
        onSkip={() => {
          setWhatsappSkipped(true);
          sessionStorage.setItem('whatsapp_skipped', 'true');
        }} 
      />
    );
  }

  return <DashboardContent />;
};

export default App;
