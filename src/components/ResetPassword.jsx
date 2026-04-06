// === THE FIX: COMPLETE VISUAL THEME OVERRIDE (LGU EMERALD) ===
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoLockClosed, IoEye, IoEyeOff, IoCheckmarkCircle, IoWarning } from "react-icons/io5";

function ResetPassword() {
  const { token } = useParams(); 
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [status, setStatus] = useState({ loading: false, error: '', success: false });

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: false });

    if (passwords.new.length < 8) {
        return setStatus({ loading: false, error: 'Password must be at least 8 characters long.', success: false });
    }
    if (passwords.new !== passwords.confirm) {
        return setStatus({ loading: false, error: 'Passwords do not match.', success: false });
    }

    try {
      await axios.post(`https://tricycheck-api.onrender.com/api/admin/reset-password/${token}`, {
        newPassword: passwords.new
      });

      setStatus({ loading: false, error: '', success: true });
      
      setTimeout(() => {
          navigate('/');
      }, 3000);

    } catch (err) {
      setStatus({ 
          loading: false, 
          error: err.response?.data?.error || 'Recovery link has expired or is invalid. Please request a new one.', 
          success: false 
      });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-slate-900">
      
      {/* === LGU MUNICIPAL BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-bg-emerald-900/40 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg-emerald-900 via-transparent to-transparent z-20"></div>
        <img 
            src="/calasiao-municipal.jpg" 
            alt="Calasiao Municipal Hall" 
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-80" 
            onError={(e) => { e.target.style.display = 'none'; }} 
        />
      </div>

      <div className="w-full max-w-md p-8 bg-emerald-900/85 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-emerald-500/30 relative z-10 animate-slide-up mx-4">
        
        {status.success ? (
            <div className="text-center py-8 animate-fade-in">
                <div className="w-20 h-20 bg-bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-500/50">
                    <IoCheckmarkCircle className="text-5xl text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Password Secured</h2>
                <p className="text-xs font-medium text-emerald-200/70 mb-6 px-4 leading-relaxed">Your administrative clearance has been restored. Redirecting to the secure gateway...</p>
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        ) : (
            <>
                {/* LGU HEADER LOGIC */}
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] border-4 border-emerald-400 mb-6 relative">
                     <img 
                         src="/poso-logo.jpg" 
                         alt="POSO Logo" 
                         className="w-16 h-16 object-contain rounded-full" 
                         onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1000/1000966.png'; }}
                     />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight">New Password</h1>
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.15em] mt-1">POSO Admin Recovery</p>
                </div>

                {status.error && (
                    <div className="mb-6 p-4 bg-red-500/20 border-l-4 border-red-500 rounded-r-xl flex items-start">
                        <IoWarning className="text-red-400 text-lg mr-2 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-200">{status.error}</p>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                    {/* New Password Field */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/70 group-focus-within:text-emerald-300 transition-colors">
                            <IoLockClosed className="text-xl" />
                        </div>
                        <input 
                            type={showNew ? "text" : "password"} 
                            required
                            className="w-full pl-11 pr-12 py-3.5 bg-bg-emerald-900/60 border border-emerald-700/50 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all text-white font-bold tracking-widest text-sm placeholder-emerald-600/60"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            disabled={status.loading}
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowNew(!showNew)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500/70 hover:text-emerald-300 transition-colors"
                        >
                            {showNew ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
                        </button>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/70 group-focus-within:text-emerald-300 transition-colors">
                            <IoLockClosed className="text-xl" />
                        </div>
                        <input 
                            type={showConfirm ? "text" : "password"} 
                            required
                            className="w-full pl-11 pr-12 py-3.5 bg-bg-emerald-900/60 border border-emerald-700/50 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all text-white font-bold tracking-widest text-sm placeholder-emerald-600/60"
                            placeholder="Confirm Password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            disabled={status.loading}
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500/70 hover:text-emerald-300 transition-colors"
                        >
                            {showConfirm ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
                        </button>
                    </div>

                    <button 
                        type="submit" 
                        disabled={status.loading}
                        className={`w-full font-black text-base py-3.5 rounded-xl shadow-xl transition-all mt-6 flex justify-center items-center relative overflow-hidden ${status.loading ? 'bg-emerald-800 text-emerald-400 cursor-not-allowed' : 'bg-amber-400 text-bg-emerald-900 hover:bg-amber-300 active:scale-95 hover:shadow-amber-500/20'}`}
                    >
                        <span className="relative z-10">{status.loading ? 'Authenticating...' : 'Confirm Security Key'}</span>
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;