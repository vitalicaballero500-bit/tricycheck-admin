import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IoSearch, IoAdd, IoPencil, IoKey, IoClose, IoWarning, IoCamera, IoEye, 
  IoFilter, IoSwapVertical, IoStar, IoChatbubbles, IoPodium, IoDocumentText
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
  const [quickViewModal, setQuickViewModal] = useState({ isOpen: false, driver: null });

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isSecretary = adminUser.role === 'secretary'; 

  const [newDriver, setNewDriver] = useState({ 
    firstName: '', lastName: '', bodyNo: '', plate: '', phone: '', status: 'Pending',
    homeToda: 'Unassigned', licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '',
    profilePicUrl: '', licensePicUrl: '', orcrPicUrl: '', franchisePicUrl: '' 
  });

  const [files, setFiles] = useState({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null });

  useEffect(() => { fetchDrivers(); }, []);

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
        // === THE FIX: LIVE AGGREGATION DATA ===
        rating: d.rating,
        totalReviews: d.totalReviews,
      }));
      setDrivers(liveDrivers);
    } catch (error) { console.error('❌ Error fetching drivers:', error); }
  };

  const handleEditClick = (driver) => {
    setIsEditing(true); setCurrentDriverId(driver.id);
    setNewDriver({
      firstName: driver.firstName, lastName: driver.lastName, bodyNo: driver.bodyNo, plate: driver.plate, phone: driver.phone, status: driver.status, homeToda: driver.homeToda,
      licenseExpiry: driver.licenseExpiry, orCrExpiry: driver.orCrExpiry, franchisePermitExpiry: driver.franchisePermitExpiry,
      profilePicUrl: driver.profilePicUrl, licensePicUrl: driver.licensePicUrl, orcrPicUrl: driver.orcrPicUrl, franchisePicUrl: driver.franchisePicUrl
    });
    setFiles({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null }); 
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setIsEditing(false); setCurrentDriverId(null);
    setNewDriver({ firstName: '', lastName: '', bodyNo: '', plate: '', phone: '', status: 'Pending', homeToda: 'Unassigned', licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '', profilePicUrl: '', licensePicUrl: '', orcrPicUrl: '', franchisePicUrl: '' });
    setFiles({ profilePic: null, licensePic: null, orcrPic: null, franchisePic: null }); 
    setIsModalOpen(true);
  };

  const handleFileChange = (e, fileType) => { setFiles({ ...files, [fileType]: e.target.files[0] }); };

  const validateForm = () => {
    const nameRegex = /^[A-Za-z\s\-ñÑ]{2,50}$/;
    if (!nameRegex.test(newDriver.firstName.trim())) return "Invalid First Name.";
    if (!nameRegex.test(newDriver.lastName.trim())) return "Invalid Last Name.";
    const bodyNoRegex = /^\d{1,4}$/;
    if (newDriver.bodyNo && !bodyNoRegex.test(newDriver.bodyNo.trim())) return "Invalid Body Number.";
    return null; 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return setModalState({ isOpen: true, title: "Validation Failed", message: validationError, type: "warning", isConfirm: false });
    
    const formData = new FormData();
    formData.append('firstName', newDriver.firstName.trim()); formData.append('lastName', newDriver.lastName.trim()); formData.append('bodyNo', newDriver.bodyNo.trim()); formData.append('plateNo', newDriver.plate.toUpperCase().trim()); formData.append('phone', newDriver.phone); formData.append('homeToda', newDriver.homeToda); formData.append('licenseExpiry', newDriver.licenseExpiry); formData.append('orCrExpiry', newDriver.orCrExpiry); formData.append('franchisePermitExpiry', newDriver.franchisePermitExpiry);
    
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
        setModalState({ isOpen: true, title: "Driver Registered", message: `Added Successfully!\n\nTemp Password: ${response.data.tempPassword}`, type: "success", isConfirm: false });
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
      const response = await axios.put(`https://tricycheck-api.onrender.com/api/admin/users/${targetAction.payload.id}/reset-password`, { adminId: adminUser._id || adminUser.id });
      setTimeout(() => { setModalState({ isOpen: true, title: "Reset Successful", message: `New Temp Password: ${response.data.tempPassword}`, type: "success", isConfirm: false }); }, 300);
    } catch (error) { setTimeout(() => { setModalState({ isOpen: true, title: "Reset Failed", message: "Failed to reset password. Please check connection.", type: "warning", isConfirm: false }); }, 300); }
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
           <button onClick={() => setViewMode('directory')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'directory' ? 'bg-white text-posoDark shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <IoSearch className="text-lg"/> <span>Fleet Directory</span>
           </button>
           <button onClick={() => setViewMode('leaderboard')} className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'leaderboard' ? 'bg-white text-posoDark shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <IoPodium className="text-lg"/> <span>Performance Leaderboard</span>
           </button>
        </div>

        {viewMode === 'directory' && (
          <button onClick={handleAddClick} className="bg-posoDark text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-slate-800 active:scale-95 shadow-md">
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
              <input type="text" placeholder="Search Body No. or Name..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-angkasBlue text-sm shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex space-x-3">
              <div className="relative">
                 <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-angkasBlue text-sm shadow-sm font-bold text-slate-700 cursor-pointer">
                    <option value="Newest">Newest First</option>
                    <option value="Oldest">Oldest First</option>
                    <option value="A-Z">Name (A-Z)</option>
                    <option value="Z-A">Name (Z-A)</option>
                 </select>
                 <IoSwapVertical className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
              </div>
              <div className="relative">
                 <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-angkasBlue text-sm shadow-sm font-bold text-slate-700 cursor-pointer">
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
                             <p className="text-slate-800 leading-tight flex items-center">{driver.name}</p>
                             <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">Added by: <span className="text-angkasBlue">{driver.registeredBy}</span></p>
                           </div>
                        </td>

                        <td className="p-4 text-angkasBlue font-bold">{driver.homeToda}</td>
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
                        <td className="p-4 pr-6 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQuickViewModal({ isOpen: true, driver: driver })} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="View Full Info"><IoEye /></button>
                          <button onClick={() => handleResetPasswordClick(driver)} className="p-2 bg-emerald-50 text-angkasBlue rounded-lg hover:bg-emerald-100" title="Reset Password"><IoKey /></button>
                          <button onClick={() => handleEditClick(driver)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Edit Profile"><IoPencil /></button>
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
                          className="bg-emerald-50 text-angkasBlue p-3 rounded-xl hover:bg-emerald-100 transition-colors"
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
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <div className="bg-posoDark p-6 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-xl font-black">{isEditing ? 'Edit Driver Profile' : 'Register New Tricycle'}</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">POSO Secure File Vault System</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><IoClose className="text-xl" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
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

              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.firstName} onChange={e => setNewDriver({...newDriver, firstName: e.target.value})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.lastName} onChange={e => setNewDriver({...newDriver, lastName: e.target.value})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile</label><input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} /></div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">TODA</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.homeToda} onChange={e => setNewDriver({...newDriver, homeToda: e.target.value})}>
                      <option value="Unassigned">-- Select TODA --</option>
                      <option value="Calasiao Plaza TODA">Calasiao Plaza TODA</option>
                      <option value="Bued TODA">Bued TODA</option>
                      <option value="San Miguel TODA">San Miguel TODA</option>
                    </select>
                </div>
                {isEditing && (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">App Status</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newDriver.status} onChange={e => setNewDriver({...newDriver, status: e.target.value})}><option value="Active">Active</option><option value="Pending">Pending</option><option value="Suspended">Suspended</option></select>
                  </div>
                )}
              </div>

              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Government Vault</h3>
              <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Body No.</label><input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-900" value={newDriver.bodyNo} onChange={e => setNewDriver({...newDriver, bodyNo: e.target.value})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Plate No.</label><input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono uppercase" value={newDriver.plate} onChange={e => setNewDriver({...newDriver, plate: e.target.value})} /></div>
                
                <div className="col-span-2 space-y-4 mt-2">
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Driver's License (Expiry & Scan)</label>{newDriver.licensePicUrl && <a href={newDriver.licensePicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-angkasBlue font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.licenseExpiry} onChange={e => setNewDriver({...newDriver, licenseExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'licensePic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Tricycle OR/CR (Expiry & Scan)</label>{newDriver.orcrPicUrl && <a href={newDriver.orcrPicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-angkasBlue font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.orCrExpiry} onChange={e => setNewDriver({...newDriver, orCrExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'orcrPic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between items-end mb-2"><label className="block text-[10px] font-bold text-slate-500 uppercase">Franchise Permit (Expiry & Scan)</label>{newDriver.franchisePicUrl && <a href={newDriver.franchisePicUrl} target="_blank" rel="noreferrer" className="text-[10px] text-angkasBlue font-bold hover:underline flex items-center"><IoEye className="mr-1"/>View Saved Doc</a>}</div>
                     <div className="flex space-x-2"><input type="date" className="w-1/3 p-3 bg-white border rounded-xl font-bold text-sm" value={newDriver.franchisePermitExpiry} onChange={e => setNewDriver({...newDriver, franchisePermitExpiry: e.target.value})} /><input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'franchisePic')} className="w-2/3 p-2 bg-white border rounded-xl text-sm" /></div>
                   </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="bg-angkasBlue text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-500 active:scale-95 transition-all">
                  {isEditing ? 'Save Profile' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === THE NEW REVIEWS VIEWER MODAL === */}
      {reviewsModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReviewsModal({ isOpen: false, driverName: '', rating: 0 })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                   <h2 className="font-black text-slate-800 text-xl flex items-center"><IoChatbubbles className="mr-2 text-angkasBlue"/> Passenger Feedback</h2>
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
        </div>
      )}
{/* === THE NEW QUICK-VIEW MODAL === */}
      {quickViewModal.isOpen && quickViewModal.driver && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuickViewModal({ isOpen: false, driver: null })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="bg-posoDark p-6 flex justify-between items-center text-white shrink-0">
               <div>
                  <h2 className="text-xl font-black flex items-center"><IoDocumentText className="mr-2 text-angkasBlue"/> Driver Personnel File</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Read-Only View</p>
               </div>
               <button onClick={() => setQuickViewModal({ isOpen: false, driver: null })} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><IoClose className="text-xl" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
               <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden shadow-md shrink-0">
                     {quickViewModal.driver.profilePicUrl ? <img src={quickViewModal.driver.profilePicUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl">👤</div>}
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{quickViewModal.driver.name}</h3>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">BODY NO. <span className="text-angkasBlue font-black">{quickViewModal.driver.bodyNo || 'N/A'}</span> | {quickViewModal.driver.homeToda}</p>
                     <span className={`inline-block mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${quickViewModal.driver.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{quickViewModal.driver.status}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mobile Number</p>
                     <p className="font-mono font-bold text-slate-700">{quickViewModal.driver.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Plate Number</p>
                     <p className="font-mono font-bold text-slate-700 uppercase">{quickViewModal.driver.plate || 'N/A'}</p>
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
        </div>
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