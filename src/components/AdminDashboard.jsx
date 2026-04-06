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

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* === THE FIX: EMERALD/AMBER GOVERNMENT SIDEBAR === */}
      <aside className="w-72 bg-bg-emerald-900 text-white flex flex-col shadow-2xl z-20 shrink-0 border-r border-emerald-900">
        <div className="h-24 flex items-center px-6 border-b border-emerald-900 bg-bg-emerald-900">
          {/* THE FIX: poso-logo.png changed to .jpg to fix the broken image */}
          <img src="/poso-logo.jpg" alt="POSO" className="w-12 h-12 mr-4 drop-shadow-md object-contain rounded-full border border-emerald-800" />
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight text-emerald-50">TricyCheck</h1>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4 ml-2">Main Menu</p>
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-amber-400 text-bg-emerald-900 shadow-lg shadow-amber-500/20' : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-amber-400'}`}>
              <span className="text-xl">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-900 bg-bg-emerald-900">
          <div className="flex items-center justify-between bg-emerald-900/50 p-4 rounded-xl border border-emerald-800">
            <div 
              className="flex items-center space-x-3 truncate cursor-pointer hover:bg-emerald-800 p-1.5 -ml-1.5 rounded-lg transition-colors" 
              onClick={() => setShowProfileModal(true)}
              title="Edit My Profile"
            >
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-bg-emerald-900 font-black shadow-inner shrink-0 border-2 border-emerald-800">
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-24 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] flex items-center justify-between px-10 z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 capitalize">{menuItems.find(m => m.id === activeTab)?.label || 'Module'}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">Calasiao Public Order and Safety Office</p>
          </div>
          <div className="flex items-center space-x-4">
            {(loadingStats || loadingLogs) && activeTab === 'dashboard' && <span className="text-xs font-bold text-slate-400 animate-pulse uppercase">Syncing Live Data...</span>}
            
            <button 
              onClick={() => setShowReportModal(true)} 
              className="bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors shadow-lg flex items-center space-x-2 active:scale-95"
            >
              <IoDocumentText className="text-lg text-emerald-600" />
              <span>Generate Report</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
          
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {stats.activeTickets?.some(t => t.priority === 'CRITICAL' || t.priority === 'High') && (
                <div className="bg-red-500 text-white p-3 rounded-xl mb-6 shadow-lg shadow-red-500/30 flex justify-center items-center font-black tracking-widest uppercase text-sm animate-pulse border-2 border-red-600">
                   <IoWarning className="mr-2 text-xl" /> ACTIVE EMERGENCY: UNRESOLVED HIGH-PRIORITY TICKETS DETECTED!
                </div>
              )}

              {/* === THE FIX: Changed to lg:grid-cols-4 since we removed Gross Fare === */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-2xl shadow-sm border border-red-100"><IoWarning /></div></div>
                  <h3 className="text-4xl font-black text-slate-800 mb-1">{stats.activeTicketsCount || 0}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unresolved Tickets</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm border border-emerald-100"><IoIdCard /></div></div>
                  <h3 className="text-4xl font-black text-slate-800 mb-1">{stats.activeDrivers}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Drivers</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-2xl shadow-sm border border-orange-100"><IoDocumentText /></div></div>
                  <h3 className="text-4xl font-black text-slate-800 mb-1">{stats.pendingDrivers}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl shadow-sm border border-emerald-100"><IoBicycle /></div></div>
                  <h3 className="text-4xl font-black text-slate-800 mb-1">{stats.activeRides}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Rides Now</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl shadow-sm border border-red-200/80 overflow-hidden relative flex flex-col h-[500px]">
                     <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/30 shrink-0">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 flex items-center">
                            <IoWarning className="text-red-500 mr-2 text-2xl animate-pulse" /> Priority Alerts
                          </h3>
                          <p className="text-sm font-medium text-slate-500 mt-1">Expiring docs in ≤ 30 days.</p>
                        </div>
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm">
                          {stats.expiringDrivers.length} Flagged
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto">
                         {stats.expiringDrivers.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                               <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 text-3xl mb-3 border border-green-100">🎉</div>
                               <p className="text-lg font-bold text-slate-700">All documents are up to date!</p>
                            </div>
                         ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                                  <th className="p-4 pl-8">Body No.</th>
                                  <th className="p-4">Driver Name</th>
                                  <th className="p-4 text-right pr-8">Action</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                {stats.activeTickets?.map(t => (
                                  <tr key={t._id} className="bg-red-50/40 hover:bg-red-50 transition-colors">
                                    <td className="p-4 pl-8">
                                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${t.priority === 'CRITICAL' ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'}`}>
                                          {t.priority} TICKET
                                       </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800 truncate max-w-[150px]">{t.type}</td>
                                    <td className="p-4 text-right pr-8">
                                      <button onClick={() => setActiveTab('reports')} className="inline-flex items-center justify-center bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-50 shadow-sm transition-all">
                                        <IoWarning className="mr-1.5" /> View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {stats.expiringDrivers?.map(d => (
                                  <tr key={d._id} className="hover:bg-red-50/50 transition-colors">
                                    <td className="p-4 pl-8 font-black text-slate-900">{d.bodyNo || 'N/A'}</td>
                                    <td className="p-4 font-bold truncate max-w-[120px]">{d.firstName} {d.lastName}</td>
                                    <td className="p-4 text-right pr-8">
                                      <a href={`tel:${d.phone}`} className="inline-flex items-center justify-center bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-100 active:scale-95 transition-all shadow-sm">
                                        <IoCall className="mr-1.5" /> Call
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                         )}
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative flex flex-col h-[500px]">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 flex items-center">
                            <IoTime className="text-emerald-600 mr-2 text-2xl" /> System Audit Trail
                          </h3>
                          <p className="text-sm font-medium text-slate-500 mt-1">Live tracking of administrative actions.</p>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-0">
                        {loadingLogs ? (
                            <div className="flex justify-center items-center h-full text-slate-400 font-bold animate-pulse">Syncing Encrypted Feed...</div>
                        ) : auditLogs.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-slate-400 font-bold">No recent system activity.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                               {auditLogs.map(log => (
                                   <div key={log._id} className="p-5 hover:bg-slate-50 transition-colors flex space-x-4">
                                       <div className={`mt-1 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs border shadow-inner shrink-0 ${getModuleColor(log.module)}`}>
                                          {log.module.substring(0,3).toUpperCase()}
                                       </div>
                                       <div className="flex-1">
                                           <div className="flex justify-between items-start">
                                              <p className="text-sm font-black text-slate-800 leading-tight pr-2">{log.action}</p>
                                              <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap pt-0.5">
                                                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                           </div>
                                           <p className="text-xs text-slate-500 font-medium mt-1">{log.details}</p>
                                           <div className="flex items-center mt-3">
                                               <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center">
                                                  <IoGrid className="mr-1" /> {log.adminName}
                                               </span>
                                           </div>
                                       </div>
                                   </div>
                               ))}
                            </div>
                        )}
                     </div>
                  </div>

              </div>
            </div>
          )}

          {activeTab === 'fleet' && <FleetManagement />}
          {activeTab === 'map' && <LiveOperationsMap />}
          {activeTab === 'reports' && <SupportTickets />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'compliance' && <ComplianceHub />}
          {activeTab === 'passengers' && <PassengerManagement />}
          {activeTab === 'settings' && <SystemSettings />}

        </main>
      </div>

      {/* === THE REPORT MODAL === */}
      {showReportModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-slide-up">
            
            <div className="bg-bg-emerald-900 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black flex items-center"><IoDocumentText className="mr-2 text-emerald-600" /> Generate Report</h2>
              <button onClick={() => setShowReportModal(false)}><IoClose className="text-2xl hover:text-red-400 transition-colors" /></button>
            </div>

            <div className="p-6">
               <p className="text-sm text-slate-500 mb-6">Select a date range to aggregate all completed ride data, including precise GPS coordinates and passenger details.</p>
               
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time Period</label>
               <select 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-600 mb-4"
                  value={reportConfig.filter}
                  onChange={(e) => setReportConfig({...reportConfig, filter: e.target.value})}
               >
                  <option value="daily">Daily (Today)</option>
                  <option value="weekly">Weekly (Last 7 Days)</option>
                  <option value="monthly">Monthly (Last 30 Days)</option>
                  <option value="all">All Time History</option>
                  <option value="custom">Custom Date Range</option>
               </select>

               {reportConfig.filter === 'custom' && (
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700" value={reportConfig.startDate} onChange={e => setReportConfig({...reportConfig, startDate: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</label>
                       <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700" value={reportConfig.endDate} onChange={e => setReportConfig({...reportConfig, endDate: e.target.value})} />
                    </div>
                 </div>
               )}

               <div className="flex space-x-3 mt-8">
                  <button onClick={handlePrint} disabled={isGenerating} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-3.5 rounded-xl font-black text-sm flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all">
                     <IoPrint className="mr-2 text-lg" /> Print / PDF
                  </button>
                  <button onClick={handleDownloadCSV} disabled={isGenerating} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center shadow-lg hover:bg-emerald-600 active:scale-95 transition-all">
                     {isGenerating ? <span className="animate-pulse">Fetching...</span> : <><IoDownload className="mr-2 text-lg" /> CSV (Excel)</>}
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}
{/* === MY PROFILE MODAL === */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-slide-up">
            
            <div className="bg-bg-emerald-900 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-black flex items-center"><IoPeople className="mr-2 text-emerald-600" /> Edit My Profile</h2>
              <button onClick={() => setShowProfileModal(false)}><IoClose className="text-2xl hover:text-red-400 transition-colors" /></button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6">
               <div className="flex justify-center mb-6">
                 <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center text-3xl font-black shadow-inner border-4 border-slate-100">
                    {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                 </div>
               </div>

               {profileStatus.error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl mb-4 border border-red-200">{profileStatus.error}</div>}
               {profileStatus.success && <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl mb-4 border border-green-200">{profileStatus.success}</div>}

               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Name</label>
                       <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:border-emerald-600 outline-none" value={profileData.firstName} onChange={e => setProfileData({...profileData, firstName: e.target.value})} disabled={profileStatus.loading} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Name</label>
                       <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:border-emerald-600 outline-none" value={profileData.lastName} onChange={e => setProfileData({...profileData, lastName: e.target.value})} disabled={profileStatus.loading} />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Email</label>
                    <input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:border-emerald-600 outline-none" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} disabled={profileStatus.loading} />
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clearance Level (Role)</label>
                    <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 cursor-not-allowed">
                       {adminUser.role.toUpperCase()} (Cannot be changed)
                    </div>
                 </div>
               </div>

               <div className="mt-8 flex justify-end">
                  <button type="submit" disabled={profileStatus.loading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-70">
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