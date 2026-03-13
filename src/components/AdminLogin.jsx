import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoPerson, IoLockClosed } from "react-icons/io5";
import axios from 'axios'; 

function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // === UPGRADED: Real Network Request ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Send the exact credentials state to the backend
      const response = await axios.post('https://tricycheck-api.onrender.com/api/auth/admin-login', { 
        username: credentials.username, 
        password: credentials.password 
      });

      // 2. Save the Token AND the specific User Data so the Bouncer knows who it is
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminUser', JSON.stringify(response.data.user));
      
      // 3. THE FIX: Navigate to the exact route defined in App.jsx!
      navigate('/dashboard');
    } catch (err) {
      // 4. Catch errors
      const errorMessage = err.response?.data?.error || 'Server connection failed. Please check your connection.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-end pb-24 overflow-hidden p-4">
      
      {/* LAYER 1: The Image Background */}
      <div 
        className="absolute inset-0 z-0 transform scale-105 bg-center bg-cover transition-transform duration-[20s] hover:scale-110"
        style={{
           backgroundImage: "url('/calasiao-municipal.jpg')", 
           filter: 'brightness(90%) contrast(110%)' 
        }}
      ></div>

      {/* LAYER 2: The Green/Slate Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-slate-900/80 to-slate-900/20 z-10"></div>

      {/* LAYER 3: The Login Box */}
      <div className="relative z-20 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-[380px] border border-white/40 animate-slide-up">
        
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/poso-logo.png" 
            alt="POSO Calasiao Logo" 
            className="w-24 h-24 object-contain mb-3 drop-shadow-2xl"
          />
          <h1 className="text-2xl font-black text-posoDark tracking-tight text-center leading-none">TricyCheck <span className="text-lg text-angkasBlue block font-bold">Portal</span></h1>
          <div className="h-1 w-16 bg-angkasBlue rounded-full mt-3 mb-2"></div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Municipality of Calasiao</p>
        </div>

        {error && (
          <div className="bg-red-50/90 text-red-700 p-3 rounded-xl text-xs font-bold mb-5 text-center border border-red-200 animate-shake backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="group">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Admin Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IoPerson className="text-slate-400 text-base group-focus-within:text-angkasBlue transition-colors" />
              </div>
              <input 
                type="text" 
                required
                className="w-full pl-10 pr-3 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-blue-100/50 transition-all text-slate-800 font-bold text-sm"
                placeholder="Enter ID"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IoLockClosed className="text-slate-400 text-base group-focus-within:text-angkasBlue transition-colors" />
              </div>
              <input 
                type="password" 
                required
                className="w-full pl-10 pr-3 py-3 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-blue-100/50 transition-all text-slate-800 font-bold tracking-widest text-sm"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                disabled={isLoading}
              />
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
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
            Official POSO Use Only.<br/>Monitoring active.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;