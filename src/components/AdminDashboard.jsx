import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  IoGrid, IoIdCard, IoMap, IoWarning, IoSettings, IoLogOut, 
  IoDocumentText, IoBicycle, IoPeople, IoTime, IoPrint, IoClose,
  IoInformationCircle, IoShieldCheckmark, IoCheckmarkCircle, IoCash
} from 'react-icons/io5';

import PassengerManagement from './PassengerManagement';
import FleetManagement from './FleetManagement';
import LiveOperationsMap from './LiveOperationsMap';
import SupportTickets from './SupportTickets';
import StaffManagement from './StaffManagement';
import SystemSettings from './SystemSettings';
import ComplianceHub from './ComplianceHub';
import ReportsHub from './ReportsHub';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const token = localStorage.getItem('adminToken');
      const parsed = JSON.parse(localStorage.getItem('adminUser'));
      if (!token || !parsed || !['superadmin', 'secretary', 'dispatcher'].includes(parsed.role)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  
  const [stats, setStats] = useState({ 
    activeDrivers: 0, 
    pendingDrivers: 0, 
    activeRides: 0, 
    todayRevenue: 0,
    todaysBookings: [],
    expiringDrivers: [],
    activeTickets: []
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // === LIVE PHILIPPINE STANDARD TIME CLOCK ===
  const [currentTime, setCurrentTime] = useState(new Date());

  // === LOGOUT CONFIRMATION MODAL STATE ===
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // === MY PROFILE EDITOR STATES ===
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', email: '' });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: '', success: '' });

  // Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync modal data when opened
  useEffect(() => {
    if (adminUser && showProfileModal) {
      setProfileData({
        firstName: adminUser.firstName || '',
        lastName: adminUser.lastName || '',
        email: adminUser.email || ''
      });
      setProfileStatus({ loading: false, error: '', success: '' });
    }
  }, [adminUser, showProfileModal]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileStatus({ loading: true, error: '', success: '' });
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put('https://tricycheck-api.onrender.com/api/admin/profile', {
        ...profileData,
        adminId: adminUser._id || adminUser.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = { ...adminUser, ...response.data.user };
      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      setAdminUser(updatedUser);
      
      setProfileStatus({ loading: false, error: '', success: 'Profile updated successfully!' });
      setTimeout(() => setShowProfileModal(false), 1500);
    } catch (err) {
      setProfileStatus({ loading: false, error: err.response?.data?.error || 'Failed to update profile.', success: '' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userString = localStorage.getItem('adminUser');

    if (!token || !userString) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(userString);
      if (!parsed || !['superadmin', 'secretary', 'dispatcher'].includes(parsed.role)) {
        throw new Error('Invalid clearance role');
      }
      setAdminUser(parsed);
    } catch {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/', { replace: true });
      return;
    }

    // === AUTO-TELEPORTER LISTENER ===
    const handleForcedTab = (e) => {
      const target = e.detail === 'tickets' ? 'reports' : e.detail;
      setActiveTab(target);
    }; 
    window.addEventListener('forceDashboardTabChange', handleForcedTab);
    return () => window.removeEventListener('forceDashboardTabChange', handleForcedTab);
  }, [navigate]);

  useEffect(() => {
    if (!adminUser) return;
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      try {
        const [statsRes, compRes] = await Promise.all([
          axios.get('https://tricycheck-api.onrender.com/api/admin/stats', config),
          axios.get('https://tricycheck-api.onrender.com/api/admin/compliance', config).catch(() => ({ data: [] }))
        ]);

        const rawStats = statsRes.data || {};
        const compList = (compRes.data || []).filter(d => d.driverStatus !== 'Pending' && d.driverStatus !== 'Rejected');
        const pendingRenewalCount = compList.filter(d => d.renewalStatus === 'Pending').length;

        setStats({
          ...rawStats,
          pendingDrivers: (rawStats.pendingDrivers || 0) + pendingRenewalCount,
          expiringDrivers: compList.length > 0 ? compList : (rawStats.expiringDrivers || [])
        });
      } catch (error) {} finally { setLoadingStats(false); }

      if (activeTab === 'dashboard') {
        try {
          const currentRole = adminUser.role || 'superadmin'; 
          const logsRes = await axios.get(`https://tricycheck-api.onrender.com/api/admin/activity-feed?role=${currentRole}`, config);
          setAuditLogs(logsRes.data);
        } catch (error) {} finally { setLoadingLogs(false); }
      }
    };
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, [activeTab, adminUser]);

  // === CONFIRMED LOGOUT EXECUTION ===
  const executeLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/');
  };

  const allMenuItems = [
    { id: 'dashboard', label: 'Overview', icon: <IoGrid />, roles: ['superadmin', 'secretary', 'dispatcher'] },
    { id: 'fleet', label: 'Fleet Management', icon: <IoIdCard />, roles: ['superadmin', 'secretary'] },
    { id: 'map', label: 'Live Operations', icon: <IoMap />, roles: ['superadmin', 'dispatcher'] },
    { id: 'reports', label: 'Support Tickets', icon: <IoWarning />, roles: ['superadmin', 'dispatcher'] },
    { id: 'passengers', label: 'Passenger Oversight', icon: <IoPeople />, roles: ['superadmin', 'secretary'] },
    { id: 'compliance', label: 'Compliance Hub', icon: <IoDocumentText />, roles: ['superadmin', 'secretary'] },
    { id: 'analytics', label: 'Reports & Analytics', icon: <IoPrint />, roles: ['superadmin', 'secretary'] },
    { id: 'staff', label: 'Staff Management', icon: <IoPeople />, roles: ['superadmin'] },
    { id: 'settings', label: 'System Settings', icon: <IoSettings />, roles: ['superadmin'] }
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(adminUser?.role));

  if (!adminUser) return null; 

  // Accurate total of all actionable priority items
  const totalPriorityFlags = 
    (stats.activeTickets?.length || 0) + 
    (stats.expiringDrivers?.length || 0) + 
    (stats.pendingDrivers > 0 ? 1 : 0);

  return (
    <div className="flex h-[100dvh] bg-emerald-950 overflow-hidden font-sans selection:bg-amber-400/30 selection:text-amber-200">
      
      {/* 1. THE ANCHOR: Dark Government Sidebar (Optimized for 100% Zoom) */}
      <aside className="w-64 bg-emerald-950 text-white flex flex-col z-20 shrink-0 border-r border-emerald-900 shadow-2xl relative">
        <div className="h-16 flex items-center px-5 border-b border-emerald-900 bg-emerald-950 shrink-0">
          <img src="/poso-logo.jpg" alt="POSO" className="w-10 h-10 mr-3 drop-shadow-md object-contain rounded-full border border-emerald-800" />
          <div>
            <h1 className="text-lg font-black tracking-tight leading-tight text-emerald-50">TricyCheck</h1>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2 ml-2">Main Menu</p>
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-500/20' 
                  : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-amber-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.id === 'fleet' && stats.pendingDrivers > 0 && (
                <span className="bg-amber-500 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {stats.pendingDrivers}
                </span>
              )}
              {item.id === 'reports' && stats.activeTickets?.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {stats.activeTickets.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-emerald-900 bg-emerald-950 shrink-0">
          <div className="flex items-center justify-between bg-emerald-900/50 p-3 rounded-xl border border-emerald-800">
            <div 
              className="flex items-center space-x-2.5 truncate cursor-pointer hover:bg-emerald-800 p-1 -ml-1 rounded-lg transition-colors" 
              onClick={() => setShowProfileModal(true)}
              title="Edit My Profile"
            >
              <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-emerald-950 text-xs font-black shadow-inner shrink-0 border-2 border-emerald-800">
                {adminUser.firstName?.charAt(0)}{adminUser.lastName ? adminUser.lastName.charAt(0) : ''}
              </div>
              <div className="text-left truncate">
                <p className="text-xs font-bold text-emerald-50 leading-tight truncate">{adminUser.firstName} {adminUser.lastName}</p>
                <p className="text-[9px] text-amber-400 font-bold tracking-wider uppercase">● {adminUser.role}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setShowLogoutModal(true)} 
              title="Log Out of Command Center"
              className="p-2 text-emerald-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors shrink-0 ml-1"
            >
              <IoLogOut className="text-lg" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. THE CANVAS: Zero-Scroll 100% Zoom Viewport */}
      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden bg-slate-50 md:rounded-tl-[2rem] md:my-1.5 md:mr-1.5 shadow-[-15px_0_40px_rgba(0,0,0,0.5)] border border-emerald-900/20">
        
        {/* STREAMLINED HEADER (h-16) */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20 md:rounded-tl-[2rem]">
          <div>
            <h2 className="text-xl font-black text-emerald-950 tracking-tight leading-none">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Calasiao Public Order & Safety Office • Command Telemetry
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs">
              <IoTime className="text-emerald-600 text-sm" />
              <span>
                {currentTime.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl border border-emerald-100 font-bold text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Online</span>
            </div>
          </div>
        </header>

        {/* GLOBAL RED EMERGENCY BANNER (VISIBLE ACROSS ALL TABS: FLEET, PASSENGERS, COMPLIANCE, ETC.) */}
        {stats.activeTickets?.some(t => t.priority === 'CRITICAL' || t.priority === 'High') && (
          <div className="px-6 pt-4 shrink-0 z-30">
            <div 
              onClick={() => setActiveTab('reports')}
              className="bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-red-500/30 flex justify-between items-center font-black tracking-widest uppercase text-xs animate-pulse border-2 border-red-400 cursor-pointer hover:bg-red-700 transition-colors"
            >
              <div className="flex items-center">
                <IoWarning className="mr-2.5 text-xl shrink-0" /> 
                <span>ACTIVE EMERGENCY: UNRESOLVED HIGH-PRIORITY DISTRESS TICKET DETECTED!</span>
              </div>
              <span className="bg-white text-red-700 px-3 py-1 rounded-lg text-[10px] font-black shrink-0 ml-4">
                OPEN SWITCHBOARD &rarr;
              </span>
            </div>
          </div>
        )}

        {/* DYNAMIC MODULE INJECTION */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-10 flex flex-col min-h-0">
          
          {/* === EXECUTIVE DASHBOARD OVERVIEW (FITS 100% ZOOM WITH ZERO PAGE SCROLL) === */}
          {activeTab === 'dashboard' && (
            <div className="p-6 animate-fade-in w-full max-w-[1600px] mx-auto flex-1 flex flex-col gap-5 min-h-0 overflow-hidden">

              {/* 4 COMPACT KPI STAT CARDS (1-CLICK TELEPORTERS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div 
                  onClick={() => setActiveTab('reports')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-red-200 hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer group flex items-center justify-between"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                  <div className="pl-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Unresolved Tickets</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.activeTickets?.length || 0}</h3>
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity block mt-1">
                      Open Switchboard &rarr;
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-xl shadow-sm border border-red-100 group-hover:bg-red-500 group-hover:text-white transition-colors shrink-0">
                    <IoWarning />
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab('fleet')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Verified Drivers</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.activeDrivers}</h3>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity block mt-1">
                      Fleet Directory &rarr;
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <IoIdCard />
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab('fleet')}
                  className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer group hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between ${
                    stats.pendingDrivers > 0 ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80'
                  }`}
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pending Approvals</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.pendingDrivers}</h3>
                    {stats.pendingDrivers > 0 ? (
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse block mt-1">
                        Audit Queue Now &rarr;
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity block mt-1">
                        KYC Queue &rarr;
                      </span>
                    )}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl shadow-sm border border-orange-100 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                    <IoDocumentText />
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab('map')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Rides Now</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.activeRides}</h3>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity block mt-1">
                      Live Radar &rarr;
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl shadow-sm border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                    <IoBicycle />
                  </div>
                </div>
              </div>

              {/* 2-COLUMN GRID: DYNAMIC FLEX-FILL (NO HARDCODED 500PX OVERFLOW) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                  
                {/* PRIORITY ALERTS */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-200/80 overflow-hidden relative flex flex-col h-full min-h-0">
                  <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/30 shrink-0">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center">
                        <IoWarning className="text-red-500 mr-2 text-2xl animate-pulse" /> Priority Action Queue
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Immediate municipal compliance & dispatch items.</p>
                    </div>
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider">
                      {totalPriorityFlags} Flagged
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {totalPriorityFlags === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-3xl mb-3 border border-emerald-100">
                          <IoCheckmarkCircle />
                        </div>
                        <p className="text-lg font-black text-slate-700">All Systems Clear</p>
                        <p className="text-xs font-medium text-slate-400 mt-1">Zero unresolved tickets, expiring permits, or pending audits.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                            <th className="p-4 pl-8">Category / Unit</th>
                            <th className="p-4">Subject / Details</th>
                            <th className="p-4 text-right pr-8">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                          {/* 1. PENDING KYC APPLICANTS ROW */}
                          {stats.pendingDrivers > 0 && (
                            <tr className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                              <td className="p-4 pl-8">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-emerald-950">
                                  KYC AUDIT QUEUE
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {stats.pendingDrivers} Driver Application(s) Awaiting Review
                              </td>
                              <td className="p-4 text-right pr-8">
                                <button 
                                  onClick={() => setActiveTab('fleet')} 
                                  className="inline-flex items-center justify-center bg-amber-400 text-emerald-950 px-3.5 py-2 rounded-xl text-xs font-black hover:bg-amber-300 shadow-sm transition-all"
                                >
                                  <IoDocumentText className="mr-1.5" /> Audit
                                </button>
                              </td>
                            </tr>
                          )}

                          {/* 2. ACTIVE SUPPORT / SOS TICKETS */}
                          {stats.activeTickets?.map(t => (
                            <tr key={t._id} className="bg-red-50/40 hover:bg-red-50 transition-colors">
                              <td className="p-4 pl-8">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  t.priority === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'
                                }`}>
                                  {t.priority} TICKET
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800 truncate max-w-[180px]">{t.type}</td>
                              <td className="p-4 text-right pr-8">
                                <button 
                                  onClick={() => setActiveTab('reports')} 
                                  className="inline-flex items-center justify-center bg-white border border-red-200 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-50 shadow-sm transition-all"
                                >
                                  <IoWarning className="mr-1.5" /> Dispatch
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* 3. EXPIRING DRIVER CREDENTIALS & UPLOADED RENEWALS */}
                          {stats.expiringDrivers?.map(d => (
                            <tr key={d._id} className="hover:bg-red-50/50 transition-colors">
                              <td className="p-4 pl-8 font-black text-slate-900">Body #{d.bodyNo || 'N/A'}</td>
                              <td className="p-4 font-bold truncate max-w-[220px]">
                                {d.firstName} {d.lastName}{' '}
                                <span className={d.renewalStatus === 'Pending' ? 'text-amber-600 font-black' : 'text-red-600'}>
                                  {d.renewalStatus === 'Pending' ? '(Renewal Uploaded)' : '(Expiring / Expired Docs)'}
                                </span>
                              </td>
                              <td className="p-4 text-right pr-8">
                                <button 
                                  onClick={() => {
                                    if (d.renewalStatus === 'Pending') {
                                      localStorage.setItem('teleportDriverId', d._id);
                                      localStorage.setItem('teleportDriverMode', 'audit');
                                      window.dispatchEvent(new CustomEvent('fleetTeleport'));
                                      setActiveTab('fleet');
                                    } else {
                                      setActiveTab('compliance');
                                    }
                                  }} 
                                  className="inline-flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-sm"
                                  title="Review Driver Compliance"
                                >
                                  <IoInformationCircle className="mr-1.5 text-base" /> Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* SYSTEM AUDIT TRAIL */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative flex flex-col h-full min-h-0">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center">
                        <IoTime className="text-emerald-600 mr-2 text-2xl" /> System Audit Trail
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Immutable chronological log of POSO administrative actions.</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0">
                    {loadingLogs ? (
                      <div className="flex justify-center items-center h-full text-slate-400 font-bold animate-pulse">Syncing Encrypted Feed...</div>
                    ) : auditLogs.length === 0 ? (
                      <div className="flex justify-center items-center h-full text-slate-400 font-bold">No recent system activity.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {auditLogs.map(log => {
                          const colors = { 
                            fleet: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
                            passengers: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
                            settings: 'bg-slate-800 text-white border-slate-700', 
                            reports: 'bg-orange-100 text-orange-700 border-orange-200', 
                            compliance: 'bg-red-100 text-red-700 border-red-200', 
                            staff: 'bg-purple-100 text-purple-700 border-purple-200' 
                          };
                          const colorClass = colors[log.moduleName || log.module] || 'bg-gray-100 text-gray-600 border-gray-200';
                          return (
                            <div key={log._id} className="p-5 hover:bg-slate-50 transition-colors flex space-x-4">
                              <div className={`mt-1 w-12 h-12 rounded-full flex items-center justify-center font-black text-xs border shadow-inner shrink-0 ${colorClass}`}>
                                {(log.moduleName || log.module || '?').substring(0, 3).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-black text-slate-800 leading-tight pr-2">{log.action}</p>
                                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap pt-0.5">
                                    {new Date(log.timestamp || log.createdAt).toLocaleDateString()} • {new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">{log.details}</p>
                                <div className="flex items-center mt-3">
                                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center">
                                    <IoGrid className="mr-1" /> {log.adminId?.firstName || log.adminName || 'POSO Admin'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ISOLATED TABS FOR MAP AND TICKETS */}
          {activeTab === 'map' && <div className="p-6 animate-fade-in w-full h-[calc(100vh-6rem)] max-w-[1600px] mx-auto"><LiveOperationsMap /></div>}
          {activeTab === 'reports' && <div className="p-6 animate-fade-in w-full h-[calc(100vh-6rem)] max-w-[1600px] mx-auto"><SupportTickets /></div>}
          
          {/* REMAINING TABS */}
          {activeTab === 'passengers' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><PassengerManagement /></div>}
          {activeTab === 'fleet' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><FleetManagement /></div>}
          {activeTab === 'compliance' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><ComplianceHub /></div>}
          {activeTab === 'staff' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><StaffManagement /></div>}
          {activeTab === 'settings' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><SystemSettings /></div>}
          {activeTab === 'analytics' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><ReportsHub /></div>}
        </div>
      </main>

      {/* === ADVISER REQUIREMENT: ACCIDENTAL LOGOUT CONFIRMATION MODAL === */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm z-10 p-8 border border-slate-200 relative animate-slide-up text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100 shadow-inner">
              <IoLogOut className="text-3xl ml-1" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">End POSO Session?</h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to log out of the TricyCheck Command Center? You will need to re-authenticate to access live dispatch controls.
            </p>
            <div className="flex space-x-3">
              <button 
                type="button"
                onClick={() => setShowLogoutModal(false)} 
                className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Stay Logged In
              </button>
              <button 
                type="button"
                onClick={executeLogout} 
                className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MY PROFILE MODAL === */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md z-10 p-8 border border-slate-200 relative animate-slide-up">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><IoClose className="text-xl" /></button>
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
              <IoIdCard className="text-2xl" />
            </div>
            <h3 className="text-2xl font-black text-emerald-950 mb-2">My Profile</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">Manage your official credentials.</p>
            
            {profileStatus.success && <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl text-center">Profile updated successfully.</div>}
            {profileStatus.error && <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">{profileStatus.error}</div>}

            <form onSubmit={handleUpdateProfile}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Name</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-emerald-950 focus:border-emerald-600 outline-none" value={profileData.firstName} onChange={e => setProfileData({...profileData, firstName: e.target.value})} disabled={profileStatus.loading} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Name</label>
                    <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-emerald-950 focus:border-emerald-600 outline-none" value={profileData.lastName} onChange={e => setProfileData({...profileData, lastName: e.target.value})} disabled={profileStatus.loading} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Email</label>
                  <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-emerald-950 focus:border-emerald-600 outline-none" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} disabled={profileStatus.loading} />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clearance Level (Role)</label>
                  <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 cursor-not-allowed">
                    {(adminUser.role || 'superadmin').toUpperCase()} (Cannot be changed)
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button type="submit" disabled={profileStatus.loading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-70">
                  {profileStatus.loading ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;