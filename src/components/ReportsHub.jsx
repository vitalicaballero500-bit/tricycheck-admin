import React, { useState } from 'react';
import axios from 'axios';
import { 
  IoPrint, IoDownload, IoCalendar, IoCarSport, 
  IoPeople, IoWarning, IoTime, IoCheckmarkCircle, IoDocumentText 
} from 'react-icons/io5';
import CustomModal from './CustomModal';

function ReportsHub() {
  const [activeReport, setActiveReport] = useState('rides');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activePreset, setActivePreset] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const toISO = (d) => d.toISOString().split('T')[0];
    const endStr = toISO(today);

    if (preset === 'today') {
      setDateRange({ start: endStr, end: endStr });
    } else if (preset === '7days') {
      const start = new Date();
      start.setDate(today.getDate() - 7);
      setDateRange({ start: toISO(start), end: endStr });
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ start: toISO(start), end: endStr });
    } else if (preset === 'year') {
      const start = new Date(today.getFullYear(), 0, 1);
      setDateRange({ start: toISO(start), end: endStr });
    }
  };

  const generateData = async () => {
    if (!dateRange.start || !dateRange.end) {
      setModalState({ isOpen: true, title: "Missing Dates", message: "Please select a Quick Preset or pick both Start and End dates.", type: "warning" });
      return null;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      let endpoint = '';
      let params = {};

      if (activeReport === 'rides') {
        endpoint = 'https://tricycheck-api.onrender.com/api/admin/reports';
        params = { filter: 'custom', startDate: dateRange.start, endDate: dateRange.end };
      } else if (activeReport === 'fleet' || activeReport === 'renewals') {
        endpoint = 'https://tricycheck-api.onrender.com/api/admin/drivers';
      } else if (activeReport === 'tickets') {
        endpoint = 'https://tricycheck-api.onrender.com/api/tickets';
      } else if (activeReport === 'audit') {
        endpoint = 'https://tricycheck-api.onrender.com/api/admin/activity-feed';
      }

      const response = await axios.get(endpoint, { ...config, params });
      let finalData = response.data;

      if (activeReport === 'renewals') {
        // Show all verified or pending-renewal drivers so POSO has a complete Compliance & Renewal ledger
        finalData = finalData.filter(d => d.driverStatus !== 'Rejected');
      } else if (activeReport !== 'rides') {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        
        finalData = finalData.filter(item => {
          const itemDate = new Date(item.createdAt || item.timestamp);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      if (finalData.length === 0) {
        setModalState({ isOpen: true, title: "No Data Found", message: "No records found for the selected time period.", type: "warning" });
        return null;
      }

      return finalData;
    } catch (error) {
      setModalState({ isOpen: true, title: "Generation Failed", message: "Failed to securely fetch POSO data.", type: "warning" });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const formatExp = (d) => d ? new Date(d).toLocaleDateString() : 'Missing';
  const getRenewedByLabel = (d) => {
    if (d.lastRenewedByName) {
      const roleStr = d.lastRenewedByRole ? ` (${d.lastRenewedByRole.toUpperCase()})` : '';
      const dateStr = d.lastRenewedAt ? ` on ${new Date(d.lastRenewedAt).toLocaleDateString()}` : '';
      return `${d.lastRenewedByName}${roleStr}${dateStr}`;
    }
    if (d.registeredBy) {
      return `${d.registeredBy.firstName || ''} ${d.registeredBy.lastName || ''} (${(d.registeredBy.role || 'POSO').toUpperCase()})`;
    }
    return 'POSO Command Center';
  };

  const handleDownloadCSV = async () => {
    const data = await generateData();
    if (!data) return;

    let headers = [];
    let rows = [];

    if (activeReport === 'rides') {
      headers = ["Date", "Time", "Booking ID", "Passenger", "Driver", "Body No.", "Pickup Location", "Dropoff Location"];
      rows = data.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        new Date(r.createdAt).toLocaleTimeString(),
        r._id, `"${r.passengerName || 'Unknown'}"`, `"${r.driverName || 'Unknown'}"`, r.driverBodyNo || 'N/A',
        `"${r.pickupLocation}"`, `"${r.dropoffLocation}"`
      ]);
    } else if (activeReport === 'fleet') {
      headers = ["Date Added", "Body No.", "Plate No.", "License No.", "Driver Name", "Phone", "Email", "Barangay", "App Status"];
      rows = data.map(d => [
        new Date(d.createdAt).toLocaleDateString(),
        d.bodyNo || 'N/A',
        d.plateNo || 'N/A',
        d.licenseNo || 'N/A',
        `"${d.firstName} ${d.lastName}"`,
        d.phone || 'N/A',
        d.email || 'N/A',
        `"${d.address || 'Calasiao'}"`,
        d.driverStatus || 'Pending'
      ]);
    } else if (activeReport === 'renewals') {
      headers = ["Body No.", "Driver Name", "License Expiry", "OR/CR Expiry", "Permit Expiry", "Renewal Status", "Verified / Renewed By (Staff / Superadmin)"];
      rows = data.map(d => [
        d.bodyNo || 'N/A',
        `"${d.firstName} ${d.lastName}"`,
        formatExp(d.licenseExpiry),
        formatExp(d.orCrExpiry),
        formatExp(d.franchisePermitExpiry),
        d.renewalStatus || 'Active',
        `"${getRenewedByLabel(d)}"`
      ]);
    } else if (activeReport === 'tickets') {
      headers = ["Date Filed", "Ticket ID", "Complainant", "Complainant Contact", "Reported Driver", "Driver Contact", "Type", "Priority", "Status", "Description"];
      rows = data.map(t => [
        new Date(t.createdAt).toLocaleDateString(), 
        t._id, 
        `"${t.passengerId ? t.passengerId.firstName + ' ' + t.passengerId.lastName : 'Driver / System'}"`, 
        `"${t.passengerId ? (t.passengerId.phone || '') + ' ' + (t.passengerId.email || '') : 'N/A'}"`,
        `"${t.driverId ? t.driverId.firstName + ' ' + t.driverId.lastName : 'None'}"`, 
        `"${t.driverId ? (t.driverId.bodyNo || 'N/A') + ' ' + (t.driverId.phone || '') : 'N/A'}"`,
        t.type, 
        t.priority, 
        t.status, 
        `"${t.description}"`
      ]);
    } else if (activeReport === 'audit') {
      headers = ["Date", "Time", "Admin / Staff", "Module", "Action", "Details"];
      rows = data.map(a => [
        new Date(a.createdAt).toLocaleDateString(), new Date(a.createdAt).toLocaleTimeString(),
        `"${a.adminName} (${(a.role || 'admin').toUpperCase()})"`, a.module, `"${a.action}"`, `"${a.details}"`
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `POSO_${activeReport.toUpperCase()}_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = async () => {
    const data = await generateData();
    if (!data) return;

    const printWindow = window.open('', '_blank');
    let title = activeReport === 'rides' ? 'Completed Rides' : 
                activeReport === 'fleet' ? 'Fleet Directory & KYC Registration' : 
                activeReport === 'renewals' ? 'Compliance & Credential Renewals' :
                activeReport === 'tickets' ? 'Support & Emergency Tickets' : 'System Audit Trail';

    let html = `
      <html>
      <head>
        <title>POSO Official Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #1e293b; margin-bottom: 5px; text-transform: uppercase; }
          p { text-align: center; color: #64748b; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>POSO ${title} REPORT</h1>
        <p>Calasiao Public Order and Safety Office</p>
        <p>Report Range: ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
    `;

    if (activeReport === 'rides') {
      html += `<th>Date & Time</th><th>Passenger</th><th>Driver (Body No)</th><th>Route</th></tr></thead><tbody>`;
      data.forEach(r => {
        const dateObj = new Date(r.createdAt);
        html += `<tr><td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</td><td>${r.passengerName || 'Unknown'}</td><td>${r.driverName || 'Unknown'} (${r.driverBodyNo || 'N/A'})</td><td>${r.pickupLocation} <b>&rarr;</b> ${r.dropoffLocation}</td></tr>`;
      });
      html += `</tbody></table><div style="margin-top: 20px; font-size: 13px; font-weight: bold; text-align: right;">Total Completed Trips: ${data.length}</div>`;
    } 
    else if (activeReport === 'fleet') {
      html += `<th>Date Added</th><th>Body No</th><th>Plate / License No</th><th>Driver Name & Contact</th><th>Barangay</th><th>Status</th></tr></thead><tbody>`;
      data.forEach(d => {
        html += `<tr>
          <td>${new Date(d.createdAt).toLocaleDateString()}</td>
          <td><b>${d.bodyNo || 'N/A'}</b></td>
          <td>Plate: ${d.plateNo || 'N/A'}<br/>Lic: ${d.licenseNo || 'N/A'}</td>
          <td><b>${d.firstName} ${d.lastName}</b><br/>${d.phone || ''}</td>
          <td>${d.address || 'Calasiao'}</td>
          <td>${d.driverStatus}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    else if (activeReport === 'renewals') {
      html += `<th>Body No</th><th>Driver Name</th><th>License Expiry</th><th>OR/CR Expiry</th><th>Permit Expiry</th><th>Renewal Status</th><th>Accepted / Renewed By (Staff / Superadmin)</th></tr></thead><tbody>`;
      data.forEach(d => {
        html += `<tr>
          <td><b>${d.bodyNo || 'N/A'}</b></td>
          <td><b>${d.firstName} ${d.lastName}</b><br/>${d.phone || ''}</td>
          <td>${formatExp(d.licenseExpiry)}</td>
          <td>${formatExp(d.orCrExpiry)}</td>
          <td>${formatExp(d.franchisePermitExpiry)}</td>
          <td><b>${d.renewalStatus === 'Pending' ? 'PENDING AUDIT' : 'VERIFIED'}</b></td>
          <td><b>${getRenewedByLabel(d)}</b></td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    else if (activeReport === 'tickets') {
      html += `<th>Date Filed</th><th>Complainant / Contact</th><th>Reported Driver</th><th>Issue Type</th><th>Status</th></tr></thead><tbody>`;
      data.forEach(t => {
        html += `
          <tr>
            <td>
              <b>${new Date(t.createdAt).toLocaleDateString()}</b><br/>
              <span style="color: #64748b; font-size: 8px;">${t._id}</span>
            </td>
            <td>
              <b>${t.passengerId ? t.passengerId.firstName + ' ' + t.passengerId.lastName : 'Driver / System'}</b><br/>
              <span style="color: #64748b;">${t.passengerId ? t.passengerId.phone || 'No Phone' : ''}</span><br/>
              <span style="color: #64748b;">${t.passengerId ? t.passengerId.email || 'No Email' : ''}</span>
            </td>
            <td>
              <b>${t.driverId ? t.driverId.firstName + ' ' + t.driverId.lastName : 'No Driver Assigned'}</b><br/>
              <span style="color: #64748b;">${t.driverId ? 'Body No: ' + (t.driverId.bodyNo || 'N/A') : ''}</span><br/>
              <span style="color: #64748b;">${t.driverId ? t.driverId.phone || '' : ''}</span>
            </td>
            <td>
              <b>${t.type}</b><br/>
              <span style="color: #ef4444; font-weight: bold;">${t.priority}</span>
            </td>
            <td><b>${t.status}</b></td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }
    else if (activeReport === 'audit') {
      html += `<th>Date & Time</th><th>Admin / Staff</th><th>Module</th><th>Action</th><th>Details</th></tr></thead><tbody>`;
      data.forEach(a => {
        const dateObj = new Date(a.createdAt);
        html += `<tr><td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</td><td><b>${a.adminName}</b> (${(a.role || 'admin').toUpperCase()})</td><td>${a.module}</td><td>${a.action}</td><td>${a.details}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const reportTypes = [
    { id: 'rides', name: 'Rides', icon: <IoCarSport />, desc: 'Extract all completed passenger trips.' },
    { id: 'fleet', name: 'Fleet Directory', icon: <IoPeople />, desc: 'Extract registered drivers, plates, licenses, and barangays.' },
    { id: 'renewals', name: 'Compliance & Renewals', icon: <IoDocumentText />, desc: 'Extract document expiry dates & which POSO officer accepted renewals.' },
    { id: 'tickets', name: 'Support Tickets', icon: <IoWarning />, desc: 'Extract SOS alerts, complaints, and resolution statuses.' },
    { id: 'audit', name: 'System Audit', icon: <IoTime />, desc: 'Extract administrative actions and system modifications.' }
  ];

  return (
    <div className="h-full flex flex-col animate-fade-in relative max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoPrint className="text-emerald-600 mr-2" /> Reports & Analytics
          </h2>
          <p className="text-sm font-medium text-slate-500">Securely extract and print official POSO records in one click.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-8 flex flex-col md:flex-row gap-8">
          
        {/* LEFT: REPORT SELECTION */}
        <div className="flex-1 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">1. Select Data Source</h3>
          {reportTypes.map(type => (
            <button 
              key={type.id}
              onClick={() => setActiveReport(type.id)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center space-x-4 ${activeReport === type.id ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 ${activeReport === type.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                {type.icon}
              </div>
              <div>
                <h4 className={`font-black text-sm ${activeReport === type.id ? 'text-emerald-900' : 'text-slate-700'}`}>{type.name}</h4>
                <p className={`text-[10px] font-bold mt-0.5 ${activeReport === type.id ? 'text-emerald-700' : 'text-slate-400'}`}>{type.desc}</p>
              </div>
              {activeReport === type.id && <IoCheckmarkCircle className="text-emerald-500 text-2xl ml-auto shrink-0" />}
            </button>
          ))}
        </div>

        {/* RIGHT: 1-CLICK PRESETS, DATE FILTER & EXPORT */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Time Filter & Export</h3>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' }
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`py-2.5 px-2 rounded-xl font-black text-xs transition-all border ${
                  activePreset === preset.id 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-6 relative overflow-hidden">
            <IoCalendar className="absolute -right-4 -bottom-4 text-8xl text-slate-200 opacity-50" />
            <div className="relative z-10 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => { setActivePreset('custom'); setDateRange({...dateRange, start: e.target.value}); }}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 shadow-sm" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => { setActivePreset('custom'); setDateRange({...dateRange, end: e.target.value}); }}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 shadow-sm" 
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-4 mt-auto">
            <button 
              onClick={handleDownloadCSV} 
              disabled={isGenerating || !dateRange.start || !dateRange.end} 
              className="flex-1 bg-slate-800 text-white py-4 rounded-xl font-black text-sm shadow-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isGenerating ? <span className="animate-pulse">Loading...</span> : <><IoDownload className="mr-2 text-xl" /> CSV (Excel)</>}
            </button>
            <button 
              onClick={handlePrint} 
              disabled={isGenerating || !dateRange.start || !dateRange.end} 
              className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isGenerating ? <span className="animate-pulse">Loading...</span> : <><IoPrint className="mr-2 text-xl" /> Print / PDF</>}
            </button>
          </div>
        </div>

      </div>

      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={closeModal}
      />
    </div>
  );
}

export default ReportsHub;