import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Home = () => {
  const { login, googleLogin, register, apiUrl } = useAuth();
  const [activeForm, setActiveForm] = useState('signin'); // 'signin', 'signup', 'forgot', 'reset'
  const [resetToken, setResetToken] = useState('');

  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [role] = useState('pending');

  // Eye icon toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States for messaging & loader
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);



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
    if (window.google && !window.google.accounts.id._isInitializedByMyKiranam) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "129128617735-mqj7usoj69vcep7ar08u1anpga3o2cvu.apps.googleusercontent.com",
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
        window.google.accounts.id._isInitializedByMyKiranam = true;
      } catch (gsiErr) {
        console.warn('Google Identity Services initialization warning:', gsiErr);
      }
    }
  }, [activeForm, googleLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (activeForm === 'signup') {
        await register(name, email, password, '', role);
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
        <div className="text-center mb-3 space-y-1 flex-shrink-0">
          <h1 className="text-5xl font-black tracking-tight text-slate-950" style={{fontWeight: 900, letterSpacing: '-0.03em'}}>
            <span style={{color: '#1a1a1a'}}>mykiranam</span><span style={{background: 'linear-gradient(135deg, #d97706, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>.in</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-extrabold tracking-widest uppercase">
            Our Kiranam Store
          </p>
        </div>

        {/* Central Stable-Height Auth Container */}
        <div className="w-full flex-shrink-0">
          <div className="bg-white border border-slate-200 px-5 sm:px-8 py-5 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col justify-between w-full h-auto min-h-[420px] transition-all duration-300">
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

                <div className="flex justify-center">
                  {/* Google G-only circular button */}
                  <button
                    type="button"
                    id="googleGsiButton"
                    onClick={() => {
                      if (window.google) {
                        window.google.accounts.id.prompt();
                      } else {
                        setError('Google Sign-In is not available. Please try again.');
                      }
                    }}
                    className="w-14 h-14 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center shadow-md"
                    title="Continue with Google"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3.01h3.89c2.28-2.1 3.59-5.19 3.59-8.89z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.01c-1.07.72-2.45 1.15-4.04 1.15-3.11 0-5.74-2.1-6.68-4.92H1.27v3.1C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.32 14.31A7.17 7.17 0 0 1 4.95 12c0-.81.14-1.59.37-2.31V6.59H1.27A11.94 11.94 0 0 0 0 12c0 1.93.46 3.75 1.27 5.41l4.05-3.1z"/>
                      <path fill="#EA4335" d="M12 4.77c1.76 0 3.33.6 4.57 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0 7.31 0 3.26 2.7 1.27 6.59l4.05 3.1C6.26 6.87 8.89 4.77 12 4.77z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </main>



      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white/50 backdrop-blur-md text-center text-[10px] font-black text-slate-400 z-20 flex-shrink-0 flex flex-col items-center justify-center">
        <div className="mb-2 space-x-3 flex flex-wrap justify-center gap-y-1">
          <a href="/terms.html" className="hover:text-amber-600 transition-colors">Terms</a>
          <a href="/privacy.html" className="hover:text-amber-600 transition-colors">Privacy</a>
          <a href="/refund.html" className="hover:text-amber-600 transition-colors">Refund Policy</a>
          <a href="/contact.html" className="hover:text-amber-600 transition-colors">Contact Us</a>
        </div>
        <div>© 2026 Kiranam.in Hyperlocal Marketplace. Operated by Nelapatla Venkatesh.</div>
      </footer>
    </div>
  );
};

export default Home;
