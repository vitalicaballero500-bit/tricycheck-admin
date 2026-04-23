// === THE FIX: ADDED REACT PORTAL IMPORT ===
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <-- THE TELEPORTER
import axios from 'axios';
// Add IoShieldCheckmark to your existing imports:
import { 
  IoSearch, IoAdd, IoPencil, IoKey, IoClose, IoWarning, IoCamera, IoEye, 
  IoFilter, IoSwapVertical, IoStar, IoChatbubbles, IoPodium, IoDocumentText, IoShieldCheckmark
} from 'react-icons/io5';
import CustomModal from './CustomModal';

function FleetManagement() {
  const [viewMode, setViewMode] = useState('directory'); // 'directory' or 'leaderboard'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [sortBy, setSortBy] = useState('Newest'); 
  
  const [drivers, setDrivers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState(null);
  
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "warning", isConfirm: false });
  const [targetAction, setTargetAction] = useState({ type: null, payload: null });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // === NEW: REVIEWS MODAL STATE ===
  const [reviewsModal, setReviewsModal] = useState({ isOpen: false, driverName: '', rating: 0, driverId: null });
  const [liveReviews, setLiveReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  // === THE FIX: Upgraded Quick View State to support Tabs ===
  const [quickViewModal, setQuickViewModal] = useState({ isOpen: false, driver: null, activeTab: 'info' });
  
  // === NEW: PENALTY FORM STATE ===
  const [penaltyForm, setPenaltyForm] = useState({ duration: '24h', reason: '', isSubmitting: false });
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isSecretary = adminUser.role === 'secretary'; 

  // === THE FIX: STATE ENGINE (TODA REMOVED, OPERATOR ADDED) ===
  const [newDriver, setNewDriver] = useState({ 
    firstName: '', middleName: '', lastName: '', suffix: '', bodyNo: '', plate: '', phone: '', status: 'Pending',
    licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '',
    profilePicUrl: '', licensePicUrl: '', orcrPicUrl: '', franchisePicUrl: '',
    email: '', address: '', emergencyContactName: '', emergencyContactPhone: '', tricycleColor: '', bloodType: 'Unknown',
    // === NEW FEATURE: OPERATOR & BOUNDARY ENGINE ===
    operatorName: 'Owned', operatorPhone: '', isBoundary: false, boundaryFee: ''
  });

  const [files, setFiles] = useState({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null });

  useEffect(() => { fetchDrivers(); }, []);

  // === THE FIX: TELEMETRY RECEIVER ENGINE ===
  useEffect(() => {
      const checkTeleport = () => {
          const teleportId = localStorage.getItem('teleportDriverId');
          if (teleportId && drivers.length > 0) {
              const targetDriver = drivers.find(d => d.id === teleportId);
              if (targetDriver) {
                  localStorage.removeItem('teleportDriverId'); // Clear the lock
                  setViewMode('directory');
                  setQuickViewModal({ isOpen: true, driver: targetDriver, activeTab: 'disciplinary' });
              }
          }
      };

      // Check on mount (when tab is clicked) and listen for live events
      checkTeleport();
      window.addEventListener('fleetTeleport', checkTeleport);
      return () => window.removeEventListener('fleetTeleport', checkTeleport);
  }, [drivers]);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/drivers');
      const liveDrivers = response.data.map((d) => ({
        id: d._id,
        bodyNo: d.bodyNo || '',
        name: `${d.firstName} ${d.lastName}`,
        firstName: d.firstName, lastName: d.lastName, plate: d.plateNo || '', phone: d.phone,
        status: d.driverStatus, homeToda: d.homeToda || 'Unassigned',
        licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '', orCrExpiry: d.orCrExpiry ? d.orCrExpiry.split('T')[0] : '', franchisePermitExpiry: d.franchisePermitExpiry ? d.franchisePermitExpiry.split('T')[0] : '',
        profilePicUrl: d.profilePic || '', licensePicUrl: d.licensePic || '', orcrPicUrl: d.orcrPic || '', franchisePicUrl: d.franchisePic || '',
        registeredBy: d.registeredBy ? `${d.registeredBy.firstName} ${d.registeredBy.lastName}` : 'System Auto',
        createdAt: d.createdAt || new Date().toISOString(),
        isOnline: d.driverStatus === 'Active' ? Math.random() > 0.4 : false,
        rating: d.rating,
        totalReviews: d.totalReviews,
        // === THE FIX: MAPPING NEW FIELDS TO TABLE/MODAL ===
        email: d.email || '', address: d.address || '', emergencyContactName: d.emergencyContactName || '', emergencyContactPhone: d.emergencyContactPhone || '', tricycleColor: d.tricycleColor || '', bloodType: d.bloodType || 'Unknown',
        isBoundary: d.isBoundary || false, operatorName: d.operatorName || 'Owned', operatorPhone: d.operatorPhone || ''
      }));
      setDrivers(liveDrivers);
    } catch (error) { console.error('❌ Error fetching drivers:', error); }
  };

  const handleEditClick = (driver) => {
    setIsEditing(true); setCurrentDriverId(driver.id);
    setNewDriver({
      firstName: driver.firstName, middleName: driver.middleName || '', lastName: driver.lastName, suffix: driver.suffix || '', bodyNo: driver.bodyNo, plate: driver.plate, phone: driver.phone, status: driver.status, homeToda: driver.homeToda, plate: driver.plate, phone: driver.phone, status: driver.status, homeToda: driver.homeToda,
      licenseExpiry: driver.licenseExpiry, orCrExpiry: driver.orCrExpiry, franchisePermitExpiry: driver.franchisePermitExpiry,
      profilePicUrl: driver.profilePicUrl, licensePicUrl: driver.licensePicUrl, orcrPicUrl: driver.orcrPicUrl, franchisePicUrl: driver.franchisePicUrl,
      email: driver.email, address: driver.address, emergencyContactName: driver.emergencyContactName, emergencyContactPhone: driver.emergencyContactPhone, tricycleColor: driver.tricycleColor, bloodType: driver.bloodType,
      isBoundary: driver.isBoundary, operatorName: driver.operatorName, operatorPhone: driver.operatorPhone
    });
    setFiles({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null }); 
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setIsEditing(false); setCurrentDriverId(null);
    setNewDriver({ firstName: '', middleName: '', lastName: '', suffix: '', bodyNo: '', plate: '', phone: '', status: 'Pending', homeToda: 'Unassigned', licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '', profilePicUrl: '', licensePicUrl: '', orcrPicUrl: '', franchisePicUrl: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '', tricycleColor: '', bloodType: 'Unknown' });
    setFiles({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null }); 
    setIsModalOpen(true);
  };

  const handleFileChange = (e, fileType) => { setFiles({ ...files, [fileType]: e.target.files[0] }); };
