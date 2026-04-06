import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  IoGrid, IoIdCard, IoMap, IoWarning, IoSettings, IoLogOut, 
  IoDocumentText, IoBicycle, IoPeople, IoCall, IoTime, IoPrint, IoDownload, IoClose
} from 'react-icons/io5';

import PassengerManagement from './PassengerManagement';
import FleetManagement from './FleetManagement';
import LiveOperationsMap from './LiveOperationsMap';
import SupportTickets from './SupportTickets';
import StaffManagement from './StaffManagement';
import SystemSettings from './SystemSettings';
import ComplianceHub from './ComplianceHub';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminUser, setAdminUser] = useState(null);
  
  const [stats, setStats] = useState({ activeDrivers: 0, pendingDrivers: 0, activeRides: 0, expiringDrivers: [] });
  const [loadingStats, setLoadingStats] = useState(true);

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // === REPORT MODAL STATES ===
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({ filter: 'daily', startDate: '', endDate: '' });
  const [isGenerating, setIsGenerating] = useState(false);
// === MY PROFILE EDITOR STATES ===
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', email: '' });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: '', success: '' });

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
          
          // F1 Sync: Update React State & LocalStorage instantly so UI changes without reload
          const updatedUser = { ...adminUser, ...response.data.user };
          localStorage.setItem('adminUser', JSON.stringify(updatedUser));
          setAdminUser(updatedUser);
          
          setProfileStatus({ loading: false, error: '', success: 'Profile updated successfully!' });
          setTimeout(() => setShowProfileModal(false), 2000);
      } catch (err) {
          setProfileStatus({ loading: false, error: err.response?.data?.error || 'Failed to update profile.', success: '' });
      }
  };
  useEffect(() => {
    const userString = localStorage.getItem('adminUser'); 
    if (userString) setAdminUser(JSON.parse(userString));
    else setAdminUser({ firstName: 'Super', lastName: 'Admin', role: 'superadmin' });
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard' && adminUser) {
      const fetchDashboardData = async () => {
        const token = localStorage.getItem('adminToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
          const statsRes = await axios.get('https://tricycheck-api.onrender.com/api/admin/stats', config);
          setStats(statsRes.data);
        } catch (error) {} finally { setLoadingStats(false); }

        try {
          const currentRole = adminUser.role || 'superadmin'; 
          const logsRes = await axios.get(`https://tricycheck-api.onrender.com/api/admin/activity-feed?role=${currentRole}`, config);
          setAuditLogs(logsRes.data);
        } catch (error) {} finally { setLoadingLogs(false); }
      };
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, adminUser]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/');
  };

  // === REPORT GENERATOR ===
  const generateReportData = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` },
        params: { filter: reportConfig.filter, startDate: reportConfig.startDate, endDate: reportConfig.endDate }
      });
      return response.data;
    } catch (error) {
      alert("Failed to fetch report data.");
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  // FORMAT 1: CSV
  const handleDownloadCSV = async () => {
    const data = await generateReportData();
    if (data.length === 0) return alert(`No completed rides found for the selected time period.`);

    const headers = ["Date", "Time", "Booking ID", "Passenger", "Driver", "Body No.", "Pickup Location", "Pickup Lat/Lng", "Dropoff Location", "Dropoff Lat/Lng", "Fare (PHP)"];
    
    const rows = data.map(ride => {
       const dateObj = new Date(ride.createdAt);
       return [
         dateObj.toLocaleDateString(),
         dateObj.toLocaleTimeString(),
         ride._id,
         `"${ride.passengerName || 'Unknown'}"`,
         `"${ride.driverName || 'Unknown'}"`,
         ride.driverBodyNo || 'N/A',
         `"${ride.pickupLocation}"`, 
         `"${ride.pickupLat}, ${ride.pickupLng}"`,
         `"${ride.dropoffLocation}"`,
         `"${ride.dropoffLat}, ${ride.dropoffLng}"`,
         ride.fare
       ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `POSO_Report_${reportConfig.filter}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportModal(false);
  };

  // FORMAT 2: PRINT / PDF
  const handlePrint = async () => {
    const data = await generateReportData();
    if (data.length === 0) return alert(`No completed rides found for the selected time period.`);

    const printWindow = window.open('', '_blank');
    let totalFare = 0;

    let html = `
      <html>
      <head>
        <title>POSO Official Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #1e293b; margin-bottom: 5px; }
          p { text-align: center; color: #64748b; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; }
          .summary { margin-top: 20px; font-size: 14px; font-weight: bold; text-align: right; }
        </style>
      </head>
      <body>
        <h1>TRICYCHECK SYSTEM REPORT</h1>
        <p>Calasiao Public Order and Safety Office</p>
        <p>Report Range: ${reportConfig.filter.toUpperCase()}</p>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Passenger</th>
              <th>Driver (Body No)</th>
              <th>Route (Pickup -> Dropoff)</th>
              <th>Fare</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(ride => {
      const dateObj = new Date(ride.createdAt);
      totalFare += Number(ride.fare) || 0;
      html += `
        <tr>
          <td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</td>
          <td>${ride.passengerName || 'Unknown'}</td>
          <td>${ride.driverName || 'Unknown'} (${ride.driverBodyNo || 'N/A'})</td>
          <td>${ride.pickupLocation} <b>&rarr;</b> ${ride.dropoffLocation}</td>
          <td>PHP ${ride.fare}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <div class="summary">Total Estimated Fare Volume: PHP ${totalFare.toLocaleString()}</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setShowReportModal(false);
  };

  const allMenuItems = [
    { id: 'dashboard', label: 'Overview', icon: <IoGrid />, roles: ['superadmin', 'secretary', 'dispatcher'] },
    { id: 'fleet', label: 'Fleet Management', icon: <IoIdCard />, roles: ['superadmin', 'secretary'] },
    { id: 'map', label: 'Live Operations', icon: <IoMap />, roles: ['superadmin', 'dispatcher'] },
    { id: 'reports', label: 'Support Tickets', icon: <IoWarning />, roles: ['superadmin', 'dispatcher'] },
    { id: 'staff', label: 'Staff Management', icon: <IoPeople />, roles: ['superadmin'] },
    { id: 'settings', label: 'System Settings', icon: <IoSettings />, roles: ['superadmin'] },
    { id: 'passengers', label: 'Passenger Oversight', icon: <IoPeople />, roles: ['superadmin', 'secretary'] },
    { id: 'compliance', label: 'Compliance Hub', icon: <IoDocumentText />, roles: ['superadmin', 'secretary'] }, 
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(adminUser?.role));

  const getModuleColor = (module) => {
    const colors = { fleet: 'bg-emerald-100 text-emerald-600 border-emerald-200', passengers: 'bg-indigo-100 text-indigo-600 border-indigo-200', settings: 'bg-slate-800 text-white border-slate-700', reports: 'bg-orange-100 text-orange-600 border-orange-200', compliance: 'bg-red-100 text-red-600 border-red-200', staff: 'bg-purple-100 text-purple-600 border-purple-200' };
    return colors[module] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (!adminUser) return null; 

  // === THE FIX: ENTERPRISE ISLAND ARCHITECTURE ===
  return (
    <div className="flex h-[100dvh] bg-emerald-950 overflow-hidden font-sans selection:bg-amber-400/30 selection:text-amber-200">
      
      {/* 1. THE ANCHOR: Dark Government Sidebar */}
      <aside className="w-72 bg-emerald-950 text-white flex flex-col z-20 shrink-0 border-r border-emerald-900 shadow-2xl relative">
        <div className="h-24 flex items-center px-6 border-b border-emerald-900 bg-emerald-950">
          <img src="/poso-logo.jpg" alt="POSO" className="w-12 h-12 mr-4 drop-shadow-md object-contain rounded-full border border-emerald-800" />
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight text-emerald-50">TricyCheck</h1>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4 ml-2">Main Menu</p>
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-amber-400 text-emerald-950 shadow-lg shadow-amber-500/20' : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-amber-400'}`}>
              <span className="text-xl">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-900 bg-emerald-950">
          <div className="flex items-center justify-between bg-emerald-900/50 p-4 rounded-xl border border-emerald-800">
            <div 
              className="flex items-center space-x-3 truncate cursor-pointer hover:bg-emerald-800 p-1.5 -ml-1.5 rounded-lg transition-colors" 
              onClick={() => setShowProfileModal(true)}
              title="Edit My Profile"
            >
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-emerald-950 font-black shadow-inner shrink-0 border-2 border-emerald-800">
                {adminUser.firstName.charAt(0)}{adminUser.lastName ? adminUser.lastName.charAt(0) : ''}
              </div>
              <div className="text-left truncate">
                <p className="text-sm font-bold text-emerald-50 leading-tight truncate">{adminUser.firstName} {adminUser.lastName}</p>
                <p className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">● {adminUser.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-emerald-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0 ml-2"><IoLogOut className="text-xl" /></button>
          </div>
        </div>
      </aside>

      {/* 2. THE CANVAS: The Floating "Square" Island */}
      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden bg-slate-50 md:rounded-tl-[2.5rem] md:my-2 md:mr-2 shadow-[-15px_0_40px_rgba(0,0,0,0.5)] border border-emerald-900/20">
        
        {/* HEADER - Sharp Light Mode */}
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20 md:rounded-tl-[2.5rem]">
          <div>
            <h2 className="text-2xl font-black text-emerald-950 tracking-tight">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">System Overview & Management</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl border border-emerald-100 font-bold text-sm shadow-sm">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span>System Online</span>
            </div>
            <button onClick={() => setShowReportModal(true)} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95">
              <IoDocumentText className="text-lg" /> <span>Generate Report</span>
            </button>
          </div>
        </header>

        {/* DYNAMIC MODULE INJECTION */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-10">
          {activeTab === 'dashboard' && (
            <div className="p-8 space-y-8 animate-fade-in w-full max-w-[1600px] mx-auto">
              
              {/* STAT CARDS - Pristine White Glass */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Drivers */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <IoCarSport className="text-2xl text-emerald-600" />
                    </div>
                    {loadingStats ? <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div> : <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded-lg text-xs">+Live</span>}
                  </div>
                  <h3 className="text-4xl font-black text-emerald-950 relative z-10">{stats.activeDrivers}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10 mt-1">Active Fleet</p>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                      <IoIdCard className="text-2xl text-amber-500" />
                    </div>
                    {stats.pendingDrivers > 0 && <span className="bg-red-50 text-red-500 font-bold px-2 py-1 rounded-lg text-xs animate-pulse">Action Needed</span>}
                  </div>
                  <h3 className="text-4xl font-black text-emerald-950 relative z-10">{stats.pendingDrivers}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10 mt-1">Pending Approvals</p>
                </div>

                {/* Active Rides */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                      <IoBicycle className="text-2xl text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-emerald-950 relative z-10">{stats.activeRides}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10 mt-1">Rides in Transit</p>
                </div>

                {/* Active Tickets */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                      <IoWarning className="text-2xl text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-emerald-950 relative z-10">{stats.activeTickets?.length || 0}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10 mt-1">Open Reports</p>
                </div>
              </div>

              {/* THE SQUARE MAP CONTAINER - With Depth and Shadows */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-end mb-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-emerald-950 tracking-tight flex items-center">
                      <IoMap className="mr-3 text-emerald-600" /> POSO Live Radar
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time GPS Tracking & SOS Monitoring</p>
                  </div>
                  <div className="flex items-center space-x-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-700 tracking-wider">LIVE SYNC</span>
                  </div>
                </div>
                <div className="h-[500px] w-full rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-inner relative z-10 bg-slate-100">
                   <LiveOperationsMap />
                </div>
              </div>

              {/* AUDIT LOGS CONTAINER */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-black text-emerald-950 tracking-tight mb-6">Security Audit Logs</h3>
                {loadingLogs ? (
                   <p className="text-slate-500 font-bold animate-pulse">Loading system records...</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map(log => (
                      <div key={log._id} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-200 shrink-0">
                           {log.adminId?.firstName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-950">
                             {log.adminId?.firstName} {log.adminId?.lastName} <span className="text-emerald-600 font-black">{log.action}</span>
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5">{log.details}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                             {new Date(log.timestamp).toLocaleString()} • {log.moduleName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'passengers' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><PassengerManagement /></div>}
          {activeTab === 'fleet' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><FleetManagement /></div>}
          {activeTab === 'compliance' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><ComplianceHub /></div>}
          {activeTab === 'tickets' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><SupportTickets /></div>}
          {activeTab === 'staff' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><StaffManagement /></div>}
          {activeTab === 'settings' && <div className="p-8 animate-fade-in w-full max-w-[1600px] mx-auto"><SystemSettings /></div>}
        </div>
      </main>

      {/* MODALS REMAIN UNCHANGED BELOW */}
      {showReportModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md z-10 p-8 border border-slate-200 relative animate-slide-up">
            <button onClick={() => setShowReportModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><IoClose className="text-xl" /></button>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
               <IoPrint className="text-2xl" />
            </div>
            <h3 className="text-2xl font-black text-emerald-950 mb-2">Generate Analytics Report</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">Extract official POSO data securely.</p>
            
            <div className="space-y-5">
               <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time Filter</label>
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-emerald-950 focus:border-emerald-600 outline-none cursor-pointer" value={reportConfig.filter} onChange={e => setReportConfig({...reportConfig, filter: e.target.value})}>
                     <option value="daily">Daily Summary</option>
                     <option value="weekly">Weekly Analytics</option>
                     <option value="monthly">Monthly Overview</option>
                     <option value="custom">Custom Range</option>
                  </select>
               </div>
               
               <button onClick={generateReport} disabled={isGenerating} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50">
                  {isGenerating ? <span className="animate-pulse">Compiling Data...</span> : <><IoDownload className="mr-2 text-lg" /> Download PDF Report</>}
               </button>
            </div>
          </div>
        </div>
      )}

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

            <form onSubmit={updateProfile}>
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
                       {adminUser.role.toUpperCase()} (Cannot be changed)
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