import React, { useState } from 'react';
import axios from 'axios';
import { 
  IoPrint, IoDownload, IoCalendar, IoCarSport, 
  IoPeople, IoWarning, IoTime, IoCheckmarkCircle 
} from 'react-icons/io5';
import CustomModal from './CustomModal';

function ReportsHub() {
  const [activeReport, setActiveReport] = useState('rides');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" });
  
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  // The Data Fetching Engine
  const generateData = async () => {
    if (!dateRange.start || !dateRange.end) {
        setModalState({ isOpen: true, title: "Missing Dates", message: "Please select both a Start Date and an End Date to generate a report.", type: "warning" });
        return null;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      let endpoint = '';
      let params = {};

      if (activeReport === 'rides') {
          endpoint = 'https://tricycheck-api.onrender.com/api/admin/reports';
          params = { filter: 'custom', startDate: dateRange.start, endDate: dateRange.end };
      } else if (activeReport === 'fleet') {
          endpoint = 'https://tricycheck-api.onrender.com/api/admin/drivers';
      } else if (activeReport === 'tickets') {
          endpoint = 'https://tricycheck-api.onrender.com/api/tickets';
      } else if (activeReport === 'audit') {
          endpoint = 'https://tricycheck-api.onrender.com/api/admin/activity-feed';
      }

      const response = await axios.get(endpoint, { ...config, params });
      
      // Date Filtering for endpoints that don't have native custom date backend queries yet
      let finalData = response.data;
      if (activeReport !== 'rides') {
          const startDate = new Date(dateRange.start);
          startDate.setHours(0,0,0,0);
          const endDate = new Date(dateRange.end);
          endDate.setHours(23,59,59,999);
          
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

  // CSV Generation
  const handleDownloadCSV = async () => {
    const data = await generateData();
    if (!data) return;

    let headers = [];
    let rows = [];

    if (activeReport === 'rides') {
        headers = ["Date", "Time", "Booking ID", "Passenger", "Driver", "Body No.", "Pickup Location", "Dropoff Location", "Fare (PHP)"];
        rows = data.map(r => [
            new Date(r.createdAt).toLocaleDateString(),
            new Date(r.createdAt).toLocaleTimeString(),
            r._id, `"${r.passengerName || 'Unknown'}"`, `"${r.driverName || 'Unknown'}"`, r.driverBodyNo || 'N/A',
            `"${r.pickupLocation}"`, `"${r.dropoffLocation}"`, r.fare
        ]);
    } else if (activeReport === 'fleet') {
        headers = ["Date Added", "Body No.", "Driver Name", "Phone", "Status", "TODA"];
        rows = data.map(d => [
            new Date(d.createdAt).toLocaleDateString(), d.bodyNo || 'N/A', `"${d.firstName} ${d.lastName}"`, d.phone, d.driverStatus, d.homeToda || 'Unassigned'
        ]);
    } else if (activeReport === 'tickets') {
        headers = ["Date Filed", "Ticket ID", "Complainant (Passenger)", "Passenger Contact", "Reported Driver", "Driver Contact", "Type", "Priority", "Status", "Description"];
        rows = data.map(t => [
            new Date(t.createdAt).toLocaleDateString(), 
            t._id, 
            `"${t.passengerId ? t.passengerId.firstName + ' ' + t.passengerId.lastName : 'Unknown'}"`, 
            `"${t.passengerId ? (t.passengerId.phone || '') + ' ' + (t.passengerId.email || '') : 'N/A'}"`,
            `"${t.driverId ? t.driverId.firstName + ' ' + t.driverId.lastName : 'None'}"`, 
            `"${t.driverId ? (t.driverId.bodyNo || 'N/A') + ' ' + (t.driverId.phone || '') : 'N/A'}"`,
            t.type, 
            t.priority, 
            t.status, 
            `"${t.description}"`
        ]);
    } else if (activeReport === 'audit') {
        headers = ["Date", "Time", "Admin", "Module", "Action", "Details"];
        rows = data.map(a => [
            new Date(a.createdAt).toLocaleDateString(), new Date(a.createdAt).toLocaleTimeString(),
            `"${a.adminName}"`, a.module, `"${a.action}"`, `"${a.details}"`
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

  // PDF / Print Generation
  const handlePrint = async () => {
    const data = await generateData();
    if (!data) return;

    const printWindow = window.open('', '_blank');
    let title = activeReport === 'rides' ? 'Completed Rides & Revenue' : 
                activeReport === 'fleet' ? 'Fleet Directory & Registration' : 
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
        html += `<th>Date & Time</th><th>Passenger</th><th>Driver (Body No)</th><th>Route</th><th>Fare</th></tr></thead><tbody>`;
        let totalFare = 0;
        data.forEach(r => {
            totalFare += Number(r.fare) || 0;
            const dateObj = new Date(r.createdAt);
            html += `<tr><td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</td><td>${r.passengerName || 'Unknown'}</td><td>${r.driverName || 'Unknown'} (${r.driverBodyNo || 'N/A'})</td><td>${r.pickupLocation} <b>&rarr;</b> ${r.dropoffLocation}</td><td>PHP ${r.fare}</td></tr>`;
        });
        html += `</tbody></table><div style="margin-top: 20px; font-size: 14px; font-weight: bold; text-align: right;">Total Estimated Fare Volume: PHP ${totalFare.toLocaleString()}</div>`;
    } 
    else if (activeReport === 'fleet') {
        html += `<th>Date Added</th><th>Body No</th><th>Driver Name</th><th>Status</th><th>TODA</th></tr></thead><tbody>`;
        data.forEach(d => {
            html += `<tr><td>${new Date(d.createdAt).toLocaleDateString()}</td><td>${d.bodyNo || 'N/A'}</td><td>${d.firstName} ${d.lastName}</td><td>${d.driverStatus}</td><td>${d.homeToda || 'Unassigned'}</td></tr>`;
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
                    <b>${t.passengerId ? t.passengerId.firstName + ' ' + t.passengerId.lastName : 'Unknown Passenger'}</b><br/>
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
                <td>
                    <b>${t.status}</b>
                </td>
              </tr>
            `;
        });
        html += `</tbody></table>`;
    }
    else if (activeReport === 'audit') {
        html += `<th>Date & Time</th><th>Admin</th><th>Module</th><th>Action</th><th>Details</th></tr></thead><tbody>`;
        data.forEach(a => {
            const dateObj = new Date(a.createdAt);
            html += `<tr><td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}</td><td>${a.adminName}</td><td>${a.module}</td><td>${a.action}</td><td>${a.details}</td></tr>`;
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
      { id: 'rides', name: 'Rides & Revenue', icon: <IoCarSport />, desc: 'Extract all completed passenger trips and fare totals.' },
      { id: 'fleet', name: 'Fleet Directory', icon: <IoPeople />, desc: 'Extract registered drivers, operators, and TODA lists.' },
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
          <p className="text-sm font-medium text-slate-500">Securely extract and print official POSO records.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-8 flex flex-col md:flex-row gap-8">
          
          {/* LEFT: REPORT SELECTION */}
          <div className="flex-1 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">1. Select Data Source</h3>
              {reportTypes.map(type => (
                  <button 
                      key={type.id}
                      onClick={() => setActiveReport(type.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center space-x-4 ${activeReport === type.id ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                  >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${activeReport === type.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                          {type.icon}
                      </div>
                      <div>
                          <h4 className={`font-black ${activeReport === type.id ? 'text-emerald-900' : 'text-slate-700'}`}>{type.name}</h4>
                          <p className={`text-[10px] font-bold mt-0.5 ${activeReport === type.id ? 'text-emerald-700' : 'text-slate-400'}`}>{type.desc}</p>
                      </div>
                      {activeReport === type.id && <IoCheckmarkCircle className="text-emerald-500 text-2xl ml-auto" />}
                  </button>
              ))}
          </div>

          {/* RIGHT: DATE FILTER & EXPORT */}
          <div className="flex-1 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">2. Time Filter & Export</h3>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-6 relative overflow-hidden">
                  <IoCalendar className="absolute -right-4 -bottom-4 text-8xl text-slate-200 opacity-50" />
                  <div className="relative z-10 space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
                          <input 
                              type="date" 
                              value={dateRange.start}
                              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 shadow-sm" 
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date</label>
                          <input 
                              type="date" 
                              value={dateRange.end}
                              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
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