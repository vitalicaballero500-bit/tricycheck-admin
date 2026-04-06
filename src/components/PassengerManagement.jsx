import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomModal from './CustomModal'; 
// === THE FIX: Imported IoKey ===
import { IoPeople, IoSearch, IoHandRight, IoLockOpen, IoCall, IoKey } from 'react-icons/io5';

function PassengerManagement() {
  const [passengers, setPassengers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // === MODAL ACTION STATE UPGRADED TO SUPPORT MULTIPLE TYPES ===
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "warning", isConfirm: false });
  const [targetAction, setTargetAction] = useState({ type: null, userId: null, payload: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchPassengers = async () => {
    try {
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/passengers');
      setPassengers(response.data);
    } catch (error) { console.error("Failed to fetch passengers", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPassengers(); }, []);

  // Action 1: Ban/Unban Modal
  const handleStatusChangeClick = (userId, newStatus) => {
    const action = newStatus === 'Banned' ? "BAN" : "ACTIVATE";
    setTargetAction({ type: 'STATUS', userId, payload: newStatus });
    setModalState({ isOpen: true, title: `${action} PASSENGER`, message: `Are you sure you want to ${action} this passenger account?`, type: newStatus === 'Banned' ? 'warning' : 'success', isConfirm: true });
  };

  // Action 2: Reset Password Modal
  const handleResetPasswordClick = (userId, name) => {
    setTargetAction({ type: 'RESET', userId, payload: null });
    setModalState({ isOpen: true, title: "RESET PASSWORD", message: `Generate a new temporary password for ${name}?`, type: "warning", isConfirm: true });
  };

  // Shared Execution Function
  // Shared Execution Function
  const executeAction = async () => {
    closeModal();
    const { type, userId, payload } = targetAction;

    // === THE FIX: Grab the correct Admin ID ===
    const currentAdminId = adminUser._id || adminUser.id;

    if (type === 'STATUS') {
        try {
            await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${userId}/status`, { 
                status: payload, 
                adminId: currentAdminId // <-- INJECTED HERE
            });
            fetchPassengers(); 
            setTimeout(() => setModalState({ isOpen: true, title: "Status Updated", message: `Passenger account is now ${payload}.`, type: "success", isConfirm: false }), 300);
        } catch (error) {
            setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to update status. Check connection.", type: "warning", isConfirm: false }), 300);
        }
    } else if (type === 'RESET') {
        try {
            // === THE FIX: Payload added to Reset Password ===
            const response = await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${userId}/reset-password`, {
                adminId: currentAdminId // <-- INJECTED HERE
            });
            setTimeout(() => setModalState({ isOpen: true, title: "Reset Successful", message: `Temporary Password: ${response.data.tempPassword} \n\nPlease provide this to the user.`, type: "success", isConfirm: false }), 300);
        } catch (error) {
            setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to reset password. Check connection.", type: "warning", isConfirm: false }), 300);
        }
    }
  };

  const filteredPassengers = passengers.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoPeople className="text-emerald-600 mr-2" /> Passenger Oversight
          </h2>
          <p className="text-sm font-medium text-slate-500">Manage registered commuters and account security.</p>
        </div>
        
        <div className="relative w-72">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name or phone..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-sm font-bold shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <th className="p-5 pl-8">Passenger Name</th>
              <th className="p-5">Contact Number</th>
              <th className="p-5">Account Status</th>
              <th className="p-5 pr-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPassengers.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-5 pl-8 font-bold text-slate-800">{p.firstName} {p.lastName}</td>
                <td className="p-5 font-mono text-sm text-slate-500">
                   <div className="flex items-center space-x-2">
                      <span>{p.phone}</span>
                      <a href={`tel:${p.phone}`} className="opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity"><IoCall /></a>
                   </div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === 'Banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {p.status || 'Active'}
                  </span>
                </td>
                <td className="p-5 pr-8 text-right space-x-2">
                  
                  {/* === THE FIX: NEW PASSWORD RESET BUTTON === */}
                  <button 
                    onClick={() => handleResetPasswordClick(p._id, `${p.firstName} ${p.lastName}`)}
                    className="inline-flex items-center justify-center p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                    title="Reset Password"
                  >
                    <IoKey />
                  </button>

                  {p.status === 'Banned' ? (
                    <button onClick={() => handleStatusChangeClick(p._id, 'Active')} className="inline-flex items-center space-x-1 bg-green-50 text-green-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                      <IoLockOpen /> <span>Lift Ban</span>
                    </button>
                  ) : (
                    <button onClick={() => handleStatusChangeClick(p._id, 'Banned')} className="inline-flex items-center space-x-1 bg-red-50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                      <IoHandRight /> <span>Ban Hammer</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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