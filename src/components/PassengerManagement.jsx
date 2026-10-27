import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import CustomModal from './CustomModal';
import { 
  IoPeople, IoSearch, IoLockOpen, IoKey, 
  IoWarning, IoClose, IoShieldCheckmark 
} from 'react-icons/io5';

function PassengerManagement() {
  const [passengers, setPassengers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [loading, setLoading] = useState(true);

  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "warning", isConfirm: false });
  const [targetAction, setTargetAction] = useState({ type: null, userId: null, payload: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // === PASSENGER PROGRESSIVE OFFENSE TRIBUNAL MODAL STATE ===
  const [tribunalModal, setTribunalModal] = useState({
    isOpen: false,
    passenger: null,
    offenseTier: '1st Offense',
    presetReason: 'Joy Booking / Fake Ride Request',
    customReason: '',
    isSubmitting: false
  });

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchPassengers = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/passengers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPassengers(response.data);
    } catch (error) { 
      console.error("Failed to fetch passengers", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchPassengers(); 
    const interval = setInterval(fetchPassengers, 8000);
    
    const checkTeleport = () => {
      const query = localStorage.getItem('teleportPassengerQuery');
      if (query) {
        setSearchTerm(query);
        localStorage.removeItem('teleportPassengerQuery');
      }
    };
    checkTeleport();
    window.addEventListener('passengerTeleport', checkTeleport);
    return () => {
      clearInterval(interval);
      window.removeEventListener('passengerTeleport', checkTeleport);
    };
  }, []);

  // Open Progressive Offense Modal and auto-suggest next offense tier
  const openPassengerTribunal = (passenger) => {
    const prevOffenses = passenger.offenseCount || 0;
    let suggestedTier = '1st Offense';
    if (prevOffenses === 1 || passenger.offenseTier === '1st Offense') suggestedTier = '2nd Offense';
    if (prevOffenses >= 2 || passenger.offenseTier === '2nd Offense') suggestedTier = '3rd Offense';

    setTribunalModal({
      isOpen: true,
      passenger,
      offenseTier: suggestedTier,
      presetReason: 'Joy Booking / Fake Ride Request',
      customReason: '',
      isSubmitting: false
    });
  };

  const handleRestoreClick = (passenger) => {
    setTargetAction({ type: 'RESTORE', userId: passenger._id, payload: passenger });
    setModalState({ 
      isOpen: true, 
      title: "Lift Restriction & Restore Access?", 
      message: `Are you sure you want to lift the ${passenger.offenseTier || passenger.status} restriction for ${passenger.firstName} ${passenger.lastName} and restore their ride booking privileges?`, 
      type: "success", 
      isConfirm: true 
    });
  };

  const handleResetPasswordClick = (userId, name) => {
    setTargetAction({ type: 'RESET', userId, payload: null });
    setModalState({ isOpen: true, title: "RESET PASSWORD", message: `Generate a new temporary password for ${name}?`, type: "warning", isConfirm: true });
  };

  const executeAction = async () => {
    closeModal();
    const { type, userId } = targetAction;
    const currentAdminId = adminUser._id || adminUser.id;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    if (type === 'RESTORE') {
      try {
        await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${userId}/status`, { 
          status: 'Active', 
          adminId: currentAdminId 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPassengers(); 
        setTimeout(() => setModalState({ isOpen: true, title: "Access Restored", message: "Passenger account is now Active. Official notice sent to their Gmail and App Inbox.", type: "success", isConfirm: false }), 300);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to restore passenger status.", type: "warning", isConfirm: false }), 300);
      }
    } else if (type === 'RESET') {
      try {
        const response = await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${userId}/reset-password`, {
          adminId: currentAdminId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTimeout(() => setModalState({ isOpen: true, title: "Reset Successful", message: `Temporary Password Reset Complete.`, type: "success", isConfirm: false }), 300);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to reset password.", type: "warning", isConfirm: false }), 300);
      }
    }
  };

  const executeDeployOffense = async () => {
    if (!tribunalModal.passenger) return;
    const finalReason = tribunalModal.customReason.trim() 
      ? `${tribunalModal.presetReason} — ${tribunalModal.customReason.trim()}`
      : tribunalModal.presetReason;

    setTribunalModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const currentAdminId = adminUser._id || adminUser.id;
      const targetStatus = tribunalModal.offenseTier === '3rd Offense' ? 'Banned' : 'Suspended';

      await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${tribunalModal.passenger._id}/status`, {
        status: targetStatus,
        offenseTier: tribunalModal.offenseTier,
        reason: finalReason,
        adminId: currentAdminId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTribunalModal({ isOpen: false, passenger: null, offenseTier: '1st Offense', presetReason: 'Joy Booking / Fake Ride Request', customReason: '', isSubmitting: false });
      fetchPassengers();
      setModalState({
        isOpen: true,
        title: `${tribunalModal.offenseTier} Deployed`,
        message: `Official POSO disciplinary notice has been dispatched to the passenger's Gmail, In-App Inbox, and Live Lockout Screen.`,
        type: "success",
        isConfirm: false
      });
    } catch (error) {
      setTribunalModal(prev => ({ ...prev, isSubmitting: false }));
      setModalState({
        isOpen: true,
        title: "Action Failed",
        message: error.response?.data?.error || "Failed to deploy passenger penalty.",
        type: "warning",
        isConfirm: false
      });
    }
  };

  const filteredPassengers = passengers
    .filter(p => {
      const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.phone && p.phone.includes(searchTerm)) ||
                            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const currentStatus = p.status || 'Active';
      const matchesStatus = filterStatus === 'All' || currentStatus === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      if (sortBy === 'A-Z') return nameA.localeCompare(nameB);
      if (sortBy === 'Z-A') return nameB.localeCompare(nameA);
      if (sortBy === 'Offenses') return (b.offenseCount || 0) - (a.offenseCount || 0);
      if (sortBy === 'Oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoPeople className="text-emerald-600 mr-2" /> Passenger Oversight & Offense Tribunal
          </h2>
          <p className="text-sm font-medium text-slate-500">Manage registered commuters and enforce progressive 1st, 2nd, and 3rd offense penalties.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-sm font-bold text-slate-600 shadow-sm cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
            <option value="A-Z">Name (A–Z)</option>
            <option value="Z-A">Name (Z–A)</option>
            <option value="Offenses">Most Offenses First</option>
          </select>

          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-sm font-bold text-slate-600 shadow-sm cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">🟢 Active Only</option>
            <option value="Suspended">🟠 Suspended (1st/2nd Offense)</option>
            <option value="Banned">🔴 Banned (3rd Offense)</option>
          </select>

          <div className="relative w-72">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, phone, or email..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-sm font-bold shadow-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <th className="p-5 pl-8">Passenger Name</th>
              <th className="p-5">Contact Number</th>
              <th className="p-5">Registered Email</th>
              <th className="p-5">Account & Offense Status</th>
              <th className="p-5 pr-8 text-right">Disciplinary Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPassengers.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-5 pl-8">
                  <p className="font-black text-slate-800">{p.firstName} {p.lastName}</p>
                  {p.offenseCount > 0 && (
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                      Recorded Offenses: {p.offenseCount}
                    </span>
                  )}
                </td>
                <td className="p-5 font-mono text-sm text-slate-500">
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg font-bold text-slate-600">{p.phone}</span>
                </td>
                <td className="p-5 text-sm font-medium text-slate-600">{p.email || 'No email attached'}</td>
                <td className="p-5">
                  <div className="flex flex-col space-y-1">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-max ${
                      p.status === 'Banned' 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : p.status === 'Suspended'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {p.status === 'Active' || !p.status ? 'Active' : `${p.status} (${p.offenseTier || 'Restricted'})`}
                    </span>
                    {(p.status === 'Suspended' || p.status === 'Banned') && p.suspensionReason && (
                      <span className="text-[11px] font-bold text-slate-500 italic max-w-xs truncate" title={p.suspensionReason}>
                        "{p.suspensionReason}"
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-5 pr-8 text-right space-x-2">
                  {(p.status === 'Banned' || p.status === 'Suspended') ? (
                    <button 
                      onClick={() => handleRestoreClick(p)} 
                      className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors shadow-sm"
                    >
                      <IoLockOpen /> <span>Lift Restriction</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => openPassengerTribunal(p)} 
                      className="inline-flex items-center space-x-1.5 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-colors shadow-sm"
                    >
                      <IoWarning className="text-sm" /> <span>Issue Penalty</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredPassengers.length === 0 && (
              <tr>
                <td colSpan="5" className="p-10 text-center text-slate-400 font-bold">
                  No passengers found matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === PASSENGER PROGRESSIVE OFFENSE TRIBUNAL MODAL === */}
      {tribunalModal.isOpen && tribunalModal.passenger && createPortal(
        <div className="fixed inset-0 z-[2060] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !tribunalModal.isSubmitting && setTribunalModal(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-red-900 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-xl font-black flex items-center">
                  <IoWarning className="mr-2 text-amber-400" /> Commuter Disciplinary Console
                </h2>
                <p className="text-xs font-bold text-red-200 mt-1 uppercase tracking-widest">
                  {tribunalModal.passenger.firstName} {tribunalModal.passenger.lastName} • {tribunalModal.passenger.phone}
                </p>
              </div>
              <button 
                onClick={() => !tribunalModal.isSubmitting && setTribunalModal(prev => ({ ...prev, isOpen: false }))} 
                className="p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs font-bold text-amber-900">
                ⚡ The passenger will receive an official notice on their <b>Gmail</b>, <b>In-App Inbox</b>, and a <b>Full-Screen Lockout Popup</b> displaying their offense tier, reason, and unlock schedule.
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  1. Select Offense Tier & Penalty Duration
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { tier: '1st Offense', desc: '24-Hour Suspension' },
                    { tier: '2nd Offense', desc: '7-Day Suspension' },
                    { tier: '3rd Offense', desc: 'Permanent Ban' }
                  ].map(item => (
                    <button
                      key={item.tier}
                      type="button"
                      onClick={() => setTribunalModal(prev => ({ ...prev, offenseTier: item.tier }))}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        tribunalModal.offenseTier === item.tier
                          ? 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-black text-xs uppercase">{item.tier}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${tribunalModal.offenseTier === item.tier ? 'text-red-100' : 'text-slate-400'}`}>
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  2. Select Violation Category
                </label>
                <select
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-red-500 cursor-pointer"
                  value={tribunalModal.presetReason}
                  onChange={(e) => setTribunalModal(prev => ({ ...prev, presetReason: e.target.value }))}
                >
                  <option value="Joy Booking / Fake Ride Request">Joy Booking / Fake Ride Request</option>
                  <option value="Unpaid / Shortchanged Fare">Unpaid / Shortchanged Fare</option>
                  <option value="Rude / Abusive Conduct Toward Driver">Rude / Abusive Conduct Toward Driver</option>
                  <option value="Repeated No-Show at Pickup">Repeated No-Show at Pickup</option>
                  <option value="False Emergency / SOS Abuse">False Emergency / SOS Abuse</option>
                  <option value="Violation of LGU Commuter Guidelines">Violation of LGU Commuter Guidelines</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  3. Additional Case Details / Ticket Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reported by Body #0143 — Ref Ticket #A91B"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-red-500"
                  value={tribunalModal.customReason}
                  onChange={(e) => setTribunalModal(prev => ({ ...prev, customReason: e.target.value }))}
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  disabled={tribunalModal.isSubmitting}
                  onClick={() => setTribunalModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={tribunalModal.isSubmitting}
                  onClick={executeDeployOffense}
                  className="flex-[1.5] py-3.5 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all text-sm"
                >
                  {tribunalModal.isSubmitting ? "Deploying Notice..." : `Confirm ${tribunalModal.offenseTier}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.isConfirm ? executeAction : closeModal}
        onCancel={modalState.isConfirm ? closeModal : null}
      />
    </div>
  );
}

export default PassengerManagement;