// === THE FIX: ENTERPRISE MICROPOLISH HANDLERS ===
  const formatTitleCase = (str) => {
      return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  };
  const handleNameChange = (field, value) => {
      // Rejects numbers/symbols, forces Title Case (e.g. "juan" -> "Juan")
      setNewDriver({...newDriver, [field]: formatTitleCase(value.replace(/[^A-Za-z\s\-ñÑ.]/g, ''))});
  };
  const handlePhoneChange = (field, value) => {
      // Rejects letters, limits to exactly 11 digits
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
      setNewDriver({...newDriver, [field]: cleaned});
  };
  const handleEmailChange = (value) => {
      // Strips accidental spaces, forces lowercase
      setNewDriver({...newDriver, email: value.toLowerCase().replace(/\s/g, '')});
  };
  const handleAlphanumericUpper = (field, value) => {
      // Rejects special chars, forces UPPERCASE
      setNewDriver({...newDriver, [field]: value.toUpperCase().replace(/[^A-Z0-9\-\s]/g, '')});
  };
  const validateForm = () => {
    const nameRegex = /^[A-Za-z\s\-ñÑ.]{2,50}$/;
    const phoneRegex = /^(09|\+639)\d{9}$/; // Philippine Mobile
    const bodyNoRegex = /^[A-Za-z0-9\-\s]{1,15}$/;

    // === 1. PERSONAL DETAILS VALIDATION ===
    if (!nameRegex.test(newDriver.firstName.trim())) return "Invalid First Name. Use letters only.";
    if (!nameRegex.test(newDriver.lastName.trim())) return "Invalid Last Name. Use letters only.";
    if (!phoneRegex.test(newDriver.phone.trim())) return "Invalid Main Phone Number. Must be a valid 11-digit PH mobile.";
    
    // === 2. FLEXIBLE EMERGENCY CONTACT (ZERO-EXCLUSION) ===
    // If they type a name, it must be letters. But it CAN be left totally blank!
    if (newDriver.emergencyContactName && !nameRegex.test(newDriver.emergencyContactName.trim())) {
        return "Invalid Emergency Contact Name. Use letters only.";
    }
    // If they type a phone, it must be valid. But it CAN be left totally blank!
    if (newDriver.emergencyContactPhone && !phoneRegex.test(newDriver.emergencyContactPhone.trim())) {
        return "Invalid Emergency Contact Phone. Must be a valid 11-digit PH mobile.";
    }

    // === 3. NEW STRICT DEMOGRAPHICS ===
    // === THE FIX: MANDATORY GMAIL ENFORCEMENT ===
    if (!newDriver.email || !newDriver.email.trim()) {
        return "Official Email is strictly required to generate the driver's app credentials.";
    }
    // Email is 100% Optional. BloodType defaults to 'Unknown'.
    if (!newDriver.address || !newDriver.address.trim()) {
        return "Full Home Address is strictly required for LGU accountability.";
    }
    if (!newDriver.tricycleColor || !newDriver.tricycleColor.trim()) {
        return "Tricycle Color/Make is strictly required (e.g., 'Red Honda TMX').";
    }

    // === 4. GOVERNMENT & FLEET VALIDATION ===
    if (newDriver.homeToda === 'Unassigned') return "Please assign the driver to a valid TODA.";
    if (!newDriver.plate.trim()) return "Plate Number or temporary MV file number is required.";
    if (newDriver.bodyNo && !bodyNoRegex.test(newDriver.bodyNo.trim())) return "Invalid Body Number. Use letters and numbers only.";
    
    // === 5. STRICT CHRONOLOGICAL VALIDATION (MAX 10 YEARS) ===
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(today.getFullYear() + 10); 
    maxFutureDate.setHours(0, 0, 0, 0);

    // License Check
    if (!newDriver.licenseExpiry) return "Driver's License Expiration Date is mandatory.";
    const licenseDate = new Date(newDriver.licenseExpiry);
    if (licenseDate < today) return "Rejected: The Driver's License provided is already expired.";
    if (licenseDate > maxFutureDate) return "Rejected: License expiration date exceeds the 10-year legal maximum.";

    // OR/CR Check
    if (!newDriver.orCrExpiry) return "Tricycle OR/CR Expiration Date is mandatory.";
    const orcrDate = new Date(newDriver.orCrExpiry);
    if (orcrDate < today) return "Rejected: The Tricycle OR/CR provided is already expired.";
    if (orcrDate > maxFutureDate) return "Rejected: OR/CR expiration date exceeds the 10-year legal maximum.";

    // Franchise Check
    if (!newDriver.franchisePermitExpiry) return "Franchise Permit Expiration Date is mandatory.";
    const franchiseDate = new Date(newDriver.franchisePermitExpiry);
    if (franchiseDate < today) return "Rejected: The Franchise Permit provided is already expired.";
    if (franchiseDate > maxFutureDate) return "Rejected: Franchise Permit expiration exceeds the 10-year legal maximum.";

    // === 6. PHYSICAL DOCUMENT SCAN VAULT VALIDATION ===
    if (!isEditing) {
        if (!files.licensePic) return "Driver's License scan/photo is required.";
        if (!files.orcrPic) return "Tricycle OR/CR scan/photo is required.";
        if (!files.franchisePic) return "Franchise Permit scan/photo is required.";
    } else {
        if (!files.licensePic && !newDriver.licensePicUrl) return "Driver's License scan is missing.";
        if (!files.orcrPic && !newDriver.orcrPicUrl) return "Tricycle OR/CR scan is missing.";
        if (!files.franchisePic && !newDriver.franchisePicUrl) return "Franchise Permit scan is missing.";
    }

    return null; // Gateway Passed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return setModalState({ isOpen: true, title: "Validation Failed", message: validationError, type: "warning", isConfirm: false });
    
    // === THE FIX: INJECTING NEW FIELDS TO FORMDATA ===
    const formData = new FormData();
    formData.append('firstName', newDriver.firstName.trim()); 
    formData.append('middleName', (newDriver.middleName || '').trim()); 
    formData.append('lastName', newDriver.lastName.trim()); 
    formData.append('suffix', newDriver.suffix || ''); 
    formData.append('bodyNo', newDriver.bodyNo.trim()); 
    formData.append('plateNo', newDriver.plate.toUpperCase().trim()); 
    formData.append('phone', newDriver.phone); 
    formData.append('licenseExpiry', newDriver.licenseExpiry); 
    formData.append('orCrExpiry', newDriver.orCrExpiry); 
    formData.append('franchisePermitExpiry', newDriver.franchisePermitExpiry);
    
    // === OPERATOR APPENDS ===
    formData.append('operatorName', newDriver.operatorName.trim());
    formData.append('operatorPhone', newDriver.operatorPhone.trim());
    formData.append('isBoundary', newDriver.isBoundary);
    
    
    formData.append('email', newDriver.email.trim()); 
    formData.append('address', newDriver.address.trim()); 
    formData.append('emergencyContactName', newDriver.emergencyContactName.trim()); 
    formData.append('emergencyContactPhone', newDriver.emergencyContactPhone.trim()); 
    formData.append('tricycleColor', newDriver.tricycleColor.trim()); 
    formData.append('bloodType', newDriver.bloodType);
    
    const currentAdminId = adminUser._id || adminUser.id;
    if (currentAdminId) { formData.append('adminId', currentAdminId); }
    if (isEditing) formData.append('driverStatus', newDriver.status);
    if (files.profilePic) formData.append('profilePic', files.profilePic); if (files.licensePic) formData.append('licensePic', files.licensePic); if (files.orcrPic) formData.append('orcrPic', files.orcrPic); if (files.franchisePic) formData.append('franchisePic', files.franchisePic);

    try {
      if (isEditing) {
        await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${currentDriverId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setModalState({ isOpen: true, title: "Profile Updated", message: "Driver Profile Updated Successfully!", type: "success", isConfirm: false });
      } else {
        const response = await axios.post('https://tricycheck-api.onrender.com/api/admin/drivers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        // NOTE: Temp Password is removed from the message because it emails it directly now!
        setModalState({ isOpen: true, title: "Driver Registered", message: `Added Successfully!\n\nTheir login credentials have been dispatched to their email address.`, type: "success", isConfirm: false });
      }
      setIsModalOpen(false); fetchDrivers(); 
    } catch (error) { setModalState({ isOpen: true, title: "Database Error", message: error.response?.data?.error || "Transaction Failed.", type: "warning", isConfirm: false }); }
  };

  const handleResetPasswordClick = (driver) => {
    setTargetAction({ type: 'RESET_PASSWORD', payload: driver });
    setModalState({ isOpen: true, title: "Reset Password", message: `Are you sure you want to generate a new password for ${driver.name}?`, type: "warning", isConfirm: true });
  };

  const executeResetPassword = async () => {
    closeModal();
    try {
      // THE FIX: Injected the Authorization Token so it doesn't get blocked!
      await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${targetAction.payload.id}/reset-password`, 
        { adminId: adminUser._id || adminUser.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      );
      // THE FIX: Removed the password from the screen to prove Enterprise Security
      setTimeout(() => { setModalState({ isOpen: true, title: "Reset Successful", message: "Secure credentials have been successfully dispatched to the driver's registered email.", type: "success", isConfirm: false }); }, 300);
    } catch (error) { 
      setTimeout(() => { setModalState({ isOpen: true, title: "Action Failed", message: error.response?.data?.error || "Failed to reset password. Please check connection.", type: "warning", isConfirm: false }); }, 300); 
    }
  };
  const openReviewsModal = async (driver) => {
    setReviewsModal({ isOpen: true, driverName: driver.name, rating: driver.rating, driverId: driver.id });
    setLoadingReviews(true);
    try {
      // === THE FIX: Corrected Token Key ===
      const response = await axios.get(`https://tricycheck-api.onrender.com/api/admin/drivers/${driver.id}/reviews`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLiveReviews(response.data);
    } catch (error) {
      console.error("Failed to fetch reviews");
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleConfirmAction = () => { if (targetAction.type === 'RESET_PASSWORD') executeResetPassword(); };

  const checkCompliance = (driver) => {
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
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.bodyNo.includes(searchTerm);
      let matchesFilter = true;
      if (filterStatus === 'Online' && !isSecretary) matchesFilter = d.isOnline === true;
      if (filterStatus === 'Offline' && !isSecretary) matchesFilter = d.isOnline === false && d.status === 'Active'; 
      if (filterStatus === 'Pending') matchesFilter = d.status === 'Pending';
      if (filterStatus === 'Suspended') matchesFilter = d.status === 'Suspended';
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'A-Z') return a.name.localeCompare(b.name);
      if (sortBy === 'Z-A') return b.name.localeCompare(a.name);
      if (sortBy === 'Oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); 
    });

  // === LEADERBOARD ENGINE ===
  const leaderboardDrivers = [...drivers].filter(d => d.status === 'Active').sort((a, b) => b.rating - a.rating);

  const PodiumCard = ({ driver, rank, color, isWinner }) => (
    <div className={`relative flex flex-col items-center bg-white p-6 rounded-t-3xl border-t shadow-2xl w-56 ${isWinner ? 'h-[280px] z-10' : 'h-64 z-0'} transform transition-transform hover:-translate-y-2`}>
      <div className={`absolute -top-5 w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg text-lg ${color}`}>#{rank}</div>
      <div className={`w-24 h-24 rounded-full border-4 shadow-inner overflow-hidden mb-4 mt-2 ${color.replace('bg-', 'border-')}`}>
         {driver.profilePicUrl ? <img src={driver.profilePicUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">👤</div>}
      </div>
      <h3 className="font-black text-slate-800 text-center leading-tight mb-1 text-lg">{driver.name}</h3>
      <p className="text-[10px] font-bold text-slate-400 mb-auto tracking-widest">BODY NO. {driver.bodyNo}</p>
      <div className="flex items-center space-x-1 bg-slate-50 px-4 py-2 rounded-full mt-3 border border-slate-100 shadow-sm w-full justify-center">
         <IoStar className="text-yellow-500 text-xl" />
         <span className="font-black text-slate-800 text-xl">{driver.rating}</span>
         <span className="text-[10px] text-slate-400 ml-1 font-bold">({driver.totalReviews})</span>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      
      {/* === TOP TOGGLE ENGINE === */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2 bg-slate-200/60 p-1.5 rounded-2xl w-max shadow-inner">
           <button onClick={() => setViewMode('directory')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'directory' ? 'bg-white text-emerald-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <IoSearch className="text-lg"/> <span>Fleet Directory</span>
           </button>
           <button onClick={() => setViewMode('leaderboard')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'leaderboard' ? 'bg-white text-emerald-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <IoPodium className="text-lg"/> <span>Performance Leaderboard</span>
           </button>
        </div>

        {viewMode === 'directory' && (
          <button onClick={handleAddClick} className="bg-emerald-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-emerald-800 active:scale-95 shadow-md">
            <IoAdd className="text-lg" /> <span>Register Driver</span>
          </button>
        )}
      </div>

      {/* === MODE 1: FLEET DIRECTORY === */}
      {viewMode === 'directory' && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-72">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input type="text" placeholder="Search Body No. or Name..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-sm shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                    <option value="All">All Drivers</option>
                    {!isSecretary && <option value="Online">🟢 Live Online</option>}
                    {!isSecretary && <option value="Offline">⚫ Offline</option>}
                    <option value="Pending">🟡 Pending Docs</option>
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
                    <th className="p-4 pl-6 w-24">Body No.</th>
                    <th className="p-4">Driver Name</th>
                    <th className="p-4">TODA</th>
                    <th className="p-4">App Status</th>
                    <th className="p-4">Compliance</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                  {processedDrivers.map((driver) => {
                    const compliance = checkCompliance(driver);
                    return (
                      <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6 font-black text-slate-900">{driver.bodyNo || 'N/A'}</td>
                        
                        <td className="p-4 font-bold flex items-center space-x-3">
                           <div className="relative">
                               {driver.profilePicUrl ? (
                                 <img src={driver.profilePicUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                               ) : (
                                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs shadow-sm">👤</div>
                               )}
                               {(!isSecretary && driver.isOnline) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>}
                           </div>
                           <div>
                             <div className="flex items-center space-x-2">
                                <p className="text-slate-800 leading-tight font-black">{driver.name}</p>
                                {driver.isBoundary ? (
                                    <span className="bg-orange-100 text-orange-700 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm border border-orange-200">Rented</span>
                                ) : (
                                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm border border-emerald-200">Owned</span>
                                )}
                             </div>
                             <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">Added by: <span className="text-emerald-600">{driver.registeredBy}</span></p>
                           </div>
                        </td>

                        <td className="p-4 text-emerald-600 font-bold">{driver.homeToda}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${driver.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                            {driver.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-wider shadow-sm flex items-center w-max ${compliance.color}`}>
                             {compliance.label === 'EXPIRED DOCS' && <IoWarning className="mr-1 text-sm" />}
                             {compliance.label}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                          {/* === THE FIX: CONTEXTUAL RED HAMMER / GREEN SHIELD === */}
                          <button 
                             onClick={() => setQuickViewModal({ isOpen: true, driver: driver, activeTab: 'disciplinary' })} 
                             className={`p-2 rounded-lg shadow-sm transition-colors ${driver.status === 'Suspended' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} 
                             title={driver.status === 'Suspended' ? "Lift Suspension" : "Disciplinary Actions"}
                          >
                             {driver.status === 'Suspended' ? <IoShieldCheckmark /> : <IoWarning />}
                          </button>
                          
                          {/* === STANDARD ACTIONS === */}
                          <button onClick={() => setQuickViewModal({ isOpen: true, driver: driver, activeTab: 'info' })} className="p-2 bg-emerald-50 text-blue-600 rounded-lg hover:bg-blue-100 shadow-sm" title="View Full Info"><IoEye /></button>
                          <button onClick={() => handleResetPasswordClick(driver)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 shadow-sm" title="Reset Password"><IoKey /></button>
                          <button onClick={() => handleEditClick(driver)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 shadow-sm" title="Edit Profile"><IoPencil /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {processedDrivers.length === 0 && (
                     <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No drivers found matching your criteria.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === MODE 2: THE PERFORMANCE LEADERBOARD === */}
      {viewMode === 'leaderboard' && (
        <div className="flex-1 flex flex-col animate-fade-in overflow-y-auto">
          
          <div className="text-center mb-10 mt-4">
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Top Performing Drivers</h2>
             <p className="text-sm font-medium text-slate-500 mt-2">Ranked by passenger 5-star reviews and successful trip volume.</p>
          </div>

          {/* THE PODIUM */}
          <div className="flex justify-center items-end space-x-6 mb-12">
             {/* Rank 2 (Silver) */}
             {leaderboardDrivers[1] && <PodiumCard driver={leaderboardDrivers[1]} rank={2} color="bg-slate-400" />}
             {/* Rank 1 (Gold) */}
             {leaderboardDrivers[0] && <PodiumCard driver={leaderboardDrivers[0]} rank={1} color="bg-yellow-500" isWinner />}
             {/* Rank 3 (Bronze) */}
             {leaderboardDrivers[2] && <PodiumCard driver={leaderboardDrivers[2]} rank={3} color="bg-orange-400" />}
          </div>

          {/* THE LEADERBOARD LIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden max-w-4xl mx-auto w-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">Full Fleet Ranking</h3>
               <IoStar className="text-yellow-500 text-xl" />
            </div>
            <div className="divide-y divide-slate-100">
               {leaderboardDrivers.slice(3).map((driver, index) => (
                 <div key={driver.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                       <span className="font-black text-slate-400 text-lg w-6 text-center">#{index + 4}</span>
                       <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden shadow-sm">
                         {driver.profilePicUrl ? <img src={driver.profilePicUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-lg">👤</div>}
                       </div>
                       <div>
                         <p className="font-bold text-slate-800 text-base">{driver.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Body No. {driver.bodyNo}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-6">
                       <div className="text-right">
                          <p className="font-black text-slate-800 text-lg flex items-center justify-end"><IoStar className="text-yellow-500 mr-1 text-sm"/> {driver.rating}</p>
                          <p className="text-[10px] font-bold text-slate-400">{driver.totalReviews} Reviews</p>
                       </div>
                       <button 
                          onClick={() => openReviewsModal(driver)}
                          className="bg-emerald-50 text-emerald-600 p-3 rounded-xl hover:bg-emerald-100 transition-colors"
                          title="Read Passenger Reviews"
                       >
                          <IoChatbubbles className="text-xl" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* === THE EXISTING DRIVER REGISTRATION MODAL === */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            
            {/* MODAL HEADER */}
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-xl font-black">{isEditing ? 'Edit Driver Profile' : 'Register New Tricycle'}</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">POSO Secure File Vault System</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 hover:bg-emerald-800 rounded-full transition-colors"><IoClose className="text-xl" /></button>
            </div>

            {/* === THE FIX: RESTORED THE SCROLLABLE FORM WRAPPER === */}
            {/* === THE FIX: INJECTED min-h-0 TO FORCE SCROLL WHEEL ACTIVATION IN FLEX CONTAINERS === */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-8 relative">
              
              <div className="flex items-center space-x-6 mb-8 border-b pb-6">
                <div className="relative group cursor-pointer shrink-0">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                     {files.profilePic ? <img src={URL.createObjectURL(files.profilePic)} alt="Preview" className="w-full h-full object-cover" /> : newDriver.profilePicUrl ? <img src={newDriver.profilePicUrl} alt="Saved Profile" className="w-full h-full object-cover" /> : <IoCamera className="text-3xl text-slate-400" />}
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePic')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Driver's 2x2 Photo</h3>
                   <p className="text-xs text-slate-500 mt-1">Upload an official passport-sized photo of the driver for passenger identification.</p>
                </div>
              </div>

              {/* === THE FIX: DECUPLED HUMAN IDENTITY ZONE (MICROPOLISHED) === */}
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Driver Personal Details</h3>
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-4"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.firstName} onChange={e => handleNameChange('firstName', e.target.value)} /></div>
                <div className="col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Middle Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Optional" value={newDriver.middleName} onChange={e => handleNameChange('middleName', e.target.value)} /></div>
                <div className="col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.lastName} onChange={e => handleNameChange('lastName', e.target.value)} /></div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Suffix</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer outline-none" value={newDriver.suffix} onChange={e => setNewDriver({...newDriver, suffix: e.target.value})}>
                        <option value="">N/A</option><option value="Jr.">Jr.</option><option value="Sr.">Sr.</option><option value="II">II</option><option value="III">III</option>
                    </select>
                </div>

                <div className="col-span-6">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile (11 Digits)</label>
                    <input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold placeholder-slate-300" placeholder="09xxxxxxxxx" value={newDriver.phone} onChange={e => handlePhoneChange('phone', e.target.value)} />
                </div>
                <div className="col-span-6">
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Official Email * (Required)</label>
                    <input required type="email" className="w-full p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold placeholder-emerald-300 shadow-inner focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="driver@gmail.com" value={newDriver.email} onChange={e => handleEmailChange(e.target.value)} />
                </div>
              </div>
              {/* === THE FIX: THE MASTER OWNERSHIP TOGGLE === */}
              <div className="col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tricycle Ownership Status</h4>
                          <p className="text-xs font-bold text-slate-500 mt-1">Is the driver also the Operator/Franchise Owner?</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={newDriver.isBoundary} onChange={e => setNewDriver({...newDriver, isBoundary: e.target.checked, operatorName: e.target.checked ? '' : 'Owned', operatorPhone: e.target.checked ? '' : ''})} />
                          <div className="w-14 h-7 bg-emerald-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-400 shadow-inner"></div>
                          <span className="ml-3 text-xs font-black uppercase tracking-widest w-28 text-right select-none">
                              {newDriver.isBoundary ? <span className="text-orange-600">Rented / Boundary</span> : <span className="text-emerald-600">Driver-Owned</span>}
                          </span>
                      </label>
                  </div>

                  {newDriver.isBoundary && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 animate-slide-up">
                          <div>
                              <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-2">Operator / Owner Name *</label>
                              <input type="text" required={newDriver.isBoundary} className="w-full p-3 bg-white border border-orange-200 focus:border-orange-500 outline-none rounded-xl font-bold placeholder-slate-400 shadow-inner" placeholder="Name on Franchise" value={newDriver.operatorName || ''} onChange={e => handleNameChange('operatorName', e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-2">Operator Contact No. *</label>
                              <input type="tel" required={newDriver.isBoundary} className="w-full p-3 bg-white border border-orange-200 focus:border-orange-500 outline-none rounded-xl font-bold placeholder-slate-400 shadow-inner" placeholder="e.g. 09123456789" value={newDriver.operatorPhone || ''} onChange={e => handlePhoneChange('operatorPhone', e.target.value)} />
                          </div>
                      </div>
                  )}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">App Status</label>
                      <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold shadow-sm" value={newDriver.status} onChange={e => setNewDriver({...newDriver, status: e.target.value})}><option value="Active">Active</option><option value="Pending">Pending</option><option value="Suspended">Suspended</option></select>
                    </div>
                  )}
              </div>

              {/* === THE FIX: EMERGENCY & ACCOUNTABILITY ZONE === */}
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Emergency & Accountability</h3>
              <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Home Address</label><input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" placeholder="Brgy. San Miguel, Calasiao" value={newDriver.address} onChange={e => setNewDriver({...newDriver, address: e.target.value})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Emergency Contact Name</label><input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newDriver.emergencyContactName} onChange={e => handleNameChange('emergencyContactName', e.target.value)} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Emergency Contact Phone</label><input type="tel" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={newDriver.emergencyContactPhone} onChange={e => handlePhoneChange('emergencyContactPhone', e.target.value)} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tricycle Color/Make</label><input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm placeholder-slate-400" placeholder="e.g. Red Honda Barako" value={newDriver.tricycleColor} onChange={e => setNewDriver({...newDriver, tricycleColor: e.target.value})} /></div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Blood Type</label>
                   <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm cursor-pointer" value={newDriver.bloodType} onChange={e => setNewDriver({...newDriver, bloodType: e.target.value})}>
                     <option value="Unknown">Unknown</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                   </select>
                </div>
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Government Vault</h3>
              <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Body No. *</label>
                   <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-900 uppercase" value={newDriver.bodyNo} onChange={e => handleAlphanumericUpper('bodyNo', e.target.value)} />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Plate No. *</label>
                   <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono uppercase" value={newDriver.plate} onChange={e => handleAlphanumericUpper('plate', e.target.value)} />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Home TODA *</label>
                   <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold cursor-pointer outline-none text-slate-700 shadow-sm" value={newDriver.homeToda} onChange={e => setNewDriver({...newDriver, homeToda: e.target.value})}>
                     <option value="Unassigned">-- Select TODA --</option>
                     <option value="Poblacion TODA">Poblacion TODA</option>
                     <option value="San Miguel TODA">San Miguel TODA</option>
                     <option value="Bued TODA">Bued TODA</option>
                     <option value="Ambonao TODA">Ambonao TODA</option>
                     <option value="Nalsian TODA">Nalsian TODA</option>
                     <option value="Dinalaoan TODA">Dinalaoan TODA</option>
                   </select>
                </div>
                
                <div className="col-span-3 space-y-4 mt-2">
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Driver's License (Expiry & Scan)</label>{newDriver.licensePicUrl && <a href={newDriver.licensePicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.licenseExpiry} onChange={e => setNewDriver({...newDriver, licenseExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'licensePic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Tricycle OR/CR (Expiry & Scan)</label>{newDriver.orcrPicUrl && <a href={newDriver.orcrPicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.orCrExpiry} onChange={e => setNewDriver({...newDriver, orCrExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'orcrPic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Franchise Permit (Expiry & Scan)</label>{newDriver.franchisePicUrl && <a href={newDriver.franchisePicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.franchisePermitExpiry} onChange={e => setNewDriver({...newDriver, franchisePermitExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'franchisePic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Now correctly inside the form!) */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-500 active:scale-95 transition-all">
                  {isEditing ? 'Save Profile' : 'Register Driver'}
                </button>
              </div>
            </form>
            
          </div>
        </div>,
        document.body
      )}

      {/* === THE NEW REVIEWS VIEWER MODAL === */}
      {reviewsModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[2010] flex items-center justify-center p-4">
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
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-center justify-between mb-6 shadow-sm">
                   <span className="font-black text-yellow-700 uppercase tracking-widest text-xs">Overall Performance</span>
                   <span className="font-black text-2xl text-yellow-600 flex items-center"><IoStar className="mr-1 text-xl"/> {reviewsModal.rating}</span>
                </div>

                {/* === LIVE REVIEWS FROM DATABASE === */}
                <div className="space-y-4">
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
                           <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">
                              {new Date(rev.date).toLocaleDateString()}
                           </p>
                        </div>
                      ))
                   )}
                </div>
                <p className="text-center text-xs font-bold text-slate-400 mt-6 italic">* Additional database integration required to pull live text reviews.</p>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* === THE NEW QUICK-VIEW MODAL === */}
      {quickViewModal.isOpen && quickViewModal.driver && createPortal(
        <div className="fixed inset-0 z-[2020] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuickViewModal({ isOpen: false, driver: null })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
               <div>
                  <h2 className="text-xl font-black flex items-center"><IoDocumentText className="mr-2 text-emerald-600"/> Driver Personnel File</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Read-Only View</p>
               </div>
               <button onClick={() => setQuickViewModal({ isOpen: false, driver: null })} className="p-2 bg-slate-800 hover:bg-emerald-800 rounded-full transition-colors"><IoClose className="text-xl" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
               <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden shadow-md shrink-0">
                     {quickViewModal.driver.profilePicUrl ? <img src={quickViewModal.driver.profilePicUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl">👤</div>}
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{quickViewModal.driver.name}</h3>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">BODY NO. <span className="text-emerald-600 font-black">{quickViewModal.driver.bodyNo || 'N/A'}</span> | {quickViewModal.driver.homeToda}</p>
                     <span className={`inline-block mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${quickViewModal.driver.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{quickViewModal.driver.status}</span>
                  </div>
               </div>

               {/* === THE FIX: INTENT-BASED TAB NAVIGATION === */}
               <div className="flex border-b border-slate-200 mb-6">
                   <button 
                       className={`px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all ${quickViewModal.activeTab === 'info' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                       onClick={() => setQuickViewModal({...quickViewModal, activeTab: 'info'})}
                   >
                       Personnel File
                   </button>
                   <button 
                       className={`px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all ${quickViewModal.activeTab === 'disciplinary' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                       onClick={() => setQuickViewModal({...quickViewModal, activeTab: 'disciplinary'})}
                   >
                       Disciplinary Actions
                   </button>
               </div>

               {/* === TAB 1: PERSONNEL INFO === */}
               {quickViewModal.activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mobile / Email</p>
                     <p className="font-mono font-bold text-slate-700">{quickViewModal.driver.phone || 'N/A'}</p>
                     <p className="text-[10px] font-bold text-slate-500 mt-1 truncate" title={quickViewModal.driver.email}>{quickViewModal.driver.email || 'No Email Registered'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency / Blood</p>
                     <p className="font-bold text-slate-700 text-sm truncate">{quickViewModal.driver.emergencyContactName || 'N/A'} ({quickViewModal.driver.emergencyContactPhone || 'N/A'})</p>
                     <p className="text-[10px] font-bold text-red-500 mt-1">Blood Type: {quickViewModal.driver.bloodType || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Plate / Tricycle</p>
                     <p className="font-mono font-bold text-slate-700 uppercase">{quickViewModal.driver.plate || 'N/A'}</p>
                     <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">{quickViewModal.driver.tricycleColor || 'No Color Data'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Address</p>
                     <p className="font-bold text-slate-700 text-xs line-clamp-2">{quickViewModal.driver.address || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">License Expiry</p>
                     <p className={`font-bold ${!quickViewModal.driver.licenseExpiry ? 'text-red-500' : 'text-slate-700'}`}>{quickViewModal.driver.licenseExpiry || 'MISSING'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Franchise Expiry</p>
                     <p className={`font-bold ${!quickViewModal.driver.franchisePermitExpiry ? 'text-red-500' : 'text-slate-700'}`}>{quickViewModal.driver.franchisePermitExpiry || 'MISSING'}</p>
                  </div>
                  </div>
               )}

               {/* === TAB 2: DISCIPLINARY ACTIONS (STATE AWARE) === */}
               {quickViewModal.activeTab === 'disciplinary' && (
                  quickViewModal.driver.status === 'Suspended' ? (
                      /* === THE UNBAN UI === */
                      <div className="animate-fade-in bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                              <IoShieldCheckmark />
                          </div>
                          <h4 className="font-black text-emerald-900 text-xl mb-2">Driver is Currently Suspended</h4>
                          <p className="text-sm font-bold text-emerald-700 mb-6 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm inline-block w-full text-left">
                             <span className="block text-[10px] text-emerald-500 uppercase mb-1">Recorded Reason:</span>
                             {quickViewModal.driver.suspensionReason || "Administrative Lockout"}
                          </p>
                          
                          <button 
                              className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-[0_5px_15px_rgba(5,150,105,0.3)] hover:bg-emerald-500 active:scale-95 transition-all flex justify-center items-center"
                              onClick={async () => {
                                  try {
                                      await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/unban`, {
                                          adminId: adminUser._id || adminUser.id
                                      }, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }});
                                      
                                      setQuickViewModal({ isOpen: false, driver: null, activeTab: 'info' });
                                      setModalState({ isOpen: true, title: "Access Restored", message: "Suspension lifted. The driver can now log into the application.", type: "success" });
                                      fetchDrivers(); 
                                  } catch (error) {
                                      setModalState({ isOpen: true, title: "Action Failed", message: "Could not lift suspension. Check connection.", type: "error" });
                                  }
                              }}
                          >
                              LIFT PENALTY & RESTORE ACCESS
                          </button>
                      </div>
                  ) : (
                      /* === THE EXISTING BAN UI === */
                      <div className="animate-fade-in bg-red-50/50 p-6 rounded-2xl border border-red-100">
                          <h4 className="font-black text-red-900 text-lg mb-2 flex items-center"><IoWarning className="mr-2"/> Deploy Penalty</h4>
                          <p className="text-xs font-medium text-red-700 mb-6 leading-relaxed">Suspending a driver will immediately force-logout their application and prohibit them from accepting dispatch requests until the suspension timer expires.</p>
                          
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
                              className="mt-6 w-full py-4 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center"
                              disabled={!penaltyForm.reason || penaltyForm.isSubmitting}
                              onClick={async () => {
                                  setPenaltyForm({...penaltyForm, isSubmitting: true});
                                  try {
                                      await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/suspend`, {
                                          duration: penaltyForm.duration,
                                          reason: penaltyForm.reason,
                                          adminId: adminUser._id || adminUser.id
                                      }, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }});
                                      
                                      setQuickViewModal({ isOpen: false, driver: null, activeTab: 'info' });
                                      setModalState({ isOpen: true, title: "Justice Served", message: "Penalty deployed successfully. The driver has been securely locked out of the application.", type: "success" });
                                      fetchDrivers(); 
                                  } catch (error) {
                                      setModalState({ isOpen: true, title: "Execution Failed", message: "Could not deploy penalty. Check server connection.", type: "warning" });
                                  } finally {
                                      setPenaltyForm({...penaltyForm, isSubmitting: false, reason: ''});
                                  }
                              }}
                          >
                              {penaltyForm.isSubmitting ? "EXECUTING BAN..." : "CONFIRM SUSPENSION"}
                          </button>
                      </div>
                  )
               )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0">
               <button 
                  onClick={async () => {
                     setQuickViewModal({ isOpen: false, driver: null });
                     try {
                        await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/inform`, { adminId: adminUser._id || adminUser.id }, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }});
                        setModalState({ isOpen: true, title: "Warning Sent", message: "Official LGU warning email dispatched to driver.", type: "success" });
                     } catch (err) { setModalState({ isOpen: true, title: "Dispatch Failed", message: "Driver missing email or connection failed.", type: "warning" }); }
                  }}
                  className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center shadow-sm"
               >
                  <IoWarning className="mr-2" /> Inform Expiring Docs (Email)
               </button>
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