import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Mail, Lock } from 'lucide-react';

const Home = () => {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [mockGoogleEmail, setMockGoogleEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
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

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-gradient-to-br from-amber-50/60 via-stone-50 to-emerald-50/40 text-slate-800 flex flex-col justify-between selection:bg-amber-200 selection:text-slate-900 relative">
      {/* Background soft glowing lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-200/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-200/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Kiranam<span className="text-amber-600">.in</span>
          </span>
        </div>
        <span className="text-[10px] bg-emerald-50 border border-emerald-100 px-3.5 py-1 rounded-full font-black uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping mr-1" />
          <span>Live Network</span>
        </span>
      </header>

      {/* Centered Main Portal Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto px-4 py-4 z-10 overflow-y-auto">
        
        {/* Sleek Intro block */}
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950">
            mykiranam<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-emerald-600">.in</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-extrabold max-w-md mx-auto">
            Our kiranam store in mykiranam.in
          </p>
        </div>

        {/* Central Stable-Height Auth Container */}
        <div className="w-full">
          <div className="bg-white border border-slate-100/90 px-8 py-8 rounded-[36px] shadow-2xl relative overflow-hidden h-[420px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-24 h-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
            
            {/* Header & Title */}
            <div>
              <div className="flex justify-center mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  Sign In to Your Account
                </h2>
              </div>

              {error && (
                <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-red-650 text-[11px] font-bold text-left flex items-start space-x-1.5">
                  <span>⚠️</span>
                  <span className="leading-tight">{error}</span>
                </div>
              )}
            </div>

            {/* Form body - Stable inside the fixed-height container */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="merchant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs font-bold outline-none text-slate-800 placeholder:text-slate-350 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs font-bold outline-none text-slate-800 placeholder:text-slate-355 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-orange-500/10 active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5"
              >
                <span>{loading ? 'Processing...' : 'Sign In'}</span>
              </button>
            </form>

            {/* Bottom Section - Social Login */}
            <div className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[9px] font-black uppercase"><span className="bg-white px-3 text-slate-400">Or continue with</span></div>
              </div>

              <button
                onClick={() => setShowGoogleMock(true)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 border border-slate-100 hover:bg-slate-50 rounded-xl active:scale-[0.99] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.05c2.37-2.18 3.5-5.4 3.5-9.73z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.13-6.76-5.01H1.14v3.23C3.12 21.39 7.24 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.24 14.22a7.12 7.12 0 0 1 0-4.44V6.55H1.14a11.94 11.94 0 0 0 0 10.9l4.1-3.23z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.24 0 3.12 2.61 1.14 6.55l4.1 3.23c.95-2.88 3.61-5.03 6.76-5.03z"/>
                </svg>
                <span className="text-xs font-black text-slate-600">Google Account</span>
              </button>
            </div>
            
          </div>
        </div>

      </main>

      {/* Google Mock Modal */}
      {showGoogleMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-6 border border-slate-100 text-slate-900 text-left">
            <div className="flex items-center space-x-2.5 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.05c2.37-2.18 3.5-5.4 3.5-9.73z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.13-6.76-5.01H1.14v3.23C3.12 21.39 7.24 24 12 24z"/>
                <path fill="#FBBC05" d="M5.24 14.22a7.12 7.12 0 0 1 0-4.44V6.55H1.14a11.94 11.94 0 0 0 0 10.9l4.1-3.23z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.24 0 3.12 2.61 1.14 6.55l4.1 3.23c.95-2.88 3.61-5.03 6.76-5.03z"/>
              </svg>
              <span className="font-extrabold text-sm text-slate-800">Sign in with Google</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter your email to simulate Google popup selection:
            </p>
            <form onSubmit={handleMockGoogleLogin} className="space-y-4">
              <input
                type="email"
                required
                placeholder="email@gmail.com"
                value={mockGoogleEmail}
                onChange={(e) => setMockGoogleEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-100 rounded-xl text-xs font-bold focus:border-amber-500 focus:outline-none text-slate-800 bg-slate-50"
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
      <footer className="py-5 border-t border-slate-100 bg-white/50 backdrop-blur-md text-center text-[11px] font-bold text-slate-400 z-10">
        © 2026 Kiranam.in Hyperlocal Marketplace. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
