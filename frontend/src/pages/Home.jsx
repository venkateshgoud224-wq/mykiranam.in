import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Home = () => {
  const { login, googleLogin, register, apiUrl } = useAuth();
  const [activeForm, setActiveForm] = useState('signin'); // 'signin', 'signup', 'forgot', 'reset'
  const [resetToken, setResetToken] = useState('');

  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');

  // Eye icon toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States for messaging & loader
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulated google testing states
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [mockGoogleEmail, setMockGoogleEmail] = useState('');

  // Check for reset password token in query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setActiveForm('reset');
      // Clean query parameters from URL without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Initialize Real Google GSI button
  useEffect(() => {
    if (window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1028308493028-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
          callback: async (response) => {
            setError('');
            setSuccessMessage('');
            setLoading(true);
            try {
              await googleLogin(response.credential);
            } catch (err) {
              setError(err.message || 'Google Authentication failed.');
            } finally {
              setLoading(false);
            }
          }
        });

        const targetBtn = document.getElementById("googleGsiButton");
        if (targetBtn) {
          window.google.accounts.id.renderButton(
            targetBtn,
            { theme: "outline", size: "large", width: "100%", shape: "rectangular" }
          );
        }
      } catch (gsiErr) {
        console.warn('Google Identity Services initialization warning:', gsiErr);
      }
    }
  }, [activeForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (activeForm === 'signup') {
        await register(name, email, password, phone, role);
        setSuccessMessage('Registration successful! Please sign in with your credentials.');
        setActiveForm('signin');
        setPassword('');
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to trigger reset email.');
      
      setSuccessMessage('A secure password reset link has been sent to your email.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update password.');

      setSuccessMessage('Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        setResetToken('');
        setPassword('');
        setConfirmPassword('');
        setActiveForm('signin');
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async (e) => {
    e.preventDefault();
    if (!mockGoogleEmail.includes('@')) {
      setError('Please enter a valid simulated Google email.');
      return;
    }
    setLoading(true);
    setShowGoogleMock(false);
    try {
      const mockCred = `mock_token_${Date.now()}_${mockGoogleEmail}`;
      const nameFromEmail = mockGoogleEmail.split('@')[0];
      await googleLogin(mockCred, nameFromEmail, mockGoogleEmail);
    } catch (err) {
      setError(err.message || 'Google Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    switch (activeForm) {
      case 'forgot':
        return (
          <form onSubmit={handleForgotSubmit} className="flex-1 flex flex-col justify-center space-y-4">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-black text-slate-900">Forgot Password</h2>
              <p className="text-xs font-semibold text-slate-500 leading-normal">
                Enter your email address and we'll send you a secure link to reset your password from our business email.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all animate-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? 'Processing...' : 'Send Password Reset Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveForm('signin'); setError(''); setSuccessMessage(''); }}
              className="mt-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetSubmit} className="flex-1 flex flex-col justify-center space-y-4">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-black text-slate-900">Set New Password</h2>
              <p className="text-xs font-semibold text-slate-500 leading-normal">
                Please enter and confirm your new secure account password below.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveForm('signin'); setError(''); setResetToken(''); }}
              className="mt-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        );

      default:
        // 'signin' or 'signup' mode
        return (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center space-y-3">
            {activeForm === 'signup' && (
              <div className="space-y-1 text-left animate-none">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Arjun Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>

            {activeForm === 'signup' && (
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="9876543210 (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Password</label>
                {activeForm === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setActiveForm('forgot'); setError(''); setSuccessMessage(''); }}
                    className="text-[10px] font-black text-amber-600 hover:text-amber-700 active:scale-[0.98] outline-none"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-semibold outline-none text-slate-900 placeholder:text-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeForm === 'signup' && (
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Register As</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-xs font-black outline-none text-slate-900 transition-all cursor-pointer"
                >
                  <option value="customer">Customer (Buy Provisions)</option>
                  <option value="seller">Seller (Store Merchant)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? 'Processing...' : activeForm === 'signup' ? 'Register Account' : 'Sign In'}</span>
            </button>
          </form>
        );
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-gradient-to-br from-amber-50/60 via-stone-50 to-emerald-50/40 text-slate-800 flex flex-col justify-between selection:bg-amber-200 selection:text-slate-900 relative overflow-hidden">
      {/* Background soft glowing lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-200/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-200/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Kiranam<span className="text-amber-600 font-black">.in</span>
          </span>
        </div>
        <span className="text-[10px] bg-emerald-50 border border-emerald-100 px-3.5 py-1 rounded-full font-black uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping mr-1" />
          <span>Live Network</span>
        </span>
      </header>

      {/* Centered Main Portal Content - Overflow hidden with custom centered layout */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto px-4 z-10 overflow-hidden py-4 sm:py-6">
        
        {/* Sleek Intro block */}
        <div className="text-center mb-3 space-y-0.5 flex-shrink-0">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            mykiranam<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-emerald-600">.in</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-extrabold tracking-wide uppercase">
            Our kiranam store in mykiranam.in
          </p>
        </div>

        {/* Central Stable-Height Auth Container */}
        <div className="w-full flex-shrink-0">
          <div className="bg-white border border-slate-200 px-5 sm:px-8 py-5 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col justify-between w-full h-[470px] max-h-[470px] transition-all duration-300">
            <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-24 h-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
            
            {/* Header Tabs (only visible on regular signin/signup forms) */}
            {(activeForm === 'signin' || activeForm === 'signup') && (
              <div className="flex justify-center mb-3 border-b border-slate-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveForm('signin'); setError(''); setSuccessMessage(''); }}
                  className={`flex-1 pb-2 text-xs uppercase tracking-wider text-center border-b-2 transition-all ${
                    activeForm === 'signin'
                      ? 'border-amber-600 text-slate-950 font-black'
                      : 'border-transparent text-slate-400 font-bold hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveForm('signup'); setError(''); setSuccessMessage(''); }}
                  className={`flex-1 pb-2 text-xs uppercase tracking-wider text-center border-b-2 transition-all ${
                    activeForm === 'signup'
                      ? 'border-amber-600 text-slate-950 font-black'
                      : 'border-transparent text-slate-400 font-bold hover:text-slate-600'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Content Container with inner-overflow support for small screens */}
            <div className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col justify-center min-h-0">
              {successMessage && (
                <div className="p-2.5 mb-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-[10px] font-bold text-left flex items-start space-x-1.5 flex-shrink-0">
                  <span>✅</span>
                  <span className="leading-tight">{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 mb-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[10px] font-bold text-left flex items-start space-x-1.5 flex-shrink-0">
                  <span>⚠️</span>
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {renderFormContent()}
            </div>

            {/* Bottom Section - Social Login (only visible in signin/signup/forgot forms) */}
            {activeForm !== 'reset' && (
              <div className="space-y-2 pt-2 border-t border-slate-100 flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase"><span className="bg-white px-3 text-slate-400">Or continue with</span></div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  {/* Google Real OAuth GSI Button Container */}
                  <div id="googleGsiButton" className="w-full flex justify-center min-h-[40px]"></div>

                  {/* Fallback Sim Button for local dev testing */}
                  <button
                    onClick={() => { setShowGoogleMock(true); setError(''); setSuccessMessage(''); }}
                    className="w-full flex items-center justify-center space-x-2 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl active:scale-[0.99] transition-all bg-white"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.05c2.37-2.18 3.5-5.4 3.5-9.73z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.13-6.76-5.01H1.14v3.23C3.12 21.39 7.24 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.24 14.22a7.12 7.12 0 0 1 0-4.44V6.55H1.14a11.94 11.94 0 0 0 0 10.9l4.1-3.23z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.24 0 3.12 2.61 1.14 6.55l4.1 3.23c.95-2.88 3.61-5.03 6.76-5.03z"/>
                    </svg>
                    <span className="text-xs font-black text-slate-700">Simulate Google Account (Dev Mode)</span>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </main>

      {/* Google Mock Modal */}
      {showGoogleMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-200 text-slate-900 text-left">
            <div className="flex items-center space-x-2.5 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.05c2.37-2.18 3.5-5.4 3.5-9.73z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.13-6.76-5.01H1.14v3.23C3.12 21.39 7.24 24 12 24z"/>
                <path fill="#FBBC05" d="M5.24 14.22a7.12 7.12 0 0 1 0-4.44V6.55H1.14a11.94 11.94 0 0 0 0 10.9l4.1-3.23z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.24 0 3.12 2.61 1.14 6.55l4.1 3.23c.95-2.88 3.61-5.03 6.76-5.03z"/>
              </svg>
              <span className="font-extrabold text-sm text-slate-800">Sign in with Google (Dev Mode)</span>
            </div>
            <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
              Enter your email to simulate Google popup selection on your local development server:
            </p>
            <form onSubmit={handleMockGoogleLogin} className="space-y-4">
              <input
                type="email"
                required
                placeholder="yourname@gmail.com"
                value={mockGoogleEmail}
                onChange={(e) => setMockGoogleEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:border-amber-500 focus:outline-none text-slate-900 bg-white"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleMock(false)}
                  className="flex-1 py-2.5 text-xs font-black rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-black rounded-xl bg-slate-900 hover:bg-slate-950 text-white transition-all"
                >
                  Select Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white/50 backdrop-blur-md text-center text-[10px] font-black text-slate-400 z-20 flex-shrink-0">
        © 2026 Kiranam.in Hyperlocal Marketplace. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
