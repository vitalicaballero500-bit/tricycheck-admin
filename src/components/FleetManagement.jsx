import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  IoSearch, IoPencil, IoKey, IoClose, IoWarning, IoEye, 
  IoFilter, IoSwapVertical, IoStar, IoChatbubbles, IoDocumentText, 
  IoShieldCheckmark, IoAdd, IoRemove, IoRefresh, IoExpand, IoCheckmarkCircle, IoSave
} from 'react-icons/io5';
import CustomModal from './CustomModal';

const CALASIAO_BARANGAYS = [
  "Ambonao", "Bued", "Buenlag", "Cabilocaan", "Dinalaoan", "Doyong", 
  "Gabon", "Lasip", "Longos", "Lumbang", "Macabito", "Malabago", 
  "Mancup", "Nagsaing", "Nalsian", "Poblacion East", "Poblacion West", 
  "Quesban", "Royo", "Salinap", "San Miguel", "San Vicente", "Songkoy", "Talibaew"
];

function FleetManagement() {
  const [viewMode, setViewMode] = useState('directory'); // 'directory' or 'leaderboard'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [sortBy, setSortBy] = useState('Newest'); 
  
  const [drivers, setDrivers] = useState([]);
  
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "warning", isConfirm: false });
  const [targetAction, setTargetAction] = useState({ type: null, payload: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // === REVIEWS MODAL STATE ===
  const [reviewsModal, setReviewsModal] = useState({ isOpen: false, driverName: '', rating: 0, driverId: null });
  const [liveReviews, setLiveReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // === DISCIPLINARY MODAL STATE ===
  const [quickViewModal, setQuickViewModal] = useState({ isOpen: false, driver: null, activeTab: 'disciplinary' });
  const [penaltyForm, setPenaltyForm] = useState({ duration: '24h', reason: '', isSubmitting: false });

  // === UNIFIED SPLIT-SCREEN AUDITOR & INLINE EDITOR STATE ===
  const [auditModal, setAuditModal] = useState({ 
    isOpen: false, 
    driver: null, 
    isEditing: false,
    isRejecting: false, 
    rejectReason: '', 
    isSubmitting: false, 
    activeImageTab: 'license' 
  });

  // === DOCUMENT ZOOM & ROTATE ENGINE STATE ===
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // === EDITABLE DRIVER FORM STATE (SYNCED 1:1 WITH MOBILE WIZARD) ===
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: '',
    tricycleColor: '', bodyNo: '', plateNo: '', licenseNo: '',
    licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '', driverStatus: 'Active'
  });
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isSecretary = adminUser.role === 'secretary'; 

  useEffect(() => { fetchDrivers(); }, []);

  // === TELEMETRY RECEIVER ENGINE (FROM SUPPORT TICKETS) ===
  useEffect(() => {
    const checkTeleport = () => {
      const teleportId = localStorage.getItem('teleportDriverId');
      if (teleportId && drivers.length > 0) {
        const targetDriver = drivers.find(d => d.id === teleportId);
        if (targetDriver) {
          localStorage.removeItem('teleportDriverId');
          setViewMode('directory');
          setQuickViewModal({ isOpen: true, driver: targetDriver, activeTab: 'disciplinary' });
        }
      }
    };
    checkTeleport();
    window.addEventListener('fleetTeleport', checkTeleport);
    return () => window.removeEventListener('fleetTeleport', checkTeleport);
  }, [drivers]);

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/drivers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const liveDrivers = response.data.map((d) => ({
        id: d._id,
        bodyNo: d.bodyNo || '',
        name: `${d.firstName} ${d.lastName}`,
        firstName: d.firstName || '', 
        lastName: d.lastName || '', 
        plate: d.plateNo || '', 
        phone: d.phone || '',
        status: d.driverStatus || 'Pending',
        rejectionReason: d.rejectionReason || '',
        suspensionReason: d.suspensionReason || '',
        licenseNo: d.licenseNo || '',
        licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '', 
        orCrExpiry: d.orCrExpiry ? d.orCrExpiry.split('T')[0] : '', 
        franchisePermitExpiry: d.franchisePermitExpiry ? d.franchisePermitExpiry.split('T')[0] : '',
        profilePicUrl: d.profilePic || '', 
        licensePicUrl: d.licensePic || '', 
        orcrPicUrl: d.orcrPic || '', 
        franchisePicUrl: d.franchisePic || '',
        registeredBy: d.registeredBy ? `${d.registeredBy.firstName} ${d.registeredBy.lastName}` : 'Self-Onboarded',
        createdAt: d.createdAt || new Date().toISOString(),
        isOnline: d.driverStatus === 'Active',
        rating: d.rating || '0.0',
        totalReviews: d.totalReviews || 0,
        email: d.email || '', 
        address: d.address || '', 
        tricycleColor: d.tricycleColor || ''
      }));
      setDrivers(liveDrivers);
    } catch (error) { 
      console.error('❌ Error fetching drivers:', error); 
    }
  };

  // === OPEN UNIFIED SPLIT-SCREEN MODAL (VIEW, AUDIT, OR EDIT) ===
  const openSplitScreenModal = (driver, startInEditMode = false) => {
    setZoomLevel(1);
    setRotation(0);
    setEditForm({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      phone: driver.phone || '',
      email: driver.email || '',
      address: driver.address || '',
      tricycleColor: driver.tricycleColor || '',
      bodyNo: driver.bodyNo || '',
      plateNo: driver.plate || '',
      licenseNo: driver.licenseNo || '',
      licenseExpiry: driver.licenseExpiry || '',
      orCrExpiry: driver.orCrExpiry || '',
      franchisePermitExpiry: driver.franchisePermitExpiry || '',
      driverStatus: driver.status || 'Active'
    });
    setAuditModal({
      isOpen: true,
      driver: driver,
      isEditing: startInEditMode,
      isRejecting: false,
      rejectReason: driver.rejectionReason || '',
      isSubmitting: false,
      activeImageTab: 'license'
    });
  };

  // === FORMATTERS & VALIDATION FOR INLINE EDIT ===
  const formatTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

  const handleEditFieldChange = (field, value) => {
    let val = value;
    if (field === 'firstName' || field === 'lastName') {
      val = formatTitleCase(value.replace(/[^A-Za-z\s\-ñÑ.]/g, ''));
    } else if (field === 'phone') {
      val = value.replace(/\D/g, '').slice(0, 11);
    } else if (field === 'email') {
      val = value.toLowerCase().replace(/\s/g, '');
    } else if (field === 'bodyNo' || field === 'plateNo' || field === 'licenseNo') {
      val = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }
    setEditForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSaveInlineEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      return setModalState({ isOpen: true, title: "Validation Error", message: "First Name and Last Name are required.", type: "warning", isConfirm: false });
    }
    if (!/^09\d{9}$/.test(editForm.phone.trim())) {
      return setModalState({ isOpen: true, title: "Validation Error", message: "Phone number must be a valid 11-digit PH mobile number starting with 09.", type: "warning", isConfirm: false });
    }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      return setModalState({ isOpen: true, title: "Validation Error", message: "A valid official email address is required.", type: "warning", isConfirm: false });
    }

    setAuditModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const formData = new FormData();
      formData.append('firstName', editForm.firstName.trim());
      formData.append('lastName', editForm.lastName.trim());
      formData.append('phone', editForm.phone.trim());
      formData.append('email', editForm.email.trim());
      formData.append('address', editForm.address.trim());
      formData.append('tricycleColor', editForm.tricycleColor.trim());
      formData.append('bodyNo', editForm.bodyNo.trim());
      formData.append('plateNo', editForm.plateNo.trim());
      formData.append('licenseNo', editForm.licenseNo.trim());
      formData.append('licenseExpiry', editForm.licenseExpiry);
      formData.append('orCrExpiry', editForm.orCrExpiry);
      formData.append('franchisePermitExpiry', editForm.franchisePermitExpiry);
      formData.append('driverStatus', editForm.driverStatus);

      const currentAdminId = adminUser._id || adminUser.id;
      if (currentAdminId) formData.append('adminId', currentAdminId);

      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      await fetchDrivers();
      setAuditModal(prev => ({
        ...prev,
        isEditing: false,
        isSubmitting: false,
        driver: {
          ...prev.driver,
          name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`,
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
          address: editForm.address.trim(),
          tricycleColor: editForm.tricycleColor.trim(),
          bodyNo: editForm.bodyNo.trim(),
          plate: editForm.plateNo.trim(),
          licenseNo: editForm.licenseNo.trim(),
          licenseExpiry: editForm.licenseExpiry,
          orCrExpiry: editForm.orCrExpiry,
          franchisePermitExpiry: editForm.franchisePermitExpiry,
          status: editForm.driverStatus
        }
      }));
      setModalState({ isOpen: true, title: "Profile Updated", message: "Driver records have been updated and synced.", type: "success", isConfirm: false });
    } catch (error) {
      setAuditModal(prev => ({ ...prev, isSubmitting: false }));
      setModalState({ isOpen: true, title: "Update Failed", message: error.response?.data?.error || "Could not update driver profile.", type: "warning", isConfirm: false });
    }
  };

  const handleResetPasswordClick = (driver) => {
    setTargetAction({ type: 'RESET_PASSWORD', payload: driver });
    setModalState({ isOpen: true, title: "Reset Password", message: `Generate and email a new temporary password to ${driver.name} (${driver.email || 'No email'})?`, type: "warning", isConfirm: true });
  };

  const executeResetPassword = async () => {
    closeModal();
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${targetAction.payload.id}/reset-password`, 
        { adminId: adminUser._id || adminUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimeout(() => { setModalState({ isOpen: true, title: "Reset Successful", message: "Secure credentials have been dispatched to the driver's registered email.", type: "success", isConfirm: false }); }, 300);
    } catch (error) { 
      setTimeout(() => { setModalState({ isOpen: true, title: "Action Failed", message: error.response?.data?.error || "Failed to reset password.", type: "warning", isConfirm: false }); }, 300); 
    }
  };

  const openReviewsModal = async (driver) => {
    setReviewsModal({ isOpen: true, driverName: driver.name, rating: driver.rating, driverId: driver.id });
    setLoadingReviews(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get(`https://tricycheck-api.onrender.com/api/admin/drivers/${driver.id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLiveReviews(response.data);
    } catch (error) {
      console.error("Failed to fetch reviews");
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleConfirmAction = () => { if (targetAction.type === 'RESET_PASSWORD') executeResetPassword(); };

  // === STATUS-AWARE COMPLIANCE ENGINE ===
  const checkCompliance = (driver) => {
    if (driver.status === 'Pending') {
      return { label: 'AWAITING KYC AUDIT', color: 'bg-amber-100 text-amber-800 border border-amber-300' };
    }
    if (driver.status === 'Rejected') {
      return { label: 'RETURNED FOR REVISION', color: 'bg-red-100 text-red-700 border border-red-200' };
    }

    const today = new Date();
    const checkDate = (dateString) => {
      if (!dateString) return 'Missing';
      const daysLeft = Math.ceil((new Date(dateString) - today) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return 'Expired';
      if (daysLeft <= 30) return 'Expiring Soon';
      return 'Valid';
    };
    const statuses = [ checkDate(driver.licenseExpiry), checkDate(driver.orCrExpiry), checkDate(driver.franchisePermitExpiry) ];
    if (statuses.includes('Expired')) return { label: 'EXPIRED DOCS', color: 'bg-red-500 text-white animate-pulse' };
    if (statuses.includes('Expiring Soon')) return { label: 'EXPIRING SOON', color: 'bg-yellow-400 text-yellow-900' };
    if (statuses.includes('Missing')) return { label: 'INCOMPLETE', color: 'bg-slate-200 text-slate-500' };
    return { label: 'COMPLIANT', color: 'bg-green-100 text-green-700' };
  };

  const processedDrivers = drivers
    .filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.bodyNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.plate.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesFilter = true;
      if (filterStatus === 'Active') matchesFilter = d.status === 'Active' || d.status === 'Offline';
      if (filterStatus === 'Pending') matchesFilter = d.status === 'Pending';
      if (filterStatus === 'Rejected') matchesFilter = d.status === 'Rejected';
      if (filterStatus === 'Suspended') matchesFilter = d.status === 'Suspended';
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'A-Z') return a.name.localeCompare(b.name);
      if (sortBy === 'Z-A') return b.name.localeCompare(a.name);
      if (sortBy === 'Oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); 
    });

  // === CURRENT DOCUMENT URL HELPER FOR ZOOM INSPECTOR ===
  const getCurrentDocUrl = () => {
    if (!auditModal.driver) return '';
    if (auditModal.activeImageTab === 'license') return auditModal.driver.licensePicUrl;
    if (auditModal.activeImageTab === 'orcr') return auditModal.driver.orcrPicUrl;
    if (auditModal.activeImageTab === 'franchise') return auditModal.driver.franchisePicUrl;
    if (auditModal.activeImageTab === 'selfie') return auditModal.driver.profilePicUrl;
    return '';
  };

  const handleTabSwitch = (tab) => {
    setZoomLevel(1);
    setRotation(0);
    setAuditModal(prev => ({ ...prev, activeImageTab: tab }));
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      
      {/* === FLEET HEADER === */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoShieldCheckmark className="text-emerald-600 mr-2" /> Fleet Directory & KYC Auditor
          </h2>
          <p className="text-sm font-medium text-slate-500">Audit driver KYC submissions, inspect credentials, and manage active fleet members.</p>
        </div>
      </div>

      {/* === FLEET DIRECTORY === */}
      <div className="flex-1 flex flex-col animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-80">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input 
              type="text" 
              placeholder="Search Body No., Plate, or Name..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-sm font-bold shadow-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="flex space-x-3">
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-sm shadow-sm font-bold text-slate-700 cursor-pointer">
                <option value="Newest">Newest First</option>
                <option value="Oldest">Oldest First</option>
                <option value="A-Z">Name (A-Z)</option>
                <option value="Z-A">Name (Z-A)</option>
              </select>
              <IoSwapVertical className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-sm shadow-sm font-bold text-slate-700 cursor-pointer">
                <option value="All">All Applications & Drivers</option>
                <option value="Pending">🟡 Pending KYC Audit</option>
                <option value="Active">🟢 Verified Active Fleet</option>
                <option value="Rejected">🟠 Returned / Rejected</option>
                <option value="Suspended">🔴 Suspended</option>
              </select>
              <IoFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  <th className="p-4 pl-6 w-28">Body No.</th>
                  <th className="p-4">Driver Identity</th>
                  <th className="p-4">Plate / Barangay</th>
                  <th className="p-4">App Status</th>
                  <th className="p-4">Compliance</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                {processedDrivers.map((driver) => {
                  const compliance = checkCompliance(driver);
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="p-4 pl-6 font-black text-slate-900 text-base">{driver.bodyNo || 'N/A'}</td>
                      
                      <td className="p-4 font-bold flex items-center space-x-3">
                        <div className="relative shrink-0">
                          {driver.profilePicUrl ? (
                            <img src={driver.profilePicUrl} alt="avatar" className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs shadow-sm">👤</div>
                          )}
                        </div>
                        <div>
                          <p className="text-slate-800 leading-tight font-black">{driver.name}</p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">{driver.phone} • {driver.email || 'No Email'}</p>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-mono font-black text-slate-800 text-xs uppercase">{driver.plate || 'N/A'}</p>
                        <p className="text-[11px] font-bold text-emerald-600 truncate max-w-[180px]">{driver.address || 'Calasiao'}</p>
                      </td>

                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          driver.status === 'Active' || driver.status === 'Offline'
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : driver.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : driver.status === 'Rejected'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-slate-900 text-white border-slate-800'
                        }`}>
                          {driver.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <span 
                          title={driver.status === 'Rejected' ? `Reason: ${driver.rejectionReason}` : ''}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider shadow-sm flex items-center w-max ${compliance.color}`}
                        >
                          {compliance.label === 'EXPIRED DOCS' && <IoWarning className="mr-1 text-sm" />}
                          {compliance.label}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right space-x-2 flex justify-end items-center">
                        {driver.status === 'Pending' ? (
                          <button 
                            onClick={() => openSplitScreenModal(driver, false)}
                            className="px-4 py-2 bg-amber-400 text-emerald-950 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-300 transition-all shadow-sm flex items-center space-x-1.5"
                          >
                            <IoDocumentText className="text-base" />
                            <span>Audit Application</span>
                          </button>
                        ) : driver.status === 'Rejected' ? (
                          <button 
                            onClick={() => openSplitScreenModal(driver, false)}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all shadow-sm flex items-center space-x-1.5"
                          >
                            <IoEye className="text-base" />
                            <span>View Returned File</span>
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setQuickViewModal({ isOpen: true, driver: driver, activeTab: 'disciplinary' })} 
                              className={`p-2.5 rounded-xl shadow-sm transition-colors ${driver.status === 'Suspended' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} 
                              title={driver.status === 'Suspended' ? "Lift Suspension" : "Disciplinary Actions"}
                            >
                              {driver.status === 'Suspended' ? <IoShieldCheckmark /> : <IoWarning />}
                            </button>
                            <button 
                              onClick={() => openSplitScreenModal(driver, false)} 
                              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 shadow-sm transition-colors" 
                              title="Inspect Documents & Personnel File"
                            >
                              <IoEye />
                            </button>
                            <button 
                              onClick={() => handleResetPasswordClick(driver)} 
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm transition-colors" 
                              title="Reset & Email Password"
                            >
                              <IoKey />
                            </button>
                            <button 
                              onClick={() => openSplitScreenModal(driver, true)} 
                              className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 shadow-sm transition-colors" 
                              title="Edit Driver Details & Credentials"
                            >
                              <IoPencil />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {processedDrivers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400 font-bold">No drivers found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === UNIFIED SPLIT-SCREEN KYC AUDITOR, DOCUMENT ZOOM & INLINE PROFILE EDITOR === */}
      {auditModal.isOpen && auditModal.driver && createPortal(
        <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            onClick={() => !auditModal.isSubmitting && setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' })}
          ></div>

          <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-6xl z-10 overflow-hidden animate-slide-up flex flex-col h-[92vh] border border-slate-700">
            
            {/* HEADER */}
            <div className={`px-6 py-4 flex justify-between items-center shrink-0 ${
              auditModal.driver.status === 'Pending' 
                ? 'bg-amber-400 text-emerald-950' 
                : auditModal.driver.status === 'Rejected'
                ? 'bg-red-900 text-white'
                : 'bg-emerald-950 text-white'
            }`}>
              <div className="flex items-center space-x-3">
                <IoDocumentText className="text-2xl" />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">
                    {auditModal.driver.status === 'Pending' 
                      ? 'POSO KYC Application Audit' 
                      : auditModal.driver.status === 'Rejected'
                      ? 'Returned Application File'
                      : 'Driver Personnel & KYC Vault'}
                  </h2>
                  <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">
                    Body No. {auditModal.driver.bodyNo || 'N/A'} • Status: {auditModal.driver.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* INLINE EDIT TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => setAuditModal(prev => ({ ...prev, isEditing: !prev.isEditing }))}
                  className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm ${
                    auditModal.isEditing 
                      ? 'bg-white text-slate-900' 
                      : 'bg-black/20 hover:bg-black/30 text-current border border-current/20'
                  }`}
                >
                  <IoPencil className="text-sm" />
                  <span>{auditModal.isEditing ? 'Cancel Edit' : 'Edit Driver Info'}</span>
                </button>

                <button 
                  disabled={auditModal.isSubmitting} 
                  onClick={() => setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' })} 
                  className="p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors"
                >
                  <IoClose className="text-2xl" />
                </button>
              </div>
            </div>

            {/* SPLIT-SCREEN BODY */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: DRIVER DATA / INLINE EDITOR (SYNCED 1:1 WITH WIZARD) */}
              <div className="w-full md:w-[38%] bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-5">
                
                {/* Rejection Banner if Returned */}
                {auditModal.driver.status === 'Rejected' && auditModal.driver.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center">
                      <IoWarning className="mr-1 text-sm" /> Returned to Driver — Reason:
                    </p>
                    <p className="text-xs font-bold text-red-900 italic">"{auditModal.driver.rejectionReason}"</p>
                  </div>
                )}

                {/* Profile Header */}
                <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                  <div 
                    onClick={() => handleTabSwitch('selfie')}
                    className="w-16 h-20 rounded-[50%] border-4 border-slate-100 overflow-hidden shadow-md shrink-0 cursor-pointer hover:border-emerald-500 transition-colors"
                    title="Click to inspect Live Selfie"
                  >
                    {auditModal.driver.profilePicUrl ? (
                      <img src={auditModal.driver.profilePicUrl} alt="Selfie" className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl">👤</div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Applicant Identity</span>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">{auditModal.driver.name}</h3>
                    <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">{auditModal.driver.phone}</p>
                  </div>
                </div>

                {!auditModal.isEditing ? (
                  /* === CLEAN READ-ONLY AUDIT VIEW === */
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact & Demographics</h4>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Official Email (Credentials)</p>
                        <p className="font-bold text-slate-800 text-sm break-all">{auditModal.driver.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Calasiao Barangay</p>
                        <p className="font-bold text-slate-800 text-sm">{auditModal.driver.address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tricycle Color & Make</p>
                        <p className="font-bold text-slate-800 text-sm">{auditModal.driver.tricycleColor || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Clickable Credential Cards that switch the Right Document Tab automatically */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Government KYC Credentials (Click to Verify)</h4>
                      
                      <div 
                        onClick={() => handleTabSwitch('license')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${auditModal.activeImageTab === 'license' ? 'bg-emerald-50/70 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">1. LTO Driver's License</span>
                          <span className="text-[10px] font-bold text-slate-400">Exp: {auditModal.driver.licenseExpiry || 'N/A'}</span>
                        </div>
                        <p className="font-mono font-black text-base text-slate-900">{auditModal.driver.licenseNo || 'NOT RECORDED'}</p>
                      </div>

                      <div 
                        onClick={() => handleTabSwitch('orcr')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${auditModal.activeImageTab === 'orcr' ? 'bg-emerald-50/70 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">2. LTO Tricycle OR/CR</span>
                          <span className="text-[10px] font-bold text-slate-400">Exp: {auditModal.driver.orCrExpiry || 'N/A'}</span>
                        </div>
                        <p className="font-mono font-black text-base text-slate-900">{auditModal.driver.plate || 'N/A'}</p>
                      </div>

                      <div 
                        onClick={() => handleTabSwitch('franchise')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${auditModal.activeImageTab === 'franchise' ? 'bg-emerald-50/70 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">3. Calasiao MTOP Franchise</span>
                          <span className="text-[10px] font-bold text-slate-400">Exp: {auditModal.driver.franchisePermitExpiry || 'N/A'}</span>
                        </div>
                        <p className="font-mono font-black text-base text-slate-900">BODY NO. {auditModal.driver.bodyNo || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* === CLEAN INLINE EDIT FORM (SYNCED 1:1 WITH MOBILE WIZARD) === */
                  <form onSubmit={handleSaveInlineEdit} className="space-y-4 animate-fade-in">
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-900">
                      Editing Driver Profile — Fix any typo (such as Gmail or License No.) while referencing the document photos on the right.
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name *</label>
                        <input required type="text" value={editForm.firstName} onChange={e => handleEditFieldChange('firstName', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name *</label>
                        <input required type="text" value={editForm.lastName} onChange={e => handleEditFieldChange('lastName', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile (11 Digits) *</label>
                        <input required type="tel" value={editForm.phone} onChange={e => handleEditFieldChange('phone', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm focus:border-emerald-600 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calasiao Barangay *</label>
                        <select value={editForm.address} onChange={e => handleEditFieldChange('address', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none">
                          <option value={editForm.address}>{editForm.address || 'Select Barangay'}</option>
                          {CALASIAO_BARANGAYS.map(b => (
                            <option key={b} value={`${b}, Calasiao`}>{b}, Calasiao</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Official Email Address *</label>
                      <input required type="email" value={editForm.email} onChange={e => handleEditFieldChange('email', e.target.value)} className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-bold text-sm text-emerald-950 focus:border-emerald-600 outline-none" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tricycle Color & Make *</label>
                      <input required type="text" value={editForm.tricycleColor} onChange={e => handleEditFieldChange('tricycleColor', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                    </div>

                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Government Credentials</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">License No. *</label>
                          <input required type="text" value={editForm.licenseNo} onChange={e => handleEditFieldChange('licenseNo', e.target.value)} onFocus={() => handleTabSwitch('license')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">License Expiry *</label>
                          <input required type="date" value={editForm.licenseExpiry} onChange={e => handleEditFieldChange('licenseExpiry', e.target.value)} onFocus={() => handleTabSwitch('license')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plate / MV No. *</label>
                          <input required type="text" value={editForm.plateNo} onChange={e => handleEditFieldChange('plateNo', e.target.value)} onFocus={() => handleTabSwitch('orcr')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">OR/CR Expiry *</label>
                          <input required type="date" value={editForm.orCrExpiry} onChange={e => handleEditFieldChange('orCrExpiry', e.target.value)} onFocus={() => handleTabSwitch('orcr')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Body No. *</label>
                          <input required type="text" value={editForm.bodyNo} onChange={e => handleEditFieldChange('bodyNo', e.target.value)} onFocus={() => handleTabSwitch('franchise')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Permit Expiry *</label>
                          <input required type="date" value={editForm.franchisePermitExpiry} onChange={e => handleEditFieldChange('franchisePermitExpiry', e.target.value)} onFocus={() => handleTabSwitch('franchise')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={auditModal.isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <IoSave className="text-lg" />
                      <span>{auditModal.isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* RIGHT COLUMN: INTERACTIVE DOCUMENT ZOOM & PAN ENGINE */}
              <div className="w-full md:w-[62%] bg-slate-900 flex flex-col min-h-0">
                
                {/* Document Selector Tabs */}
                <div className="flex bg-slate-800 p-2 shrink-0 space-x-2 border-b border-slate-700">
                  {[
                    { id: 'license', label: "1. Driver's License" },
                    { id: 'orcr', label: "2. LTO OR/CR" },
                    { id: 'franchise', label: "3. Franchise Permit" },
                    { id: 'selfie', label: "4. Live Selfie" }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => handleTabSwitch(tab.id)} 
                      className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                        auditModal.activeImageTab === tab.id 
                          ? 'bg-amber-400 text-emerald-950 shadow-md' 
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Interactive Zoom & Rotate Control Bar */}
                <div className="bg-slate-950/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
                  <span className="text-[11px] font-bold text-slate-400">
                    💡 Click image to quick-zoom or use controls to inspect fine print
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      type="button"
                      onClick={() => setZoomLevel(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      title="Zoom Out"
                    >
                      <IoRemove />
                    </button>
                    <span className="text-xs font-mono font-black w-14 text-center text-amber-400">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                      type="button"
                      onClick={() => setZoomLevel(z => Math.min(3.5, +(z + 0.25).toFixed(2)))} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      title="Zoom In"
                    >
                      <IoAdd />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                      title="Rotate 90°"
                    >
                      <IoRefresh />
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setZoomLevel(1); setRotation(0); }} 
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    >
                      Reset
                    </button>
                    {getCurrentDocUrl() && (
                      <a 
                        href={getCurrentDocUrl()} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                        title="Open Full Resolution in New Tab"
                      >
                        <IoExpand />
                      </a>
                    )}
                  </div>
                </div>
                
                {/* Scrollable High-Resolution Image Canvas */}
                <div className="flex-1 relative overflow-auto p-6 flex items-center justify-center bg-slate-900">
                  {(() => {
                    const docUrl = getCurrentDocUrl();
                    if (!docUrl) {
                      return <div className="text-slate-500 font-bold text-sm">No Document Image Uploaded</div>;
                    }
                    if (docUrl.toLowerCase().endsWith('.pdf')) {
                      return <iframe src={docUrl} title="PDF Document" className="w-full h-full rounded-xl bg-white" />;
                    }
                    return (
                      <div className="overflow-auto flex items-center justify-center max-w-full max-h-full">
                        <img 
                          src={docUrl} 
                          alt="KYC Document"
                          onClick={() => setZoomLevel(z => (z === 1 ? 2 : 1))}
                          style={{ 
                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease-out'
                          }}
                          className={`max-w-full max-h-[62vh] object-contain rounded-xl shadow-2xl border border-slate-700 ${zoomLevel === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'}`} 
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* CONTEXT-AWARE FOOTER */}
            <div className="bg-white p-5 flex flex-col md:flex-row justify-between items-center shrink-0 border-t border-slate-200">
              {auditModal.isRejecting ? (
                <div className="w-full flex space-x-3 items-center animate-fade-in">
                  <input 
                    type="text" 
                    placeholder="State exact reason for rejection (e.g. Blurry License Photo or Mismatched Plate No.)..." 
                    className="flex-1 p-3.5 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 text-red-900 font-bold text-sm shadow-inner"
                    value={auditModal.rejectReason}
                    onChange={(e) => setAuditModal({...auditModal, rejectReason: e.target.value})}
                    disabled={auditModal.isSubmitting}
                    autoFocus
                  />
                  <button 
                    onClick={() => setAuditModal({...auditModal, isRejecting: false})} 
                    disabled={auditModal.isSubmitting} 
                    className="px-5 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!auditModal.rejectReason.trim()) return;
                      setAuditModal(prev => ({...prev, isSubmitting: true}));
                      try {
                        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                        await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/reject`, {
                          adminId: adminUser._id || adminUser.id, 
                          reason: auditModal.rejectReason
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' });
                        setModalState({ isOpen: true, title: "Application Returned", message: "The applicant has been notified via email and in-app vault to fix their submission.", type: "success" });
                        fetchDrivers();
                      } catch (err) { 
                        setModalState({ isOpen: true, title: "Action Failed", message: "Could not reject application.", type: "warning" }); 
                        setAuditModal(prev => ({...prev, isSubmitting: false})); 
                      }
                    }}
                    disabled={auditModal.isSubmitting || !auditModal.rejectReason.trim()}
                    className="px-7 py-3.5 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
                  >
                    {auditModal.isSubmitting ? "Returning..." : "Confirm Rejection"}
                  </button>
                </div>
              ) : (
                <div className="w-full flex justify-between items-center">
                  <div className="text-xs font-bold text-slate-500">
                    {auditModal.driver.status === 'Pending' && 'Verify all 3 documents before dispatching official POSO credentials.'}
                    {auditModal.driver.status === 'Rejected' && 'Waiting for applicant to resubmit corrected documents.'}
                    {(auditModal.driver.status === 'Active' || auditModal.driver.status === 'Offline') && 'Verified POSO Fleet Member.'}
                  </div>

                  <div className="flex space-x-3">
                    {(auditModal.driver.status === 'Pending' || auditModal.driver.status === 'Rejected') && (
                      <>
                        <button 
                          onClick={() => setAuditModal({...auditModal, isRejecting: true})}
                          disabled={auditModal.isSubmitting}
                          className="px-6 py-3.5 bg-red-50 text-red-600 border border-red-200 font-black rounded-xl hover:bg-red-100 transition-colors shadow-sm text-sm"
                        >
                          {auditModal.driver.status === 'Rejected' ? 'Update Rejection Reason' : 'Reject Application'}
                        </button>
                        <button 
                          onClick={async () => {
                            setAuditModal(prev => ({...prev, isSubmitting: true}));
                            try {
                              const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                              await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/approve`, {
                                adminId: adminUser._id || adminUser.id
                              }, { headers: { Authorization: `Bearer ${token}` } });
                              setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' });
                              setModalState({ isOpen: true, title: "Driver Approved", message: "Application approved! Temporary login credentials have been emailed to the driver.", type: "success" });
                              fetchDrivers();
                            } catch (err) { 
                              setModalState({ isOpen: true, title: "Action Failed", message: "Could not approve application.", type: "warning" }); 
                              setAuditModal(prev => ({...prev, isSubmitting: false})); 
                            }
                          }}
                          disabled={auditModal.isSubmitting}
                          className="px-7 py-3.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center space-x-2 text-sm"
                        >
                          <IoCheckmarkCircle className="text-lg" />
                          <span>{auditModal.isSubmitting ? "Approving..." : "Approve & Dispatch Credentials"}</span>
                        </button>
                      </>
                    )}

                    {(auditModal.driver.status === 'Active' || auditModal.driver.status === 'Offline' || auditModal.driver.status === 'Suspended') && (
                      <>
                        <button 
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                              await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/inform`, 
                                { adminId: adminUser._id || adminUser.id }, 
                                { headers: { Authorization: `Bearer ${token}` }}
                              );
                              setModalState({ isOpen: true, title: "Warning Sent", message: "Official LGU compliance warning email dispatched to driver.", type: "success" });
                            } catch (err) { 
                              setModalState({ isOpen: true, title: "Dispatch Failed", message: "Driver missing email or connection failed.", type: "warning" }); 
                            }
                          }}
                          className="px-5 py-3 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-xl hover:bg-amber-100 transition-colors flex items-center text-xs"
                        >
                          <IoWarning className="mr-1.5 text-base" /> Send Expiry Notice (Email)
                        </button>

                        <button 
                          onClick={() => handleResetPasswordClick(auditModal.driver)}
                          className="px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex items-center text-xs"
                        >
                          <IoKey className="mr-1.5 text-base" /> Reset Password
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* === DISCIPLINARY / SUSPENSION MODAL === */}
      {quickViewModal.isOpen && quickViewModal.driver && createPortal(
        <div className="fixed inset-0 z-[2060] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuickViewModal({ isOpen: false, driver: null })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-xl font-black flex items-center"><IoWarning className="mr-2 text-amber-400"/> Tribunal Disciplinary Console</h2>
                <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-widest">{quickViewModal.driver.name} • Body No. {quickViewModal.driver.bodyNo}</p>
              </div>
              <button onClick={() => setQuickViewModal({ isOpen: false, driver: null })} className="p-2 bg-slate-800 hover:bg-emerald-800 rounded-full transition-colors"><IoClose className="text-xl" /></button>
            </div>
            
            <div className="p-6">
              {quickViewModal.driver.status === 'Suspended' ? (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                    <IoShieldCheckmark />
                  </div>
                  <h4 className="font-black text-emerald-900 text-xl mb-2">Driver is Currently Suspended</h4>
                  <p className="text-sm font-bold text-emerald-700 mb-6 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm inline-block w-full text-left">
                    <span className="block text-[10px] text-emerald-500 uppercase mb-1">Recorded Reason:</span>
                    {quickViewModal.driver.suspensionReason || "Administrative Lockout"}
                  </p>
                  
                  <button 
                    className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                        await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/unban`, {
                          adminId: adminUser._id || adminUser.id
                        }, { headers: { Authorization: `Bearer ${token}` }});
                        
                        setQuickViewModal({ isOpen: false, driver: null });
                        setModalState({ isOpen: true, title: "Access Restored", message: "Suspension lifted. The driver can now log into the application.", type: "success" });
                        fetchDrivers(); 
                      } catch (error) {
                        setModalState({ isOpen: true, title: "Action Failed", message: "Could not lift suspension.", type: "warning" });
                      }
                    }}
                  >
                    LIFT PENALTY & RESTORE ACCESS
                  </button>
                </div>
              ) : (
                <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                  <h4 className="font-black text-red-900 text-lg mb-2 flex items-center"><IoWarning className="mr-2"/> Deploy Penalty</h4>
                  <p className="text-xs font-medium text-red-700 mb-6 leading-relaxed">Suspending a driver will immediately force-logout their mobile app and block dispatch requests.</p>
                  
                  <label className="block text-[10px] font-bold text-red-800 uppercase tracking-wider mb-2">Penalty Duration</label>
                  <select 
                    className="w-full p-4 bg-white border border-red-200 rounded-xl font-bold text-sm mb-4 outline-none focus:border-red-500 shadow-sm cursor-pointer"
                    value={penaltyForm.duration}
                    onChange={(e) => setPenaltyForm({...penaltyForm, duration: e.target.value})}
                  >
                    <option value="24h">24 Hours (Minor Violation)</option>
                    <option value="3d">3 Days (Moderate Violation)</option>
                    <option value="7d">7 Days (Severe Violation)</option>
                    <option value="permanent">Permanent Ban (Critical Violation)</option>
                  </select>

                  <label className="block text-[10px] font-bold text-red-800 uppercase tracking-wider mb-2">Reason for Suspension / Ticket Ref.</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Overcharging Fare - Reference Ticket #1024" 
                    className="w-full p-4 bg-white border border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 shadow-sm"
                    value={penaltyForm.reason}
                    onChange={(e) => setPenaltyForm({...penaltyForm, reason: e.target.value})}
                  />

                  <button 
                    className="mt-6 w-full py-4 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                    disabled={!penaltyForm.reason || penaltyForm.isSubmitting}
                    onClick={async () => {
                      setPenaltyForm({...penaltyForm, isSubmitting: true});
                      try {
                        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                        await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/suspend`, {
                          duration: penaltyForm.duration,
                          reason: penaltyForm.reason,
                          adminId: adminUser._id || adminUser.id
                        }, { headers: { Authorization: `Bearer ${token}` }});
                        
                        setQuickViewModal({ isOpen: false, driver: null });
                        setModalState({ isOpen: true, title: "Penalty Deployed", message: "The driver has been locked out of the application.", type: "success" });
                        fetchDrivers(); 
                      } catch (error) {
                        setModalState({ isOpen: true, title: "Execution Failed", message: "Could not deploy penalty.", type: "warning" });
                      } finally {
                        setPenaltyForm({...penaltyForm, isSubmitting: false, reason: ''});
                      }
                    }}
                  >
                    {penaltyForm.isSubmitting ? "EXECUTING BAN..." : "CONFIRM SUSPENSION"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* === REVIEWS VIEWER MODAL === */}
      {reviewsModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[2060] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReviewsModal({ isOpen: false, driverName: '', rating: 0 })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-black text-slate-800 text-xl flex items-center"><IoChatbubbles className="mr-2 text-emerald-600"/> Passenger Feedback</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Reviewing: {reviewsModal.driverName}</p>
              </div>
              <button onClick={() => setReviewsModal({ isOpen: false, driverName: '', rating: 0 })} className="p-2 text-slate-400 hover:text-slate-600"><IoClose className="text-xl"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingReviews ? (
                <div className="text-center text-slate-400 font-bold animate-pulse py-4">Fetching secure reviews...</div>
              ) : liveReviews.length === 0 ? (
                <div className="text-center text-slate-400 font-bold py-4">No written feedback for this driver yet.</div>
              ) : (
                liveReviews.map((rev, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-800 text-sm">{rev.name}</span>
                      <div className="flex text-yellow-400 text-xs">
                        {[...Array(Math.max(1, rev.stars))].map((_, idx) => <IoStar key={idx} />)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">"{rev.text}"</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">{new Date(rev.date).toLocaleDateString()}</p>
                  </div>
                ))
              )}
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
        onConfirm={modalState.isConfirm ? handleConfirmAction : closeModal}
        onCancel={modalState.isConfirm ? closeModal : null}
      />
    </div>
  );
}

export default FleetManagement;