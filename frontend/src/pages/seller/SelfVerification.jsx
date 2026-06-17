import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, Mail, Phone, Upload, Image as ImageIcon, Send, ArrowRight, Lock, CheckCircle2, User, CreditCard, Building2, FileText, Banknote } from 'lucide-react';

const SelfVerification = ({ onVerifySubmitted }) => {
  const { token, user, apiUrl, refreshProfile, extraData } = useAuth();
  const { playSoundAlert } = useSocket();

  // Verification steps: 1 (OTP) | 2 (Category/Hours) | 3 (4 Image Uploads) | 4 (KYC Identity) | 5 (Success)
  const [step, setStep] = useState((user?.verified_whatsapp || extraData?.shop?.verified_by_seller) ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: OTP states
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number || '');
  const [otpCode, setOtpCode] = useState('');
  const [whatsappVerified, setWhatsappVerified] = useState(user?.verified_whatsapp || false);
  const [otpSent, setOtpSent] = useState(false);

  // Step 2: Store parameters
  const [workingHours, setWorkingHours] = useState('08:00 - 22:00');
  const [shopCategory, setShopCategory] = useState('General Provisions');
  const [shopName, setShopName] = useState(extraData?.shop?.shop_name || (user?.name ? `${user.name}'s Kirana Store` : ''));
  const [address, setAddress] = useState(extraData?.shop?.address || '');
  const [latitude, setLatitude] = useState(extraData?.shop?.latitude || '16.8970');
  const [longitude, setLongitude] = useState(extraData?.shop?.longitude || '79.8705');

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapLocked, setMapLocked] = useState(true);
  const mapContainerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);

  React.useEffect(() => {
    if (step !== 2) return;

    // Load Leaflet CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const jsId = 'leaflet-js';
    const existingScript = document.getElementById(jsId);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      if (window.L) {
        setLeafletLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setLeafletLoaded(true));
      }
    }
  }, [step]);

  React.useEffect(() => {
    if (!leafletLoaded || step !== 2 || !mapContainerRef.current) return;

    const L = window.L;
    if (!L) return; // Prevent crash if Leaflet is not yet ready on window

    const initialLat = parseFloat(latitude) || 16.8970;
    const initialLng = parseFloat(longitude) || 79.8705;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      dragging: !mapLocked,
      touchZoom: !mapLocked
    }).setView([initialLat, initialLng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded, step]);

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        alert("Failed to get current location. Please allow GPS permissions or select manually on the map.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Step 3: Image states
  const [images, setImages] = useState({
    image_front: null,
    image_counter: null,
    image_inside1: null,
    image_inside2: null
  });
  const [previews, setPreviews] = useState({
    image_front: null,
    image_counter: null,
    image_inside1: null,
    image_inside2: null
  });

  // Step 4: KYC Identity states
  const [kycData, setKycData] = useState({
    owner_full_name: user?.name || '',
    aadhaar_number: '',
    pan_number: '',
    business_type: 'Sole Proprietor',
    gst_number: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    declaration_accepted: false
  });
  const [kycImages, setKycImages] = useState({ aadhaar_image: null, pan_image: null });
  const [kycPreviews, setKycPreviews] = useState({ aadhaar_image: null, pan_image: null });
  const [kycLoading, setKycLoading] = useState(false);

  // OTP handlers
  const handleSendOtp = async () => {
    if (!whatsappNumber || whatsappNumber.length < 10) {
      setError('Please provide a valid 10-digit WhatsApp number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/profile/whatsapp/send-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ whatsappNumber })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Verification failed. Please try again.');

      playSoundAlert('success');
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Error sending code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/profile/whatsapp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: otpCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid OTP code.');

      playSoundAlert('success');
      setWhatsappVerified(true);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  // Image change handlers
  const handleImageFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB.');
        return;
      }
      setImages(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // KYC image change handler
  const handleKycImageChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB.');
        return;
      }
      setKycImages(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => setKycPreviews(prev => ({ ...prev, [field]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // KYC submit handler
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!kycData.owner_full_name.trim()) return setError('Owner full name is required.');
    if (!kycData.aadhaar_number.match(/^\d{12}$/)) return setError('Aadhaar number must be exactly 12 digits.');
    if (!kycData.pan_number.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) return setError('PAN number must be valid format (e.g. ABCDE1234F).');
    if (!kycData.bank_account_number.trim()) return setError('Bank account number is required.');
    if (!kycData.bank_ifsc_code.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) return setError('IFSC code must be valid format (e.g. SBIN0001234).');
    if (!kycImages.aadhaar_image) return setError('Please upload your Aadhaar card photo.');
    if (!kycImages.pan_image) return setError('Please upload your PAN card photo.');
    if (!kycData.declaration_accepted) return setError('Please accept the declaration to proceed.');

    setKycLoading(true);
    const formData = new FormData();
    Object.entries(kycData).forEach(([k, v]) => formData.append(k, v));
    formData.append('aadhaar_image', kycImages.aadhaar_image);
    formData.append('pan_image', kycImages.pan_image);

    try {
      const response = await fetch(`${apiUrl}/shops/kyc`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'KYC submission failed.');

      playSoundAlert('success');
      refreshProfile();
      if (onVerifySubmitted) onVerifySubmitted();
    } catch (err) {
      setError(err.message || 'KYC submission error.');
    } finally {
      setKycLoading(false);
    }
  };

  // Multi-part verification submit handler
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Ensure all 4 files selected
    const missing = Object.keys(images).filter(k => !images[k]);
    if (missing.length > 0) {
      setError('All 4 mandatory shop images are required to complete audits.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('working_hours', workingHours);
    formData.append('shop_category', shopCategory);
    formData.append('shop_name', shopName);
    formData.append('address', address);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('image_front', images.image_front);
    formData.append('image_counter', images.image_counter);
    formData.append('image_inside1', images.image_inside1);
    formData.append('image_inside2', images.image_inside2);

    try {
      const response = await fetch(`${apiUrl}/shops/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(response.ok ? 'Failed to parse server response.' : `Server Error: ${text.substring(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || 'Failed to submit verification.');

      playSoundAlert('success');
      refreshProfile();
      if (onVerifySubmitted) onVerifySubmitted();
    } catch (err) {
      setError(err.message || 'Verification submission error.');
    } finally {
      setLoading(false);
    }
  };

  const renderUploaderSlot = (field, label, description) => (
    <div key={field} className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0 text-xs text-left">
        <span className="font-bold text-slate-800 block truncate">{label}</span>
        <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">{description}</span>
      </div>

      <div className="relative w-24 h-16 border border-slate-300 rounded-xl overflow-hidden bg-white flex items-center justify-center cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageFileChange(field, e)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {previews[field] ? (
          <img src={previews[field]} alt={label} className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-5 h-5 text-slate-400" />
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white border border-slate-100 rounded-3xl p-6 shadow-premium pb-20">
      
      {/* Verification Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 bg-kirana-500/10 text-kirana-500 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">Seller Self-Verification</h2>
        <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto leading-normal">
          Complete identity verification and upload mandatory documents to become a verified seller.
        </p>

        {/* Step Indicator dots */}
        <div className="flex justify-center space-x-1 pt-1.5">
          {[1, 2, 3].map(s => (
            <span
              key={s}
              className={`w-4 h-1 rounded ${step === s ? 'bg-kirana-500' : step > s ? 'bg-emerald-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          {step === 1 && 'Step 1 of 3 — WhatsApp Verification'}
          {step === 2 && 'Step 2 of 3 — Store Information'}
          {step === 3 && 'Step 3 of 3 — Shop Photos'}
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold">
          {error}
        </div>
      )}

      {/* --- STEP 1: WHATSAPP OTP CHECK --- */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 1: Verify WhatsApp Number</h3>
          
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-700 text-left block">WhatsApp Mobile Number</label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold select-none">
                  +91
                </span>
                <input
                  type="tel"
                  disabled={whatsappVerified || otpSent}
                  placeholder="9876543210"
                  maxLength={10}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-750 font-semibold"
                />
              </div>
              {!otpSent && (
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Send OTP
                </button>
              )}
            </div>
          </div>

          {otpSent && !whatsappVerified && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 text-left block">Enter 6-digit Verification Code</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="XXXXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs text-center font-bold tracking-widest focus:outline-none"
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-2.5 bg-kirana-500 text-slate-950 rounded-xl text-xs font-extrabold shadow"
              >
                Confirm OTP Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- STEP 2: CATEGORY & WORKING HOURS --- */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 2: Store Information & Map Pinning</h3>

          {/* Store Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 text-left block">Kirana Store Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Balaji Groceries"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>

          {/* Store Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 text-left block">Store Address</label>
            <textarea
              required
              placeholder="Provide exact street, city details"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-800"
            />
          </div>

          {/* Timing & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 text-left block">Working Hours</label>
              <input
                type="text"
                placeholder="e.g. 08:00 - 22:00"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 text-left block">Shop Category</label>
              <select
                value={shopCategory}
                onChange={(e) => setShopCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-750"
              >
                <option value="General Provisions">General Provisions</option>
                <option value="Groceries & Fruits">Groceries & Fruits</option>
                <option value="Organic & Fresh">Organic & Fresh</option>
                <option value="Snacks & Sweets">Snacks & Sweets</option>
              </select>
            </div>
          </div>

          {/* Map Pinning Header & Auto Detect Button */}
          <div className="space-y-2">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700 block">Pin Shop Location on Map</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const newLocked = !mapLocked;
                    setMapLocked(newLocked);
                    if (mapRef.current) {
                      if (newLocked) {
                        mapRef.current.dragging.disable();
                        mapRef.current.touchZoom.disable();
                      } else {
                        mapRef.current.dragging.enable();
                        mapRef.current.touchZoom.enable();
                      }
                    }
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all active:scale-[0.98] ${
                    mapLocked 
                      ? 'text-slate-500 bg-slate-50 border-slate-250' 
                      : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span>{mapLocked ? '🔒 Map Locked' : '🔓 Map Unlocked'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  className="text-[10px] font-bold text-kirana-600 bg-kirana-50 hover:bg-kirana-100 px-2.5 py-1 rounded-lg border border-kirana-200 flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <span>📍</span> Auto-Detect GPS
                </button>
              </div>
            </div>

            {/* Leaflet Map Pinning Div */}
            <div 
              ref={mapContainerRef} 
              className="w-full h-48 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 z-10" 
              style={{ minHeight: '180px' }}
            />

            {/* Latitude/Longitude Display Read Only */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Latitude</span>
                <input
                  type="text"
                  readOnly
                  value={latitude}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Longitude</span>
                <input
                  type="text"
                  readOnly
                  value={longitude}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (!shopName.trim()) {
                alert("Please enter Kirana Store Name.");
                return;
              }
              if (!address.trim()) {
                alert("Please enter Store Physical Address.");
                return;
              }
              setStep(3);
            }}
            className="w-full py-3 bg-slate-900 text-white hover:bg-slate-950 text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Proceed to Uploads</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- STEP 3: 4 IMAGE UPLOADS --- */}
      {step === 3 && (
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 3: Upload 4 Shop Photos</h3>
          </div>

          <div className="space-y-2.5">
            {renderUploaderSlot(
              'image_front',
              '1. Shop Front View',
              'Outside view with signage board clearly visible'
            )}
            {renderUploaderSlot(
              'image_counter',
              '2. Billing Counter / Seat View',
              'Counter billing desk and cash counter view'
            )}
            {renderUploaderSlot(
              'image_inside1',
              '3. Grocery Shelves Angle 1',
              'Inside perspective detailing shelf organization'
            )}
            {renderUploaderSlot(
              'image_inside2',
              '4. Grocery Shelves Angle 2',
              'Additional shelves displaying brand stock arrays'
            )}
          </div>

          {/* Missing images warning */}
          {Object.values(images).some(v => !v) && (
            <p className="text-[10px] text-amber-600 font-semibold text-center">
              All 4 photos are required before proceeding.
            </p>
          )}

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={Object.values(images).some(v => !v)}
              onClick={(e) => {
                const missing = Object.keys(images).filter(k => !images[k]);
                if (missing.length > 0) {
                  setError('All 4 mandatory shop images are required.');
                  e.preventDefault();
                  return;
                }
              }}
              className="flex-[2] py-3 bg-slate-900 text-white text-xs font-black rounded-xl shadow-lg active:scale-[0.99] transition-all disabled:opacity-50"
            >
              Submit Application
            </button>
          </div>
        </form>
      )}



    </div>
  );
};

export default SelfVerification;
