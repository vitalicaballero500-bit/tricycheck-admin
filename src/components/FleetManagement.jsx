import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  IoSearch, IoPencil, IoKey, IoClose, IoWarning, IoEye, 
  IoFilter, IoSwapVertical, IoStar, IoChatbubbles, IoDocumentText, 
  IoShieldCheckmark, IoRefresh, IoExpand, IoCheckmarkCircle, IoSave, IoDownload
} from 'react-icons/io5';
import CustomModal from './CustomModal';

const CALASIAO_BARANGAYS = [
  "Ambonao", "Bued", "Buenlag", "Cabilocaan", "Dinalaoan", "Doyong", 
  "Gabon", "Lasip", "Longos", "Lumbang", "Macabito", "Malabago", 
  "Mancup", "Nagsaing", "Nalsian", "Poblacion East", "Poblacion West", 
  "Quesban", "Royo", "Salinap", "San Miguel", "San Vicente", "Songkoy", "Talibaew"
];

function FleetManagement() {
  const [viewMode, setViewMode] = useState('directory');
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

  // === DISCIPLINARY / TRIBUNAL MODAL STATE (WITH AUTOMATED TICKET SELECTOR) ===
  const [quickViewModal, setQuickViewModal] = useState({ isOpen: false, driver: null, activeTab: 'disciplinary' });
  const [penaltyForm, setPenaltyForm] = useState({ duration: '24h', selectedTicketId: 'FIELD_CITATION', reason: '', isSubmitting: false });
  const [driverTickets, setDriverTickets] = useState([]);
  const [loadingDriverTickets, setLoadingDriverTickets] = useState(false);

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

  // === INLINE RENEWAL RETURN REASON STATE (REPLACES NATIVE WINDOW.PROMPT) ===
  const [renewalReturnState, setRenewalReturnState] = useState({
    isOpen: false,
    reason: ''
  });

  // === FULL-SCREEN IMAGE LIGHTBOX OVERLAY & ROTATION ===
  const [rotation, setRotation] = useState(0);
  const [fullScreenDoc, setFullScreenDoc] = useState({ isOpen: false, url: '', title: '' });
  const [downloadingDoc, setDownloadingDoc] = useState(false);

  // === EDITABLE DRIVER FORM STATE (SYNCED 1:1 WITH MOBILE WIZARD + ADMIN PHOTO RE-UPLOAD) ===
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: '',
    tricycleColor: '', bodyNo: '', plateNo: '', licenseNo: '',
    licenseExpiry: '', orCrExpiry: '', franchisePermitExpiry: '', driverStatus: 'Active'
  });
  const [editFiles, setEditFiles] = useState({
    profilePic: null, licensePic: null, orPic: null, crPic: null, franchisePic: null
  });
  const [inspectingRenewalPreview, setInspectingRenewalPreview] = useState(false);
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  useEffect(() => { 
    fetchDrivers(); 
    const interval = setInterval(fetchDrivers, 8000);
    return () => clearInterval(interval);
  }, []);

  // === OPEN TRIBUNAL MODAL & AUTO-LOAD / AUTO-SELECT LINKED TICKET FOR THAT DRIVER ===
  const openTribunalModal = async (driver) => {
    const preselectedTicketId = localStorage.getItem('teleportTicketId');
    if (preselectedTicketId) localStorage.removeItem('teleportTicketId');

    setQuickViewModal({ isOpen: true, driver, activeTab: 'disciplinary' });
    setPenaltyForm({ duration: '24h', selectedTicketId: 'FIELD_CITATION', reason: '', isSubmitting: false });
    setLoadingDriverTickets(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await axios.get('https://tricycheck-api.onrender.com/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const linked = (res.data || []).filter(t => {
        const dId = t.driverId?._id || t.driverId;
        return String(dId) === String(driver.id);
      });
      setDriverTickets(linked);

      if (preselectedTicketId) {
        const matched = linked.find(t => String(t._id) === String(preselectedTicketId));
        if (matched) {
          const shortId = matched._id.substring(matched._id.length - 6).toUpperCase();
          const autoReason = `${matched.type} — Case #${shortId} (${matched.description ? matched.description.slice(0, 45) : 'Verified by POSO'})`;
          setPenaltyForm(prev => ({ ...prev, selectedTicketId: matched._id, reason: autoReason }));
        }
      }
    } catch (e) {
      setDriverTickets([]);
    } finally {
      setLoadingDriverTickets(false);
    }
  };

  // === TELEMETRY RECEIVER ENGINE (FROM SUPPORT TICKETS OR COMPLIANCE HUB) ===
  useEffect(() => {
    const checkTeleport = () => {
      const teleportId = localStorage.getItem('teleportDriverId');
      const teleportMode = localStorage.getItem('teleportDriverMode') || 'disciplinary';
      if (teleportId && drivers.length > 0) {
        const targetDriver = drivers.find(d => d.id === teleportId);
        if (targetDriver) {
          localStorage.removeItem('teleportDriverId');
          localStorage.removeItem('teleportDriverMode');
          setViewMode('directory');
          if (teleportMode === 'audit') {
            openSplitScreenModal(targetDriver, false);
          } else {
            openTribunalModal(targetDriver);
          }
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
        orPicUrl: d.orPic || d.orcrPic || '', 
        crPicUrl: d.crPic || d.orcrPic || '', 
        orcrPicUrl: d.orcrPic || '', 
        franchisePicUrl: d.franchisePic || '',
        renewalStatus: d.renewalStatus || 'None',
        pendingRenewal: d.pendingRenewal || null,
        lastRenewedByName: d.lastRenewedByName || (d.lastRenewedBy ? `${d.lastRenewedBy.firstName} ${d.lastRenewedBy.lastName}` : ''),
        lastRenewedByRole: d.lastRenewedByRole || (d.lastRenewedBy?.role || ''),
        lastRenewedAt: d.lastRenewedAt || null,
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
    setRotation(0);
    setRenewalReturnState({ isOpen: false, reason: '' });
    setEditFiles({ profilePic: null, licensePic: null, orPic: null, crPic: null, franchisePic: null });
    setInspectingRenewalPreview(driver.renewalStatus === 'Pending');
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

  // === DIRECT FILE DOWNLOAD HELPER (DOWNLOADS TO COMPUTER WITHOUT OPENING NEW TAB) ===
  const handleDownloadDocument = async (url, label) => {
    if (!url) return;
    setDownloadingDoc(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg';
      const safeName = `${auditModal.driver?.bodyNo || 'Driver'}_${label.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      link.setAttribute('download', safeName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    } finally {
      setDownloadingDoc(false);
    }
  };

  // === FORMATTERS & VALIDATION FOR INLINE EDIT (INCLUDING YEAR 2026-2036 GUARD) ===
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

  const isReasonableExpiryDate = (dateStr) => {
    if (!dateStr) return false;
    const year = parseInt(String(dateStr).split('-')[0], 10);
    return year >= 2024 && year <= 2036;
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
    if (!isReasonableExpiryDate(editForm.licenseExpiry) || !isReasonableExpiryDate(editForm.orCrExpiry) || !isReasonableExpiryDate(editForm.franchisePermitExpiry)) {
      return setModalState({
        isOpen: true,
        title: "Invalid Expiration Year",
        message: "Document expiration dates must have a realistic year between 2026 and 2036 (e.g. LTO 5-year or 10-year validity).",
        type: "warning",
        isConfirm: false
      });
    }

    // === INSTANT CLIENT-SIDE DUPLICATE CREDENTIAL GUARD ===
    const currentId = auditModal.driver?.id;
    const otherDrivers = drivers.filter(d => d.id !== currentId);

    const dupPhone = otherDrivers.find(d => d.phone === editForm.phone.trim());
    if (dupPhone) {
      return setModalState({ isOpen: true, title: "Duplicate Mobile Number", message: `Mobile number ${editForm.phone.trim()} is already registered to ${dupPhone.name} (Body #${dupPhone.bodyNo || 'N/A'}).`, type: "warning", isConfirm: false });
    }

    const dupEmail = otherDrivers.find(d => d.email && d.email.toLowerCase() === editForm.email.trim().toLowerCase());
    if (dupEmail) {
      return setModalState({ isOpen: true, title: "Duplicate Email Address", message: `Email ${editForm.email.trim()} is already registered to ${dupEmail.name}.`, type: "warning", isConfirm: false });
    }

    const dupBody = otherDrivers.find(d => d.bodyNo && d.bodyNo.toUpperCase() === editForm.bodyNo.trim().toUpperCase());
    if (dupBody) {
      return setModalState({ isOpen: true, title: "Duplicate Body Number", message: `Franchise Body No. "${editForm.bodyNo.trim()}" is already assigned to ${dupBody.name}.`, type: "warning", isConfirm: false });
    }

    const dupPlate = otherDrivers.find(d => d.plate && d.plate.toUpperCase() === editForm.plateNo.trim().toUpperCase());
    if (dupPlate) {
      return setModalState({ isOpen: true, title: "Duplicate Plate Number", message: `Plate / MV No. "${editForm.plateNo.trim()}" is already registered to ${dupPlate.name} (Body #${dupPlate.bodyNo || 'N/A'}).`, type: "warning", isConfirm: false });
    }

    const dupLic = otherDrivers.find(d => d.licenseNo && d.licenseNo.toUpperCase() === editForm.licenseNo.trim().toUpperCase());
    if (dupLic) {
      return setModalState({ isOpen: true, title: "Duplicate License Number", message: `LTO License No. "${editForm.licenseNo.trim()}" is already registered to ${dupLic.name}.`, type: "warning", isConfirm: false });
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

      if (editFiles.profilePic) formData.append('profilePic', editFiles.profilePic);
      if (editFiles.licensePic) formData.append('licensePic', editFiles.licensePic);
      if (editFiles.orPic) formData.append('orPic', editFiles.orPic);
      if (editFiles.crPic) formData.append('crPic', editFiles.crPic);
      if (editFiles.franchisePic) formData.append('franchisePic', editFiles.franchisePic);

      const currentAdminId = adminUser._id || adminUser.id;
      if (currentAdminId) formData.append('adminId', currentAdminId);

      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const updatedD = res.data?.driver || {};
      await fetchDrivers();
      setEditFiles({ profilePic: null, licensePic: null, orPic: null, crPic: null, franchisePic: null });
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
          profilePicUrl: updatedD.profilePic || prev.driver.profilePicUrl,
          licensePicUrl: updatedD.licensePic || prev.driver.licensePicUrl,
          orPicUrl: updatedD.orPic || prev.driver.orPicUrl,
          crPicUrl: updatedD.crPic || prev.driver.crPicUrl,
          franchisePicUrl: updatedD.franchisePic || prev.driver.franchisePicUrl,
          lastRenewedByName: updatedD.lastRenewedByName || prev.driver.lastRenewedByName,
          lastRenewedByRole: updatedD.lastRenewedByRole || prev.driver.lastRenewedByRole,
          lastRenewedAt: updatedD.lastRenewedAt || prev.driver.lastRenewedAt,
          status: editForm.driverStatus
        }
      }));
      setModalState({ isOpen: true, title: "Profile & Credentials Updated", message: "Driver records and document photos have been updated and synced.", type: "success", isConfirm: false });
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

  const executeApproveDriver = async () => {
    closeModal();
    if (!auditModal.driver) return;
    setAuditModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/approve`, {
        adminId: adminUser._id || adminUser.id
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' });
      setTimeout(() => {
        setModalState({ isOpen: true, title: "Driver Approved", message: "Application approved! Temporary login credentials have been emailed to the driver.", type: "success", isConfirm: false });
      }, 250);
      fetchDrivers();
    } catch (err) {
      setAuditModal(prev => ({ ...prev, isSubmitting: false }));
      setTimeout(() => {
        setModalState({ isOpen: true, title: "Approval Blocked", message: err.response?.data?.error || "Could not approve application.", type: "warning", isConfirm: false });
      }, 250);
    }
  };

  const executeRejectDriver = async () => {
    closeModal();
    if (!auditModal.driver || !auditModal.rejectReason.trim()) return;
    setAuditModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/reject`, {
        adminId: adminUser._id || adminUser.id,
        reason: auditModal.rejectReason.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      setAuditModal({ isOpen: false, driver: null, isEditing: false, isRejecting: false, rejectReason: '', isSubmitting: false, activeImageTab: 'license' });
      setTimeout(() => {
        setModalState({ isOpen: true, title: "Application Returned", message: "The applicant has been notified via email and in-app vault to fix their submission.", type: "success", isConfirm: false });
      }, 250);
      fetchDrivers();
    } catch (err) {
      setAuditModal(prev => ({ ...prev, isSubmitting: false }));
      setTimeout(() => {
        setModalState({ isOpen: true, title: "Action Failed", message: "Could not reject application.", type: "warning", isConfirm: false });
      }, 250);
    }
  };

  const handleConfirmAction = () => { 
    if (targetAction.type === 'RESET_PASSWORD') executeResetPassword(); 
    if (targetAction.type === 'APPROVE_DRIVER') executeApproveDriver();
    if (targetAction.type === 'REJECT_DRIVER') executeRejectDriver();
  };

  // === NEXT-DAY EXPIRATION HELPER FOR INDIVIDUAL DOCUMENT CARDS ===
  const getSingleDocStatus = (dateString) => {
    if (!dateString) return { state: 'Missing', badge: 'MISSING', isAlert: true };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const d = new Date(dateString);
    const endOfExpDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
    if (now > endOfExpDay) return { state: 'Expired', badge: 'EXPIRED', isAlert: true };
    const expDayStart = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    const daysLeft = Math.round((expDayStart - startOfToday) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) return { state: 'Expiring Soon', badge: `${daysLeft}d LEFT`, isAlert: false, isWarn: true };
    return { state: 'Valid', badge: 'VALID', isAlert: false };
  };

  // === STATUS-AWARE COMPLIANCE ENGINE (NEXT-DAY EXPIRATION CUTOFF) ===
  const checkCompliance = (driver) => {
    if (driver.status === 'Pending') {
      return { label: 'AWAITING KYC AUDIT', color: 'bg-amber-100 text-amber-800 border border-amber-300' };
    }
    if (driver.status === 'Rejected') {
      return { label: 'RETURNED FOR REVISION', color: 'bg-red-100 text-red-700 border border-red-200' };
    }
    if (driver.renewalStatus === 'Pending') {
      return { label: 'PENDING RENEWAL AUDIT', color: 'bg-amber-400 text-emerald-950 animate-pulse' };
    }

    const statuses = [
      getSingleDocStatus(driver.licenseExpiry).state,
      getSingleDocStatus(driver.orCrExpiry).state,
      getSingleDocStatus(driver.franchisePermitExpiry).state
    ];
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
      if (filterStatus === 'Pending') matchesFilter = d.status === 'Pending' || d.renewalStatus === 'Pending';
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

  const getCurrentDocUrl = () => {
    if (!auditModal.driver) return '';
    const pr = inspectingRenewalPreview && auditModal.driver.pendingRenewal ? auditModal.driver.pendingRenewal : null;
    if (auditModal.activeImageTab === 'license') return (pr && pr.licensePic) || auditModal.driver.licensePicUrl;
    if (auditModal.activeImageTab === 'or') return (pr && pr.orPic) || auditModal.driver.orPicUrl;
    if (auditModal.activeImageTab === 'cr') return (pr && pr.crPic) || auditModal.driver.crPicUrl;
    if (auditModal.activeImageTab === 'franchise') return (pr && pr.franchisePic) || auditModal.driver.franchisePicUrl;
    if (auditModal.activeImageTab === 'selfie') return auditModal.driver.profilePicUrl;
    return '';
  };

  const handleTabSwitch = (tab) => {
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
                <option value="Pending">🟡 Pending KYC / Renewal Audit</option>
                <option value="Active">🟢 Verified Fleet</option>
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
                  <th className="p-4">Accreditation</th>
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
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center space-x-1.5 ${
                          driver.status === 'Active' || driver.status === 'Offline'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : driver.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : driver.status === 'Rejected'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-slate-900 text-white border-slate-800'
                        }`}>
                          {(driver.status === 'Active' || driver.status === 'Offline') ? (
                            <>
                              <span className={`w-2 h-2 rounded-full ${driver.status === 'Active' ? 'bg-emerald-500 animate-ping' : 'bg-emerald-600'}`}></span>
                              <span>VERIFIED</span>
                            </>
                          ) : (
                            <span>{driver.status}</span>
                          )}
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
                              onClick={() => openTribunalModal(driver)} 
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

      {/* === UNIFIED SPLIT-SCREEN KYC AUDITOR, FULL-SCREEN LIGHTBOX & INLINE PROFILE EDITOR === */}
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
              
              {/* LEFT COLUMN: DRIVER DATA / INLINE EDITOR */}
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

                {/* PENDING RENEWAL AUDIT BANNER (WITH INLINE RETURN REASON MODAL INSTEAD OF WINDOW.PROMPT) */}
                {auditModal.driver.renewalStatus === 'Pending' && auditModal.driver.pendingRenewal && (
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center">
                          <IoDocumentText className="mr-1 text-sm" /> Driver Submitted Credential Renewal
                        </p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          Inspect the newly uploaded photo(s) on the right before approving.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingRenewalPreview(prev => !prev)}
                        className="px-2.5 py-1 bg-amber-400 text-emerald-950 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0"
                      >
                        {inspectingRenewalPreview ? 'Showing New Photos' : 'Show Old Photos'}
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-200 text-[11px] font-bold text-slate-700 space-y-1">
                      {auditModal.driver.pendingRenewal.licenseExpiry && (
                        <p>🪪 New License Exp: <b className="text-emerald-700">{String(auditModal.driver.pendingRenewal.licenseExpiry).split('T')[0]}</b></p>
                      )}
                      {auditModal.driver.pendingRenewal.orCrExpiry && (
                        <p>📄 New OR/CR Exp: <b className="text-emerald-700">{String(auditModal.driver.pendingRenewal.orCrExpiry).split('T')[0]}</b></p>
                      )}
                      {auditModal.driver.pendingRenewal.franchisePermitExpiry && (
                        <p>🛺 New Permit Exp: <b className="text-emerald-700">{String(auditModal.driver.pendingRenewal.franchisePermitExpiry).split('T')[0]}</b></p>
                      )}
                    </div>

                    {!renewalReturnState.isOpen ? (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          disabled={auditModal.isSubmitting}
                          onClick={async () => {
                            setAuditModal(prev => ({ ...prev, isSubmitting: true }));
                            try {
                              const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                              await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/approve-renewal`, {
                                adminId: adminUser._id || adminUser.id
                              }, { headers: { Authorization: `Bearer ${token}` } });
                              await fetchDrivers();
                              setAuditModal(prev => ({ ...prev, isOpen: false, driver: null, isSubmitting: false }));
                              setModalState({ isOpen: true, title: "Renewal Approved", message: "Updated expiration dates and document photos are now live. Driver's Booking Radar is unlocked.", type: "success" });
                            } catch (e) {
                              setAuditModal(prev => ({ ...prev, isSubmitting: false }));
                              setModalState({ isOpen: true, title: "Approval Failed", message: "Could not approve renewal.", type: "warning" });
                            }
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-500 shadow"
                        >
                          ✔ Approve Renewal
                        </button>
                        <button
                          type="button"
                          disabled={auditModal.isSubmitting}
                          onClick={() => setRenewalReturnState({ isOpen: true, reason: '' })}
                          className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-100"
                        >
                          Return
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-amber-200 animate-fade-in">
                        <label className="block text-[10px] font-black text-red-700 uppercase tracking-wider">
                          State Reason for Returning Renewal *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Blurry License Photo or Mismatched Expiry Date"
                          value={renewalReturnState.reason}
                          onChange={e => setRenewalReturnState(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full p-2.5 bg-white border border-red-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-600"
                        />
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setRenewalReturnState({ isOpen: false, reason: '' })}
                            className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!renewalReturnState.reason.trim() || auditModal.isSubmitting}
                            onClick={async () => {
                              setAuditModal(prev => ({ ...prev, isSubmitting: true }));
                              try {
                                const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                                await axios.put(`https://tricycheck-api.onrender.com/api/admin/drivers/${auditModal.driver.id}/reject-renewal`, {
                                  adminId: adminUser._id || adminUser.id,
                                  reason: renewalReturnState.reason.trim()
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                await fetchDrivers();
                                setRenewalReturnState({ isOpen: false, reason: '' });
                                setAuditModal(prev => ({ ...prev, isOpen: false, driver: null, isSubmitting: false }));
                                setModalState({ isOpen: true, title: "Renewal Returned", message: "The driver has been notified in their POSO Inbox to re-upload a clear renewal photo.", type: "info" });
                              } catch (e) {
                                setAuditModal(prev => ({ ...prev, isSubmitting: false }));
                              }
                            }}
                            className="flex-[1.5] py-2 bg-red-600 text-white rounded-xl font-black text-xs uppercase disabled:opacity-50"
                          >
                            Confirm Return
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* LAST RENEWED BY OFFICER AUDIT STAMP */}
                {auditModal.driver.lastRenewedByName && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-800">Last Verified / Renewed By:</span>
                    <span className="font-black text-emerald-950 uppercase">
                      {auditModal.driver.lastRenewedByName} ({auditModal.driver.lastRenewedByRole || 'POSO'})
                    </span>
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
                  /* === CLEAN READ-ONLY AUDIT VIEW WITH RED GLOWING EXPIRED CARDS === */
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

                    {/* Clickable Credential Cards that Glow Red if Expired/Missing */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Government KYC Credentials (Click to Verify)</h4>
                      
                      {(() => {
                        const licSt = getSingleDocStatus(auditModal.driver.licenseExpiry);
                        const orSt = getSingleDocStatus(auditModal.driver.orCrExpiry);
                        const permSt = getSingleDocStatus(auditModal.driver.franchisePermitExpiry);

                        return (
                          <>
                            <div 
                              onClick={() => handleTabSwitch('license')}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                licSt.isAlert
                                  ? 'bg-red-50 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.35)]'
                                  : auditModal.activeImageTab === 'license'
                                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${licSt.isAlert ? 'text-red-700' : 'text-emerald-700'}`}>
                                  1. LTO Driver's License
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  licSt.isAlert ? 'bg-red-600 text-white animate-pulse' : licSt.isWarn ? 'bg-amber-400 text-emerald-950' : 'text-slate-500'
                                }`}>
                                  Exp: {auditModal.driver.licenseExpiry || 'MISSING'} ({licSt.badge})
                                </span>
                              </div>
                              <p className="font-mono font-black text-base text-slate-900">{auditModal.driver.licenseNo || 'NOT RECORDED'}</p>
                            </div>

                            <div 
                              onClick={() => handleTabSwitch('or')}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                orSt.isAlert
                                  ? 'bg-red-50 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.35)]'
                                  : (auditModal.activeImageTab === 'or' || auditModal.activeImageTab === 'cr')
                                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${orSt.isAlert ? 'text-red-700' : 'text-emerald-700'}`}>
                                  2. LTO Official Receipt (OR) & CR
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  orSt.isAlert ? 'bg-red-600 text-white animate-pulse' : orSt.isWarn ? 'bg-amber-400 text-emerald-950' : 'text-slate-500'
                                }`}>
                                  Exp: {auditModal.driver.orCrExpiry || 'MISSING'} ({orSt.badge})
                                </span>
                              </div>
                              <p className="font-mono font-black text-base text-slate-900 mb-2">{auditModal.driver.plate || 'N/A'}</p>
                              <div className="flex space-x-2">
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleTabSwitch('or'); }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${auditModal.activeImageTab === 'or' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                  View OR
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleTabSwitch('cr'); }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${auditModal.activeImageTab === 'cr' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                  View CR
                                </button>
                              </div>
                            </div>

                            <div 
                              onClick={() => handleTabSwitch('franchise')}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                permSt.isAlert
                                  ? 'bg-red-50 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.35)]'
                                  : auditModal.activeImageTab === 'franchise'
                                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${permSt.isAlert ? 'text-red-700' : 'text-emerald-700'}`}>
                                  3. Calasiao MTOP Franchise
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  permSt.isAlert ? 'bg-red-600 text-white animate-pulse' : permSt.isWarn ? 'bg-amber-400 text-emerald-950' : 'text-slate-500'
                                }`}>
                                  Exp: {auditModal.driver.franchisePermitExpiry || 'MISSING'} ({permSt.badge})
                                </span>
                              </div>
                              <p className="font-mono font-black text-base text-slate-900">BODY NO. {auditModal.driver.bodyNo || 'N/A'}</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* === CLEAN INLINE EDIT FORM (WITH STRICT YEAR 2026-2036 BOUNDS) === */
                  <form onSubmit={handleSaveInlineEdit} className="space-y-4 animate-fade-in">
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-900">
                      Editing Driver Profile — Fix any typo or upload renewed document photos below.
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
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Government Credentials (Valid Years: 2026–2036)</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">License No. *</label>
                          <input required type="text" value={editForm.licenseNo} onChange={e => handleEditFieldChange('licenseNo', e.target.value)} onFocus={() => handleTabSwitch('license')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">License Expiry *</label>
                          <input required type="date" min="2026-01-01" max="2036-12-31" value={editForm.licenseExpiry} onChange={e => handleEditFieldChange('licenseExpiry', e.target.value)} onFocus={() => handleTabSwitch('license')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plate / MV No. *</label>
                          <input required type="text" value={editForm.plateNo} onChange={e => handleEditFieldChange('plateNo', e.target.value)} onFocus={() => handleTabSwitch('or')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">OR/CR Expiry *</label>
                          <input required type="date" min="2026-01-01" max="2036-12-31" value={editForm.orCrExpiry} onChange={e => handleEditFieldChange('orCrExpiry', e.target.value)} onFocus={() => handleTabSwitch('or')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Body No. *</label>
                          <input required type="text" value={editForm.bodyNo} onChange={e => handleEditFieldChange('bodyNo', e.target.value)} onFocus={() => handleTabSwitch('franchise')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm focus:border-emerald-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Permit Expiry *</label>
                          <input required type="date" min="2026-01-01" max="2036-12-31" value={editForm.franchisePermitExpiry} onChange={e => handleEditFieldChange('franchisePermitExpiry', e.target.value)} onFocus={() => handleTabSwitch('franchise')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-600 outline-none" />
                        </div>
                      </div>
                    </div>

                    {/* ADMIN DIRECT DOCUMENT PHOTO RE-UPLOAD SECTION */}
                    <div className="pt-3 border-t border-slate-200 space-y-2.5">
                      <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        📷 Re-Upload / Replace Document Photos (Optional)
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {[
                          { key: 'licensePic', label: "1. Driver's License", tab: 'license' },
                          { key: 'orPic', label: "2A. LTO Official Receipt", tab: 'or' },
                          { key: 'crPic', label: "2B. LTO Cert. of Reg.", tab: 'cr' },
                          { key: 'franchisePic', label: "3. MTOP Permit", tab: 'franchise' },
                          { key: 'profilePic', label: "4. 2x2 Driver Selfie", tab: 'selfie' }
                        ].map(item => (
                          <label
                            key={item.key}
                            onClick={() => handleTabSwitch(item.tab)}
                            className={`p-2.5 rounded-xl border font-bold cursor-pointer flex items-center justify-between transition-all ${
                              editFiles[item.key]
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate">{editFiles[item.key] ? `✔ ${item.label}` : `Upload ${item.label}`}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setEditFiles(prev => ({ ...prev, [item.key]: file }));
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={auditModal.isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <IoSave className="text-lg" />
                      <span>{auditModal.isSubmitting ? 'Uploading & Saving...' : 'Save Profile & Renewals'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* RIGHT COLUMN: DOCUMENT VIEWER (CLICK IMAGE FOR FULL-SCREEN POPUP + DIRECT DOWNLOAD) */}
              <div className="w-full md:w-[62%] bg-slate-900 flex flex-col min-h-0">
                
                {/* Document Selector Tabs */}
                <div className="flex bg-slate-800 p-2 shrink-0 space-x-1.5 border-b border-slate-700">
                  {[
                    { id: 'license', label: "1. License" },
                    { id: 'or', label: "2A. LTO OR" },
                    { id: 'cr', label: "2B. LTO CR" },
                    { id: 'franchise', label: "3. Permit" },
                    { id: 'selfie', label: "4. Selfie" }
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

                {/* Action Control Bar: Full-Screen View, Rotate & Direct Download */}
                <div className="bg-slate-950/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
                  <span className="text-[11px] font-bold text-emerald-400">
                    💡 Click the document image below to pop it open in Full-Screen View
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)} 
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-colors"
                      title="Rotate 90°"
                    >
                      <IoRefresh /> <span>Rotate</span>
                    </button>
                    {getCurrentDocUrl() && (
                      <>
                        <button
                          type="button"
                          onClick={() => setFullScreenDoc({ isOpen: true, url: getCurrentDocUrl(), title: `${auditModal.driver.name} • ${auditModal.activeImageTab.toUpperCase()}` })}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-amber-400 flex items-center space-x-1.5 transition-colors"
                        >
                          <IoExpand /> <span>Full Screen</span>
                        </button>
                        <button 
                          type="button"
                          disabled={downloadingDoc}
                          onClick={() => handleDownloadDocument(getCurrentDocUrl(), auditModal.activeImageTab)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-black text-white flex items-center space-x-1.5 transition-colors shadow-sm"
                          title="Download Document Image to Computer"
                        >
                          <IoDownload /> <span>{downloadingDoc ? '...' : 'Download'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* High-Resolution Image Canvas (Click to Open Full Screen Lightbox) */}
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
                          onClick={() => setFullScreenDoc({ isOpen: true, url: docUrl, title: `${auditModal.driver.name} (Body #${auditModal.driver.bodyNo || 'N/A'}) • ${auditModal.activeImageTab.toUpperCase()}` })}
                          style={{ 
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease-out'
                          }}
                          className="max-w-full max-h-[62vh] object-contain rounded-xl shadow-2xl border-2 border-slate-700 hover:border-amber-400 cursor-pointer transition-colors" 
                          title="Click to open Full-Screen View"
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
                    onClick={() => {
                      if (!auditModal.rejectReason.trim()) return;
                      setTargetAction({ type: 'REJECT_DRIVER', payload: auditModal.driver });
                      setModalState({
                        isOpen: true,
                        title: "Confirm Application Return?",
                        message: `Are you sure you want to return ${auditModal.driver.name}'s application (Body #${auditModal.driver.bodyNo || 'N/A'}) with reason:\n\n"${auditModal.rejectReason.trim()}"?`,
                        type: "warning",
                        isConfirm: true
                      });
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
                    {auditModal.driver.status === 'Pending' && 'Verify all documents before dispatching official POSO credentials.'}
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
                          onClick={() => {
                            setTargetAction({ type: 'APPROVE_DRIVER', payload: auditModal.driver });
                            setModalState({
                              isOpen: true,
                              title: "Confirm POSO Accreditation?",
                              message: `Are you sure you want to approve ${auditModal.driver.name} (Body #${auditModal.driver.bodyNo || 'N/A'}, Plate: ${auditModal.driver.plate || 'N/A'}) and email their official login credentials to ${auditModal.driver.email || 'their email'}?`,
                              type: "success",
                              isConfirm: true
                            });
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

      {/* === FULL-SCREEN DOCUMENT POPUP LIGHTBOX (NO NEW TAB NEEDED) === */}
      {fullScreenDoc.isOpen && createPortal(
        <div className="fixed inset-0 z-[2200] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-6 animate-fade-in" onClick={() => setFullScreenDoc({ isOpen: false, url: '', title: '' })}>
          <div className="flex justify-between items-center text-white max-w-6xl w-full mx-auto" onClick={e => e.stopPropagation()}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">POSO High-Resolution Document Viewer</span>
              <h3 className="text-lg font-black">{fullScreenDoc.title}</h3>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleDownloadDocument(fullScreenDoc.url, fullScreenDoc.title)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg"
              >
                <IoDownload className="text-base" />
                <span>Download Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setFullScreenDoc({ isOpen: false, url: '', title: '' })}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto my-4" onClick={e => e.stopPropagation()}>
            <img
              src={fullScreenDoc.url}
              alt="Full Screen Document"
              className="max-w-[95vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/15"
            />
          </div>

          <div className="text-center text-xs font-bold text-slate-400">
            Click anywhere outside the image or press the X button to close full-screen view.
          </div>
        </div>,
        document.body
      )}

      {/* === DISCIPLINARY / SUSPENSION MODAL WITH AUTOMATED TICKET SELECTOR DROPDOWN === */}
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
                <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-4">
                  <div>
                    <h4 className="font-black text-red-900 text-lg mb-1 flex items-center"><IoWarning className="mr-2"/> Deploy Penalty</h4>
                    <p className="text-xs font-medium text-red-700 leading-relaxed">Suspending a driver will immediately lock their Booking Radar and notify them via Gmail and In-App Inbox.</p>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1.5">1. Penalty Duration</label>
                    <select 
                      className="w-full p-3.5 bg-white border border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 shadow-sm cursor-pointer"
                      value={penaltyForm.duration}
                      onChange={(e) => setPenaltyForm({...penaltyForm, duration: e.target.value})}
                    >
                      <option value="24h">24 Hours (Minor Violation)</option>
                      <option value="3d">3 Days (Moderate Violation)</option>
                      <option value="7d">7 Days (Severe Violation)</option>
                      <option value="permanent">Permanent Ban (Critical Violation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1.5">
                      2. Select Linked Support Ticket or Direct POSO Field Citation
                    </label>
                    <select
                      className="w-full p-3.5 bg-white border border-red-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500 shadow-sm cursor-pointer"
                      value={penaltyForm.selectedTicketId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'FIELD_CITATION') {
                          setPenaltyForm(prev => ({ ...prev, selectedTicketId: val, reason: '' }));
                        } else {
                          const found = driverTickets.find(t => t._id === val);
                          if (found) {
                            const shortId = found._id.substring(found._id.length - 6).toUpperCase();
                            const autoReason = `${found.type} — Case #${shortId} (${found.description ? found.description.slice(0, 45) : 'Verified by POSO'})`;
                            setPenaltyForm(prev => ({ ...prev, selectedTicketId: val, reason: autoReason }));
                          }
                        }
                      }}
                    >
                      <option value="FIELD_CITATION">🚓 Direct POSO Field / Street Citation (No Ticket Required)</option>
                      {loadingDriverTickets ? (
                        <option disabled>Loading driver's tickets...</option>
                      ) : driverTickets.length === 0 ? (
                        <option disabled>No passenger tickets filed against this driver</option>
                      ) : (
                        driverTickets.map(t => {
                          const shortId = t._id.substring(t._id.length - 6).toUpperCase();
                          return (
                            <option key={t._id} value={t._id}>
                              🎫 Case #{shortId} • {t.type} [{t.status}] — {new Date(t.createdAt).toLocaleDateString()}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1.5">
                      3. Violation Details / Official Reason *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Overcharging Fare or Caught Operating Outside Route" 
                      className="w-full p-3.5 bg-white border border-red-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 shadow-sm"
                      value={penaltyForm.reason}
                      onChange={(e) => setPenaltyForm({...penaltyForm, reason: e.target.value})}
                    />
                  </div>

                  <button 
                    className="w-full py-4 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                    disabled={!penaltyForm.reason.trim() || penaltyForm.isSubmitting}
                    onClick={async () => {
                      setPenaltyForm({...penaltyForm, isSubmitting: true});
                      try {
                        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
                        await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${quickViewModal.driver.id}/suspend`, {
                          duration: penaltyForm.duration,
                          reason: penaltyForm.reason.trim(),
                          adminId: adminUser._id || adminUser.id
                        }, { headers: { Authorization: `Bearer ${token}` }});
                        
                        setQuickViewModal({ isOpen: false, driver: null });
                        setModalState({ isOpen: true, title: "Penalty Deployed", message: "The driver has been locked out of the application.", type: "success" });
                        fetchDrivers(); 
                      } catch (error) {
                        setModalState({ isOpen: true, title: "Execution Failed", message: "Could not deploy penalty.", type: "warning" });
                      } finally {
                        setPenaltyForm({ duration: '24h', selectedTicketId: 'FIELD_CITATION', isSubmitting: false, reason: '' });
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