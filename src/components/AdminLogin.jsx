import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// === THE FIX: Injected required icons for Catseye and Modal ===
import { IoPerson, IoLockClosed, IoEye, IoEyeOff, IoMail, IoClose } from "react-icons/io5";
import axios from 'axios'; 

function AdminLogin() {
  const navigate = useNavigate();
  
  // === NEW FEATURE: UI STATES FOR CATSEYE AND FORGOT PASSWORD MODAL ===
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });

  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('https://tricycheck-api.onrender.com/api/auth/admin-login', { 
        username: credentials.username, 
        password: credentials.password 
      });

      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminUser', JSON.stringify(response.data.user));
      
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Server connection failed. Please check your connection.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // === NEW FEATURE: SECURE RECOVERY API HANDLER ===
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg({ text: 'Verifying credentials...', type: 'info' });
    try {
      const res = await axios.post('https://tricycheck-api.onrender.com/api/admin/forgot-password', { email: forgotEmail });
      setForgotMsg({ text: res.data.message || 'Recovery link dispatched.', type: 'success' });
    } catch (err) {
      setForgotMsg({ text: err.response?.data?.error || 'Failed to dispatch recovery link.', type: 'error' });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-slate-900">
      
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-angkasBlue/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md p-8 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 relative z-10 animate-slide-up mx-4">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-posoDark to-slate-800 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-6">
             <img src="/poso-logo.jpg" alt="POSO Logo" className="w-14 h-14 object-contain rounded-full shadow-inner transform -rotate-3 bg-white p-1" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">TricyCheck</h1>
          <p className="text-xs font-bold text-angkasBlue uppercase tracking-[0.2em] mt-1">POSO Command Center</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
            <p className="text-xs font-bold text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-angkasBlue transition-colors">
                <IoPerson className="text-xl" />
              </div>
              <input 
                type="text" 
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-emerald-100/50 transition-all text-slate-800 font-bold tracking-widest text-sm"
                placeholder="Administrator Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                disabled={isLoading}
              />
            </div>

            {/* === THE FIX: Password Visibility Toggle ("Catseye") === */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-angkasBlue transition-colors">
                <IoLockClosed className="text-xl" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full pl-10 pr-12 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-emerald-100/50 transition-all text-slate-800 font-bold tracking-widest text-sm"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
              </button>
            </div>
            
            {/* === THE FIX: Forgot Password Trigger === */}
            <div className="flex justify-end mt-2">
               <button 
                  type="button" 
                  onClick={() => setShowForgot(true)} 
                  className="text-xs font-bold text-angkasBlue hover:text-posoDark transition-colors"
               >
                  Forgot Administrator Password?
               </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold text-base py-3.5 rounded-xl shadow-xl transition-all mt-6 flex justify-center items-center relative overflow-hidden ${isLoading ? 'bg-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-posoDark to-slate-800 hover:shadow-2xl hover:scale-[1.02] active:scale-95'}`}
          >
            <span className="relative z-10">{isLoading ? 'Authenticating...' : 'Secure Access Login'}</span>
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-200/50 pt-4">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Authorized POSO Personnel Only.<br/>Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* === NEW FEATURE: THE SECURE RECOVERY MODAL OVERLAY === */}
      {showForgot && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowForgot(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm z-10 p-6 animate-slide-up relative">
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
              <IoClose className="text-xl" />
            </button>
            
            <div className="w-14 h-14 bg-blue-50 text-angkasBlue rounded-full flex items-center justify-center mb-4 mx-auto shadow-inner border border-blue-100">
               <IoMail className="text-2xl" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2 tracking-tight">Admin Recovery</h3>
            <p className="text-xs font-medium text-slate-500 text-center mb-6 leading-relaxed px-2">
              Enter your official registered email address to receive a secure, cryptographic recovery link.
            </p>
            
            <form onSubmit={handleForgotPassword} className="space-y-5">
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-angkasBlue transition-colors">
                    <IoPerson className="text-lg" />
                  </div>
                  <input 
                    type="email" 
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-emerald-100/50 transition-all text-slate-800 font-bold text-sm tracking-wide"
                    placeholder="admin@calasiao.gov.ph"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
               </div>
               
               {forgotMsg.text && (
                  <div className={`p-3 rounded-xl border ${forgotMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : forgotMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-angkasBlue'}`}>
                     <p className="text-[10px] font-bold text-center uppercase tracking-wider">{forgotMsg.text}</p>
                  </div>
               )}

               <button type="submit" className="w-full bg-posoDark text-white font-black py-3.5 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-800/20">
                  Send Recovery Link
               </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminLogin;