import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, Mail, Phone, Upload, Image as ImageIcon, Send, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

const SelfVerification = ({ onVerifySubmitted }) => {
  const { token, user, apiUrl, refreshProfile, extraData } = useAuth();
  const { playSoundAlert } = useSocket();

  // Verification steps: 1 (OTP) | 2 (Category/Hours) | 3 (5 Image Uploads) | 4 (Success Review)
  const [step, setStep] = useState(extraData?.shop?.verified_by_seller ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: OTP states
  const [email, setEmail] = useState(user?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Step 2: Store parameters
  const [workingHours, setWorkingHours] = useState('08:00 - 22:00');
  const [shopCategory, setShopCategory] = useState('General Provisions');

  // Step 3: Image states
  const [images, setImages] = useState({
    image_front: null,
    image_counter: null,
    image_inside1: null,
    image_inside2: null,
    image_additional: null
  });
  const [previews, setPreviews] = useState({
    image_front: null,
    image_counter: null,
    image_inside1: null,
    image_inside2: null,
    image_additional: null
  });

  // OTP handlers
  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid Gmail / Email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/shops/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(response.ok ? 'Failed to parse server response.' : `Server Error: ${text.substring(0, 100)}`);
      }
      
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
    if (!otpCode.trim()) {
      setError('Please input the 4-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/shops/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, code: otpCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid OTP code.');

      playSoundAlert('success');
      setEmailVerified(true);
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

  // Multi-part verification submit handler
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Ensure all 5 files selected
    const missing = Object.keys(images).filter(k => !images[k]);
    if (missing.length > 0) {
      setError('All 5 mandatory shop images are required to complete audits.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('working_hours', workingHours);
    formData.append('shop_category', shopCategory);
    formData.append('image_front', images.image_front);
    formData.append('image_counter', images.image_counter);
    formData.append('image_inside1', images.image_inside1);
    formData.append('image_inside2', images.image_inside2);
    formData.append('image_additional', images.image_additional);

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
          Complete mobile validation and upload mandatory images to register on the verified customer marketplace.
        </p>

        {/* Step Indicator dots */}
        <div className="flex justify-center space-x-1 pt-1.5">
          {[1, 2, 3].map(s => (
            <span
              key={s}
              className={`w-4 h-1 rounded ${step === s ? 'bg-kirana-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-crimson/15 border border-crimson/30 rounded-xl text-crimson text-xs font-semibold">
          {error}
        </div>
      )}

      {/* --- STEP 1: GMAIL / EMAIL OTP CHECK --- */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 1: Verify Email Address</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 text-left block">Store Owner Email Address</label>
            <div className="flex space-x-2">
              <input
                type="email"
                disabled={emailVerified || otpSent}
                placeholder="owner@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-kirana-500 focus:outline-none text-slate-750"
              />
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

          {otpSent && !emailVerified && (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 text-left block">Enter 4-digit Verification Code</label>
                <input
                  type="text"
                  maxLength="4"
                  placeholder="XXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 2: Store Category & Hours</h3>

          {/* Working hours */}
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

          {/* Category */}
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

          <button
            onClick={() => setStep(3)}
            className="w-full py-3 bg-slate-900 text-white hover:bg-slate-950 text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Proceed to Uploads</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- STEP 3: 5 IMAGE UPLOADS --- */}
      {step === 3 && (
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Step 3: Upload 5 Images</h3>
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
            {renderUploaderSlot(
              'image_additional',
              '5. Additional Angle / Inside Store',
              'Side view, back storage, or details'
            )}
          </div>

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
              disabled={loading}
              className="flex-[2] py-3 bg-gradient-to-r from-kirana-500 to-amber-500 hover:from-kirana-600 hover:to-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? 'Uploading Images...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};

export default SelfVerification;
