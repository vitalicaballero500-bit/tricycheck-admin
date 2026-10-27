import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoSettings, IoCash, IoSpeedometer, IoSave, IoRefresh } from 'react-icons/io5';
import CustomModal from './CustomModal';

function SystemSettings() {
  const [settings, setSettings] = useState({ baseFare: 12, perKmRate: 1 });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // === MODAL STATE ===
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (response.data) {
        setSettings({
          baseFare: response.data.baseFare || 12,
          perKmRate: response.data.perKmRate || 1
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
      setModalState({ isOpen: true, title: "Sync Error", message: "Failed to connect to the POSO configuration server.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    // === THE FIX: ENTERPRISE GATEKEEPER VALIDATION ===
    const base = Number(settings.baseFare);
    const perKm = Number(settings.perKmRate);

    if (isNaN(base) || isNaN(perKm) || settings.baseFare === "" || settings.perKmRate === "") {
      return setModalState({ isOpen: true, title: "Invalid Input", message: "Fare values cannot be blank.", type: "warning" });
    }
    if (base < 0 || perKm < 0) {
      return setModalState({ isOpen: true, title: "Invalid Math", message: "Fares cannot be negative numbers.", type: "warning" });
    }

    setIsSaving(true);
    try {
      await axios.put('https://tricycheck-api.onrender.com/api/admin/settings', {
        baseFare: Number(settings.baseFare),
        perKmRate: Number(settings.perKmRate),
        adminId: adminUser._id || adminUser.id 
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setModalState({ 
        isOpen: true, 
        title: "Matrix Updated", 
        message: "The new POSO Fare Matrix has been broadcasted to all mobile apps successfully.", 
        type: "success" 
      });
    } catch (error) {
      setModalState({ 
        isOpen: true, 
        title: "Update Failed", 
        message: "Failed to save the new fare settings. Please try again.", 
        type: "warning" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col animate-fade-in relative">
      {/* COMPACT HEADER BAR */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center">
            <IoSettings className="text-emerald-600 mr-2" /> System Ordinance
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Manage dynamic global variables like the Calasiao LGU Fare Matrix.
          </p>
        </div>
        
        <button 
          onClick={fetchSettings} 
          className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-colors"
        >
          <IoRefresh className={loading ? "animate-spin text-emerald-600" : ""} /> <span>Sync</span>
        </button>
      </div>

      {/* ZERO-SCROLL 2-COLUMN EXECUTIVE GRID */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">POSO Fare Matrix Engine</h3>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            Live Broadcast Active
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 font-bold animate-pulse">
            Loading Configuration Vault...
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* LEFT COLUMN (7 COLS): TARIFF INPUT CONTROLS + SAVE BUTTON */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              
              {/* SETTING 1: BASE FARE */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-3.5 pr-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-emerald-200 shrink-0">
                    <IoCash />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base leading-tight">Base Fare (First 1 KM)</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Mandatory minimum charge per passenger seat for the first 1,000 meters.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-xl font-black text-slate-400">₱</span>
                  <input 
                    type="number" 
                    min="0"
                    className="w-20 text-2xl font-black text-emerald-600 p-2 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-center shadow-inner"
                    value={settings.baseFare}
                    onChange={(e) => setSettings({...settings, baseFare: e.target.value})}
                  />
                </div>
              </div>

              {/* SETTING 2: PER KM RATE */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-3.5 pr-3">
                  <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-orange-200 shrink-0">
                    <IoSpeedometer />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base leading-tight">Succeeding Rate (Per KM)</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Additional charge per passenger seat for every kilometer after 1,000 meters.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-xl font-black text-slate-400">₱</span>
                  <input 
                    type="number" 
                    min="0"
                    className="w-20 text-2xl font-black text-emerald-600 p-2 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-center shadow-inner"
                    value={settings.perKmRate}
                    onChange={(e) => setSettings({...settings, perKmRate: e.target.value})}
                  />
                </div>
              </div>

              {/* SAVE & BROADCAST ACTION BAR */}
              <div className="pt-1 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold text-slate-400 leading-snug">
                  Changes broadcast immediately to all active Passenger and Driver apps.
                </p>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving || loading}
                  className="bg-emerald-900 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg hover:bg-emerald-800 active:scale-95 transition-all disabled:bg-slate-400 shrink-0"
                >
                  {isSaving ? (
                    <span className="animate-pulse">Broadcasting...</span>
                  ) : (
                    <>
                      <IoSave className="text-base" />
                      <span>Save & Broadcast Matrix</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN (5 COLS): LIVE PAKYAW (X4 SEATS) ORDINANCE PREVIEW */}
            <div className="lg:col-span-5 bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-800 shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between border-b border-emerald-800/80 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">
                    On-Demand App Charter (4-Seat Pakyaw)
                  </span>
                  <h4 className="text-sm font-black text-white mt-0.5">
                    Live Computed Tariff Preview
                  </h4>
                </div>
                <span className="bg-emerald-800 text-emerald-200 text-[9px] font-black px-2.5 py-1 rounded-full uppercase shrink-0">
                  × 4 Seats
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="bg-emerald-900/60 border border-emerald-800 px-4 py-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-300 uppercase">First 1,000 Meters (1.0 km)</p>
                    <p className="text-[10px] font-bold text-emerald-400">₱{settings.baseFare || 0} base × 4 seats</p>
                  </div>
                  <p className="text-lg font-black text-white">
                    ₱{(Number(settings.baseFare) || 0) * 4}.00
                  </p>
                </div>

                <div className="bg-emerald-900/60 border border-emerald-800 px-4 py-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-300 uppercase">Every Succeeding KM</p>
                    <p className="text-[10px] font-bold text-emerald-400">₱{settings.perKmRate || 0}/km × 4 seats</p>
                  </div>
                  <p className="text-lg font-black text-amber-400">
                    +₱{(Number(settings.perKmRate) || 0) * 4}.00/km
                  </p>
                </div>

                <div className="bg-emerald-900/90 border border-emerald-600 px-4 py-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-amber-300 uppercase">Sample 1.70 km (1,700m) Ride</p>
                    <p className="text-[10px] font-bold text-emerald-300">1,000m Base + 700m (1st Extra KM)</p>
                  </div>
                  <p className="text-xl font-black text-emerald-300">
                    ₱{((Number(settings.baseFare) || 0) * 4) + ((Number(settings.perKmRate) || 0) * 4)}.00
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={closeModal}
      />
    </div>
  );
}

export default SystemSettings;