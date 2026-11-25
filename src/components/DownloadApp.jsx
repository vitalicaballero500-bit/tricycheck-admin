import React from 'react';
import {
  IoDownloadOutline,
  IoShieldCheckmark,
  IoLocationSharp,
  IoPhonePortraitOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline
} from 'react-icons/io5';

const APK_DOWNLOAD_URL =
  'https://github.com/vitalicaballero500-bit/tricycheck-app/releases/download/v4.17.0/TricyCheck.apk';

function DownloadApp() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-slate-900 py-8 px-4">
      {/* === LGU MUNICIPAL BACKGROUND === */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-emerald-950/60 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-900/40 to-transparent z-20"></div>
        <img
          src="/calasiao-municipal.jpg"
          alt="Calasiao Municipal Hall"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-75"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* === COMMUTER DOWNLOAD CARD === */}
      <div className="w-full max-w-md p-7 sm:p-8 bg-emerald-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-emerald-500/30 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] border-4 border-emerald-400 mb-4 relative">
            <img
              src="/poso-logo.jpg"
              alt="Calasiao POSO Logo"
              className="w-16 h-16 object-contain rounded-full"
              onError={(e) => {
                e.target.src = 'https://cdn-icons-png.flaticon.com/512/1000/1000966.png';
              }}
            />
            <div className="absolute -bottom-2 bg-amber-400 text-emerald-950 text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md border-2 border-white">
              Calasiao LGU
            </div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">TricyCheck</h1>
          <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-[0.14em] mt-1">
            Official Commuter &amp; Driver App
          </p>
          <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed">
            Book POSO-verified tricycles, track drivers live in Calasiao, and view transparent municipal fares.
          </p>
        </div>

        {/* === APP DETAILS === */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl py-2.5 px-2">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Version</p>
            <p className="text-xs font-black text-white mt-0.5">v4.17.0</p>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl py-2.5 px-2">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">File Size</p>
            <p className="text-xs font-black text-white mt-0.5">36.6 MB</p>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl py-2.5 px-2">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Platform</p>
            <p className="text-xs font-black text-white mt-0.5">Android 8+</p>
          </div>
        </div>

        {/* === PRIMARY DOWNLOAD BUTTON === */}
        <a
          href={APK_DOWNLOAD_URL}
          download="TricyCheck.apk"
          className="w-full bg-amber-400 text-emerald-950 font-black text-base py-4 px-5 rounded-2xl shadow-xl hover:bg-amber-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
        >
          <IoDownloadOutline className="text-2xl stroke-[2.5]" />
          <span>Download TricyCheck (.apk)</span>
        </a>

        {/* === KEY FEATURES === */}
        <div className="mt-6 space-y-2.5 bg-emerald-950/50 border border-emerald-700/40 rounded-2xl p-4">
          <div className="flex items-start gap-2.5 text-xs text-emerald-100">
            <IoShieldCheckmark className="text-emerald-400 text-base shrink-0 mt-0.5" />
            <span><strong>POSO-Verified Drivers:</strong> Check Body No. or Plate No. before riding.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-emerald-100">
            <IoLocationSharp className="text-emerald-400 text-base shrink-0 mt-0.5" />
            <span><strong>Live Calasiao GPS:</strong> Track your assigned tricycle and Boarding Pass QR.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-emerald-100">
            <IoCheckmarkCircle className="text-emerald-400 text-base shrink-0 mt-0.5" />
            <span><strong>Official LGU Fare Matrix:</strong> Clear fare preview before you book.</span>
          </div>
        </div>

        {/* === ANDROID INSTALL REMINDER === */}
        <div className="mt-4 p-3.5 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-start gap-2.5">
          <IoPhonePortraitOutline className="text-amber-300 text-lg shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-100/90 leading-relaxed">
            <strong className="text-amber-300 block mb-0.5">How to install on Android:</strong>
            1. Tap <strong>Download TricyCheck (.apk)</strong> above.<br />
            2. Open the downloaded file from your notification bar.<br />
            3. If prompted, tap <strong>Settings &rarr; Allow from this source</strong>, then tap <strong>Install</strong>.
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-emerald-700/50 flex items-center justify-center gap-1.5 text-[10px] text-emerald-300/75 font-bold uppercase tracking-wider text-center">
          <IoAlertCircleOutline className="text-sm shrink-0" />
          <span>Municipality of Calasiao &bull; POSO Regulated</span>
        </div>
      </div>
    </div>
  );
}

export default DownloadApp;
