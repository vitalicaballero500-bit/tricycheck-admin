import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoPerson, IoLockClosed, IoEye, IoEyeOff, IoMail, IoClose } from "react-icons/io5";
import axios from 'axios'; 

function AdminLogin() {
  const navigate = useNavigate();
  
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

      if (response.data.user.requiresPasswordChange) {
          setError("SECURITY LOCKDOWN: Temporary password detected. You must click 'Forgot Credentials?' below to generate your permanent security key.");
          setIsLoading(false);
          return; 
      }

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
      
      {/* === LGU MUNICIPAL BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-emerald-900/40 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 via-transparent to-transparent z-20"></div>
        <img 
            src="/calasiao-municipal.jpg" 
            alt="Calasiao Municipal Hall" 
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" 
            onError={(e) => { e.target.style.display = 'none'; }} 
        />
      </div>

      {/* === LGU PREMIUM EMERALD THEME === */}
      <div className="w-full max-w-md p-8 bg-emerald-900/85 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-emerald-500/30 relative z-10 animate-slide-up mx-4">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] border-4 border-emerald-400 mb-6 relative">
             <img 
                 src="/poso-logo.jpg" 
                 alt="POSO Logo" 
                 className="w-20 h-20 object-contain rounded-full" 
                 onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1000/1000966.png'; }}
             />
             <div className="absolute -bottom-2 bg-amber-400 text-emerald-900 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md border-2 border-white">
                 Calasiao LGU
             </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TricyCheck</h1>
          <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.15em] mt-1">POSO Command Center</p>
          <p className="text-[9px] font-bold text-emerald-200/60 uppercase tracking-widest mt-1">Mayor Caramat Administration</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border-l-4 border-red-500 rounded-r-xl">
            <p className="text-xs font-bold text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/70 group-focus-within:text-emerald-300 transition-colors">
                <IoPerson className="text-xl" />
              </div>
              <input 
                type="text" 
                required
                className="w-full pl-11 pr-4 py-3.5 bg-emerald-900/60 border border-emerald-700/50 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all text-white font-bold tracking-widest text-sm placeholder-emerald-600/60"
                placeholder="System Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/70 group-focus-within:text-emerald-300 transition-colors">
                <IoLockClosed className="text-xl" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full pl-11 pr-12 py-3.5 bg-emerald-900/60 border border-emerald-700/50 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all text-white font-bold tracking-widest text-sm placeholder-emerald-600/60"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500/70 hover:text-emerald-300 transition-colors"
              >
                {showPassword ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
              </button>
            </div>
            
            <div className="flex justify-end mt-2">
               <button 
                  type="button" 
                  onClick={() => setShowForgot(true)} 
                  className="text-[10px] font-bold text-emerald-400 hover:text-amber-400 transition-colors tracking-wide"
               >
                  Forgot Credentials?
               </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full font-black text-base py-3.5 rounded-xl shadow-xl transition-all mt-6 flex justify-center items-center relative overflow-hidden ${isLoading ? 'bg-emerald-800 text-emerald-400 cursor-not-allowed' : 'bg-amber-400 text-emerald-900 hover:bg-amber-300 active:scale-95 hover:shadow-amber-500/20'}`}
          >
            <span className="relative z-10">{isLoading ? 'Authenticating...' : 'Secure Access Login'}</span>
          </button>
        </form>

        <div className="mt-6 text-center border-t border-emerald-700/50 pt-4">
          <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest leading-relaxed">
            Authorized POSO Personnel Only.<br/>Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* === THE SECURE RECOVERY MODAL OVERLAY === */}
      {showForgot && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-emerald-900/80 backdrop-blur-sm" onClick={() => setShowForgot(false)}></div>
          <div className="bg-emerald-900 border border-emerald-500/30 rounded-3xl shadow-2xl w-full max-w-sm z-10 p-6 animate-slide-up relative">
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 p-2 text-emerald-500/70 hover:text-emerald-300 transition-colors active:scale-90">
              <IoClose className="text-xl" />
            </button>
            
            <div className="w-14 h-14 bg-emerald-900 text-amber-400 rounded-full flex items-center justify-center mb-4 mx-auto shadow-inner border border-emerald-700/50">
               <IoMail className="text-2xl" />
            </div>
            <h3 className="text-xl font-black text-white text-center mb-2 tracking-tight">Admin Recovery</h3>
            <p className="text-xs font-medium text-emerald-200/70 text-center mb-6 leading-relaxed px-2">
              Enter your official registered email address to receive a secure recovery link.
            </p>
            
            <form onSubmit={handleForgotPassword} className="space-y-5">
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/70 group-focus-within:text-emerald-300 transition-colors">
                    <IoPerson className="text-lg" />
                  </div>
                  <input 
                    type="email" 
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-emerald-900/60 border border-emerald-700/50 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all text-white font-bold text-sm tracking-wide placeholder-emerald-600/60"
                    placeholder="admin@calasiao.gov.ph"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
               </div>
               
               {forgotMsg.text && (
                  <div className={`p-3 rounded-xl border ${forgotMsg.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-300' : forgotMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-amber-500/20 border-amber-500/50 text-amber-300'}`}>
                     <p className="text-[10px] font-bold text-center uppercase tracking-wider">{forgotMsg.text}</p>
                  </div>
               )}

               <button type="submit" className="w-full bg-amber-400 text-emerald-900 font-black py-3.5 rounded-xl hover:bg-amber-300 active:scale-[0.98] transition-all shadow-lg">
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