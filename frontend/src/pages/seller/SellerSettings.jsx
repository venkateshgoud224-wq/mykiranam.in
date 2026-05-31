import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Settings, Save, Clock, Percent, QrCode, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import StorePosterGenerator from '../../components/seller/StorePosterGenerator';

const SellerSettings = () => {
  const { token, extraData, apiUrl, refreshProfile } = useAuth();
  const { playSoundAlert } = useSocket();

  // Settings states
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [maxActiveOrders, setMaxActiveOrders] = useState(10);
  const [waitingTime, setWaitingTime] = useState(15);
  const [discounts, setDiscounts] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('22:00');

  // UPI payment state
  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);

  // Shop Banner states
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerLoading, setBannerLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (extraData.shop) {
      const shop = extraData.shop;
      setShopName(shop.shop_name || '');
      setAddress(shop.address || '');
      setAvailabilityStatus(shop.availability_status || 'Available');
      setMaxActiveOrders(shop.max_active_orders !== undefined && shop.max_active_orders !== null ? shop.max_active_orders : 10);
      setWaitingTime(shop.waiting_time !== undefined && shop.waiting_time !== null ? shop.waiting_time : 15);
      setDiscounts(shop.discounts || '');
      setStartTime(shop.online_start_time || '08:00');
      setEndTime(shop.online_end_time || '22:00');
      setUpiId(shop.upi_id || '');
      if (shop.qr_code_image) {
        setQrPreview(shop.qr_code_image.startsWith('http') ? shop.qr_code_image : `${apiUrl.replace('/api', '')}${shop.qr_code_image}`);
      }
      if (shop.image_banner) {
        setBannerPreview(shop.image_banner.startsWith('http') ? shop.image_banner : `${apiUrl.replace('/api', '')}${shop.image_banner}`);
      } else {
        setBannerPreview(null);
      }
    }
  }, [extraData.shop, apiUrl]);

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const response = await fetch(`${apiUrl}/shops/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shop_name: shopName,
          address,
          availability_status: availabilityStatus,
          max_active_orders: maxActiveOrders,
          waiting_time: waitingTime,
          discounts,
          online_start_time: startTime,
          online_end_time: endTime
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update store settings.');

      playSoundAlert('success');
      setSuccess('Store parameters updated successfully!');
      refreshProfile();
    } catch (err) {
      setError(err.message || 'Error updating settings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setSuccess('');
    setError('');

    const formData = new FormData();
    formData.append('upi_id', upiId);
    if (qrFile) {
      formData.append('qr_code_image', qrFile);
    }

    try {
      const response = await fetch(`${apiUrl}/shops/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update UPI settings.');

      playSoundAlert('success');
      setSuccess('UPI configs saved successfully!');
      refreshProfile();
    } catch (err) {
      setError(err.message || 'Error saving payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleQrChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQrFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerFile) {
      setError('Please select a banner image file to upload.');
      return;
    }
    setBannerLoading(true);
    setSuccess('');
    setError('');

    const formData = new FormData();
    formData.append('image_banner', bannerFile);

    try {
      const response = await fetch(`${apiUrl}/shops/banner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload store banner.');

      playSoundAlert('success');
      setSuccess('Store banner uploaded successfully!');
      refreshProfile();
    } catch (err) {
      setError(err.message || 'Error saving banner.');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!extraData.shop) {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <p className="text-slate-500 text-xs">Registering store settings profile, please wait...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full px-2">
      <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
        <Settings className="w-5 h-5 text-kirana-500" />
        <span>Store Configurations</span>
      </h2>

      {success && (
        <div className="p-3 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald text-xs font-semibold rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold">
          {error}
        </div>
      )}

      {/* 1. Core Shop Settings Form */}
      <form onSubmit={handleSettingsSubmit} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Queue & Visibility Settings</h3>
        
        {/* Shop Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Kirana Store Name</label>
          <input
            type="text"
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
          />
        </div>

        {/* Store Address */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Shop Physical Address</label>
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
          />
        </div>

        {/* Availability Toggle */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Live Availability Status</label>
          <select
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
          >
            <option value="Available">Available (Accepting Orders)</option>
            <option value="Busy">Busy (Expect longer wait times)</option>
            <option value="Offline">Offline (Closed - Disables online ordering)</option>
          </select>
        </div>

        {/* Max Active Capacity & Waiting time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Max Active Queue</span>
            </label>
            <input
              type="number"
              min="0"
              value={maxActiveOrders}
              onChange={(e) => setMaxActiveOrders(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Est Wait Time (min)</span>
            </label>
            <input
              type="number"
              min="0"
              value={waitingTime}
              onChange={(e) => setWaitingTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Timing windows */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Online Open Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Online Close Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Discounts */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
            <Percent className="w-3.5 h-3.5 text-slate-400" />
            <span>Discounts Text (Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 5% off on bills above ₹500"
            value={discounts}
            onChange={(e) => setDiscounts(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving Store Settings...' : 'Save Queue Settings'}</span>
        </button>
      </form>

      {/* 2. Payment Configuration Settings Form */}
      <form onSubmit={handlePaymentSubmit} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
          <QrCode className="w-4 h-4 text-kirana-500" />
          <span>Manual UPI Payment Details</span>
        </h3>
        <p className="text-[10px] text-slate-400 leading-normal">
          Customers who select online payment will verify your UPI ID and scan your uploaded QR Code.
        </p>

        {/* UPI ID */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Your UPI ID (required for online verification)</label>
          <input
            type="text"
            required
            placeholder="e.g. name@okhdfcbank or 9876543210@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
          />
        </div>

        {/* UPI QR upload */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Store UPI QR Code Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleQrChange}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-950 file:cursor-pointer"
          />
          {(qrPreview || upiId) && (
            <div className="pt-2 flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold mb-1">
                {qrFile || (extraData.shop && extraData.shop.qr_code_image) ? 'Uploaded QR Code Preview:' : 'Generated UPI QR Code (Ready to Scan):'}
              </span>
              <img
                src={
                  qrPreview ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `upi://pay?pa=${upiId}&pn=${shopName}&cu=INR`
                  )}`
                }
                alt="UPI QR Code"
                className="w-28 h-28 object-contain border border-slate-200 p-1 bg-white rounded-lg"
              />
              {!qrFile && (!extraData.shop || !extraData.shop.qr_code_image) && upiId && (
                <p className="text-[8px] text-slate-400 text-center mt-1">Generated automatically from your UPI ID</p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={paymentLoading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{paymentLoading ? 'Uploading payment configs...' : 'Save UPI Settings'}</span>
        </button>
      </form>

      {/* Shop Banner Upload Form */}
      <form onSubmit={handleBannerSubmit} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
          <span>Store Custom Banner Image</span>
        </h3>
        <p className="text-[10px] text-slate-400 leading-normal">
          Upload a high-quality storefront photo or marketing banner to show customers at the top of your shop listing and checkout forms.
        </p>

        <div className="space-y-3">
          {/* File Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Choose Banner Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-950 file:cursor-pointer"
            />
          </div>

          {/* Banner Live Simulated Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[21/9] bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Store Banner Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">No Custom Banner</span>
                <span className="text-[8px] text-slate-400 mt-0.5 block">Displaying default Kiranam styling</span>
              </div>
            )}

            {/* Simulated Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
              <span className="text-white text-xs font-black drop-shadow-md">{shopName || "Your Kirana Store"}</span>
              <span className="text-white/80 text-[8px] font-bold mt-0.5 truncate drop-shadow-sm">{address || "Store Address"}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={bannerLoading || !bannerFile}
          className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{bannerLoading ? 'Uploading Banner...' : 'Upload Store Banner'}</span>
        </button>
      </form>

      {/* 3. Store Promotional Poster Generator */}
      <StorePosterGenerator shopName={shopName} shopId={extraData?.shop?._id} />
    </div>
  );
};

export default SellerSettings;
