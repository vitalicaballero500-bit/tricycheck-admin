import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoAdd, IoClose, IoShieldCheckmark, IoKey, IoBan, IoCheckmarkCircle } from 'react-icons/io5';
import CustomModal from './CustomModal';

function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // === CUSTOM MODAL STATE ===
  const [modalState, setModalState] = useState({
    isOpen: false, title: "", message: "", type: "warning", isConfirm: false
  });
  const [targetAction, setTargetAction] = useState({ type: null, id: null, name: null, newStatus: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // === THE FIX: Swapped Password for Email ===
  const [newStaff, setNewStaff] = useState({
    firstName: '', lastName: '', username: '', email: '', role: 'secretary'
  });
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/staff');
      setStaff(response.data);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newStaff, adminId: adminUser._id || adminUser.id };
      await axios.post('https://tricycheck-api.onrender.com/api/admin/staff', payload);
      setIsModalOpen(false);
      setNewStaff({ firstName: '', lastName: '', username: '', password: '', role: 'secretary' });
      fetchStaff();
      setModalState({ isOpen: true, title: "Account Created", message: `Personnel account created successfully!`, type: "success", isConfirm: false });
    } catch (error) {
      setModalState({ isOpen: true, title: "Creation Failed", message: error.response?.data?.error || "Failed to create account.", type: "warning", isConfirm: false });
    }
  };

  // === THE NEW SOFT-DELETE ENGINE ===
  const handleToggleStatus = (member) => {
    const isCurrentlyActive = member.status === 'Active';
    const newStatus = isCurrentlyActive ? 'Suspended' : 'Active';
    const actionTitle = isCurrentlyActive ? 'Suspend Account' : 'Reactivate Account';
    const actionMsg = isCurrentlyActive 
        ? `Are you sure you want to suspend ${member.firstName}? They will no longer be able to log in, but their past records will be kept.` 
        : `Are you sure you want to restore access for ${member.firstName}? They will be able to log in again.`;

    setTargetAction({ type: 'TOGGLE_STATUS', id: member._id, name: member.firstName, newStatus });
    setModalState({ isOpen: true, title: actionTitle, message: actionMsg, type: "warning", isConfirm: true });
  };

  const handleResetPasswordClick = (id, name) => {
    setTargetAction({ type: 'RESET', id, name });
    setModalState({ isOpen: true, title: "Reset Password", message: `Generate a new temporary password for ${name}?`, type: "warning", isConfirm: true });
  };

  const executeAction = async () => {
    closeModal();
    const { type, id, name, newStatus } = targetAction;
    const currentAdminId = adminUser._id || adminUser.id;

    if (type === 'TOGGLE_STATUS') {
      try {
        await axios.put(`https://tricycheck-api.onrender.com/api/admin/staff/${id}/status`, { status: newStatus, adminId: currentAdminId });
        fetchStaff();
        setTimeout(() => setModalState({ isOpen: true, title: "Status Updated", message: `Personnel account is now ${newStatus}.`, type: "success", isConfirm: false }), 300);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to update account status.", type: "warning", isConfirm: false }), 300);
      }
    } else if (type === 'RESET') {
      try {
        const response = await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${id}/reset-password`, { adminId: currentAdminId });
        setTimeout(() => setModalState({ isOpen: true, title: "Reset Successful", message: `New Password: ${response.data.tempPassword} \n\nPlease provide this to the personnel.`, type: "success", isConfirm: false }), 300);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to reset password.", type: "warning", isConfirm: false }), 300);
      }
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoShieldCheckmark className="text-angkasBlue mr-2" /> Access Control Matrix
          </h2>
          <p className="text-sm font-medium text-slate-500">Manage POSO personnel system access and security roles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-posoDark text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        >
          <IoAdd className="text-lg mr-2" /> Issue Credentials
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <th className="p-5 pl-8">Personnel Name</th>
              <th className="p-5">System Username</th>
              <th className="p-5">Security Clearance</th>
              <th className="p-5">Account Status</th>
              <th className="p-5 pr-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((member) => (
              <tr key={member._id} className={`transition-colors ${member.status === 'Suspended' ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'}`}>
                <td className="p-5 pl-8 font-bold text-slate-800">
                  {member.firstName} {member.lastName}
                </td>
                <td className="p-5 font-mono text-sm text-slate-500">{member.username}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    member.role === 'dispatcher' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {member.role}
                  </span>
                </td>
                {/* === THE NEW STATUS BADGE === */}
                <td className="p-5">
                  <span className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider shadow-sm flex items-center w-max ${
                    member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {member.status || 'Active'}
                  </span>
                </td>
                <td className="p-5 pr-8 text-right space-x-2">
                  <button 
                    onClick={() => handleResetPasswordClick(member._id, member.firstName)}
                    className="p-2 bg-emerald-50 text-angkasBlue rounded-lg hover:bg-emerald-100 transition-colors"
                    title="Reset Password"
                  >
                    <IoKey />
                  </button>
                  {/* === THE SMART TOGGLE BUTTON === */}
                  <button 
                    onClick={() => handleToggleStatus(member)}
                    className={`p-2 rounded-lg transition-colors ${
                        member.status === 'Active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={member.status === 'Active' ? "Suspend Account" : "Reactivate Account"}
                  >
                    {member.status === 'Active' ? <IoBan /> : <IoCheckmarkCircle />}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="5" className="p-10 text-center text-slate-400 font-bold">
                  No staff accounts issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-slide-up">
            <div className="bg-posoDark p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black">Issue Personnel Credentials</h2>
              <button onClick={() => setIsModalOpen(false)}><IoClose className="text-2xl hover:text-red-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  {/* === THE FIX: LIVE REGEX FILTER (Blocks numbers as they type) === */}
<input required type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={newStaff.firstName} onChange={e => setNewStaff({...newStaff, firstName: e.target.value.replace(/[^A-Za-z\s\-ñÑ]/g, '')})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  {/* === THE FIX: LIVE REGEX FILTER (Blocks numbers as they type) === */}
<input required type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={newStaff.lastName} onChange={e => setNewStaff({...newStaff, lastName: e.target.value.replace(/[^A-Za-z\s\-ñÑ]/g, '')})} />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clearance Level (Role)</label>
                <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                  <option value="secretary">Secretary (Fleet Management Only)</option>
                  <option value="dispatcher">Dispatcher (Live Map & SOS Only)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Username</label>
                <input required type="text" className="w-full p-3 bg-white border rounded-xl font-mono text-sm mb-3" placeholder="e.g. poso_juan" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} />
                
                {/* === THE FIX: Removed Manual Password, Added Official Email === */}
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official Email Address</label>
                <input required type="email" className="w-full p-3 bg-white border rounded-xl font-mono text-sm" placeholder="e.g. admin@calasiao.gov.ph" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-4 flex items-start space-x-3">
                 <IoShieldCheckmark className="text-angkasBlue text-xl shrink-0 mt-0.5" />
                 <p className="text-xs font-medium text-slate-600">A cryptographically secure password will be auto-generated and emailed directly to this staff member.</p>
              </div>

              <button type="submit" className="w-full bg-angkasBlue text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-500 active:scale-95 transition-all mt-4">
                Generate Secure Account
              </button>
            </form>
          </div>
        </div>
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

export default StaffManagement;