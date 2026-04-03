import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoLockClosed, IoEye, IoEyeOff, IoCheckmarkCircle, IoWarning } from "react-icons/io5";

function ResetPassword() {
  // === NEW FEATURE: URL PARAMETER EXTRACTION ===
  // This physically rips the cryptographic token right out of the Gmail URL link
  const { token } = useParams(); 
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [status, setStatus] = useState({ loading: false, error: '', success: false });

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: false });

    // === FRONTEND VALIDATION MATRIX ===
    if (passwords.new.length < 8) {
        return setStatus({ loading: false, error: 'Password must be at least 8 characters long.', success: false });
    }
    if (passwords.new !== passwords.confirm) {
        return setStatus({ loading: false, error: 'Passwords do not match.', success: false });
    }

    try {
      // === THE FIX: SECURE TOKEN TRANSMISSION ===
      await axios.post(`https://tricycheck-api.onrender.com/api/admin/reset-password/${token}`, {
        newPassword: passwords.new
      });

      setStatus({ loading: false, error: '', success: true });
      
      // Auto-redirect to login after 3 seconds
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
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-angkasBlue/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md p-8 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 relative z-10 animate-slide-up mx-4">
        
        {status.success ? (
            <div className="text-center py-8 animate-fade-in">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                    <IoCheckmarkCircle className="text-5xl text-angkasBlue" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Password Secured</h2>
                <p className="text-sm font-medium text-slate-500 mb-6 px-4">Your administrative clearance has been restored. Redirecting to the secure gateway...</p>
                <div className="w-8 h-8 border-4 border-angkasBlue border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        ) : (
            <>
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-angkasBlue rounded-full flex items-center justify-center mb-4 shadow-inner border border-blue-100">
                        <IoLockClosed className="text-3xl" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create New Password</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">POSO Admin Recovery</p>
                </div>

                {status.error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start">
                        <IoWarning className="text-red-500 text-lg mr-2 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-700">{status.error}</p>
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                    {/* New Password Field */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-angkasBlue transition-colors">
                            <IoLockClosed className="text-lg" />
                        </div>
                        <input 
                            type={showNew ? "text" : "password"} 
                            required
                            className="w-full pl-11 pr-12 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-emerald-100/50 transition-all text-slate-800 font-bold tracking-widest text-sm"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            disabled={status.loading}
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowNew(!showNew)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showNew ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
                        </button>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-angkasBlue transition-colors">
                            <IoLockClosed className="text-lg" />
                        </div>
                        <input 
                            type={showConfirm ? "text" : "password"} 
                            required
                            className="w-full pl-11 pr-12 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl outline-none focus:border-angkasBlue focus:ring-4 focus:ring-emerald-100/50 transition-all text-slate-800 font-bold tracking-widest text-sm"
                            placeholder="Confirm New Password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            disabled={status.loading}
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showConfirm ? <IoEyeOff className="text-xl" /> : <IoEye className="text-xl" />}
                        </button>
                    </div>

                    <button 
                        type="submit" 
                        disabled={status.loading}
                        className={`w-full text-white font-black text-base py-4 rounded-xl shadow-xl transition-all mt-6 flex justify-center items-center relative overflow-hidden ${status.loading ? 'bg-slate-500 cursor-not-allowed' : 'bg-angkasBlue hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-95'}`}
                    >
                        {status.loading ? 'Securing Account...' : 'Confirm Security Key'}
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;