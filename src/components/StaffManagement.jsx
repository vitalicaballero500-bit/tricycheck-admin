import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  IoAdd, IoClose, IoShieldCheckmark, IoKey, 
  IoBan, IoCheckmarkCircle, IoSearch, IoFilter 
} from 'react-icons/io5';
import CustomModal from './CustomModal';

function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [modalState, setModalState] = useState({
    isOpen: false, title: "", message: "", type: "warning", isConfirm: false
  });
  const [targetAction, setTargetAction] = useState({ type: null, id: null, name: null, newStatus: null, email: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const [newStaff, setNewStaff] = useState({
    firstName: '', lastName: '', email: '', role: 'secretary'
  });
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  useEffect(() => {
    fetchStaff();
    const interval = setInterval(fetchStaff, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaff(response.data);
    } catch (error) { 
      console.error("Error fetching staff:", error); 
    }
  };

  const formatTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setModalState({ 
      isOpen: true, 
      title: "Provisioning Account...", 
      message: "Generating secure token and dispatching official LGU invitation. Please wait.", 
      type: "info", 
      isConfirm: false 
    });

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const payload = { 
        firstName: newStaff.firstName.trim(),
        lastName: newStaff.lastName.trim(),
        email: newStaff.email.trim().toLowerCase(),
        role: newStaff.role,
        adminId: adminUser._id || adminUser.id 
      };
      
      await axios.post('https://tricycheck-api.onrender.com/api/admin/staff', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNewStaff({ firstName: '', lastName: '', email: '', role: 'secretary' });
      setIsModalOpen(false);
      fetchStaff();

      setModalState({
        isOpen: true,
        title: "Account Provisioned!",
        message: `Staff registered successfully. A secure invitation link has been dispatched to ${payload.email}. They must click it to initialize their security key.`,
        type: "success",
        isConfirm: false
      });
      
    } catch (error) {
      setModalState({
        isOpen: true,
        title: "Registration Failed",
        message: error.response?.data?.error || "Failed to provision account.",
        type: "warning",
        isConfirm: false
      });
    }
  };

  const handleToggleStatus = (member) => {
    const isCurrentlyActive = member.status === 'Active';
    const newStatus = isCurrentlyActive ? 'Suspended' : 'Active';
    const actionTitle = isCurrentlyActive ? 'Suspend Personnel Account?' : 'Reactivate Personnel Account?';
    const actionMsg = isCurrentlyActive 
      ? `Are you sure you want to suspend ${member.firstName} ${member.lastName} (${member.username})? They will be immediately logged out of the POSO Command Center.` 
      : `Are you sure you want to restore access for ${member.firstName} ${member.lastName} (${member.username})?`;

    setTargetAction({ type: 'TOGGLE_STATUS', id: member._id, name: member.firstName, newStatus });
    setModalState({ isOpen: true, title: actionTitle, message: actionMsg, type: "warning", isConfirm: true });
  };

  const handleResetPasswordClick = (id, name, email) => {
    setTargetAction({ type: 'RESET', id, name, email }); 
    setModalState({ isOpen: true, title: "Dispatch Recovery Link?", message: `Send a fresh 24-hour password setup/recovery link directly to ${name}'s official email (${email || 'Unknown'})?`, type: "warning", isConfirm: true });
  };

  const executeAction = async () => {
    closeModal();
    const { type, id, newStatus, email } = targetAction;
    const currentAdminId = adminUser._id || adminUser.id;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    if (type === 'TOGGLE_STATUS') {
      try {
        await axios.put(`https://tricycheck-api.onrender.com/api/admin/staff/${id}/status`, 
          { status: newStatus, adminId: currentAdminId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchStaff();
        setTimeout(() => setModalState({ isOpen: true, title: "Status Updated", message: `Personnel account is now ${newStatus}.`, type: "success", isConfirm: false }), 300);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Action Failed", message: "Failed to update account status.", type: "warning", isConfirm: false }), 300);
      }
    } else if (type === 'RESET') {
      try {
        if (!email) throw new Error("This personnel account does not have a registered email address.");
        setTimeout(() => setModalState({ isOpen: true, title: "Dispatching...", message: `Transmitting cryptographic link to ${email}. Please wait.`, type: "info", isConfirm: false }), 300);
        await axios.post(`https://tricycheck-api.onrender.com/api/admin/forgot-password`, { email: email });
        setTimeout(() => setModalState({ isOpen: true, title: "Transmission Successful", message: `A secure recovery link has been dispatched to ${email}.`, type: "success", isConfirm: false }), 800);
      } catch (error) {
        setTimeout(() => setModalState({ isOpen: true, title: "Dispatch Failed", message: error.response?.data?.error || error.message || "Failed to dispatch recovery link.", type: "warning", isConfirm: false }), 800);
      }
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = `${member.firstName} ${member.lastName} ${member.username || ''} ${member.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoShieldCheckmark className="text-emerald-600 mr-2" /> Staff Access Control (RBAC)
          </h2>
          <p className="text-sm font-medium text-slate-500">Manage POSO Secretary and Dispatcher clearances and cryptographic invitations.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 shadow-sm cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="secretary">Secretary Only</option>
              <option value="dispatcher">Dispatcher Only</option>
            </select>
            <IoFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative w-64">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search name, ID, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-600 shadow-sm"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center shadow-lg hover:bg-emerald-800 active:scale-95 transition-all shrink-0"
          >
            <IoAdd className="text-lg mr-1.5" /> Issue Credentials
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <th className="p-5 pl-8">Personnel Name</th>
              <th className="p-5">System Username</th>
              <th className="p-5">Official Email</th>
              <th className="p-5">Security Clearance & Access Scope</th>
              <th className="p-5">Account Status</th>
              <th className="p-5 pr-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((member) => (
              <tr key={member._id} className={`transition-colors ${member.status === 'Suspended' ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'}`}>
                <td className="p-5 pl-8 font-black text-slate-800">
                  {member.firstName} {member.lastName}
                </td>
                <td className="p-5 font-mono text-xs font-black text-slate-600">{member.username}</td>
                <td className="p-5 text-sm font-medium text-slate-600">{member.email || 'No email attached'}</td>
                <td className="p-5">
                  <div className="flex flex-col space-y-1">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-max ${
                      member.role === 'dispatcher' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {member.role}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {member.role === 'dispatcher' 
                        ? 'Access: Overview, Live Radar Map & Support Switchboard' 
                        : 'Access: Overview, Fleet KYC, Passengers, Compliance & Reports'}
                    </span>
                  </div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider shadow-sm flex items-center w-max ${
                    member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {member.status || 'Active'}
                  </span>
                </td>
                <td className="p-5 pr-8 text-right space-x-2">
                  <button 
                    onClick={() => handleResetPasswordClick(member._id, `${member.firstName} ${member.lastName}`, member.email)}
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Send Password Setup / Recovery Link"
                  >
                    <IoKey />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(member)}
                    className={`p-2.5 rounded-xl transition-colors shadow-sm ${
                      member.status === 'Active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={member.status === 'Active' ? "Suspend Account" : "Reactivate Account"}
                  >
                    {member.status === 'Active' ? <IoBan /> : <IoCheckmarkCircle />}
                  </button>
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400 font-bold">
                  No staff accounts found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black">Issue Personnel Credentials</h2>
              <button type="button" onClick={() => setIsModalOpen(false)}><IoClose className="text-2xl hover:text-red-400 transition-colors" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Maria"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" 
                    value={newStaff.firstName} 
                    onChange={e => setNewStaff({...newStaff, firstName: formatTitleCase(e.target.value.replace(/[^A-Za-z\s\-ñÑ.]/g, ''))})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Santos"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" 
                    value={newStaff.lastName} 
                    onChange={e => setNewStaff({...newStaff, lastName: formatTitleCase(e.target.value.replace(/[^A-Za-z\s\-ñÑ.]/g, ''))})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clearance Level (Role) *</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer" 
                  value={newStaff.role} 
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                >
                  <option value="secretary">POSO Secretary (Fleet KYC, Passengers, Compliance & Reports)</option>
                  <option value="dispatcher">POSO Dispatcher (Live Radar Map & Support Switchboard)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Username</label>
                <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-emerald-700 text-xs mb-3 flex items-center justify-center font-black tracking-widest shadow-inner">
                  AUTO-GENERATED ({newStaff.role === 'secretary' ? 'POSO-SEC-XXX' : 'POSO-DISP-XXX'})
                </div>
                
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official Email Address *</label>
                <input 
                  required 
                  type="email" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" 
                  placeholder="e.g. officer@calasiao.gov.ph" 
                  value={newStaff.email} 
                  onChange={e => setNewStaff({...newStaff, email: e.target.value.toLowerCase().replace(/\s/g, '')})} 
                />
              </div>
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-4 flex items-start space-x-3">
                <IoShieldCheckmark className="text-emerald-600 text-xl shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-slate-600">A secure 24-hour Invitation Link will be emailed directly to this officer to initialize their password.</p>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-500 active:scale-95 transition-all mt-4">
                Generate Secure Account
              </button>
            </form>
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

export default StaffManagement;