import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IoWarning, IoAlertCircle, IoCheckmarkCircle, 
  IoDocumentText, IoMail, IoEye, IoRefresh 
} from 'react-icons/io5';
import CustomModal from './CustomModal';

function ComplianceHub() {
  const [atRiskDrivers, setAtRiskDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkSending, setBulkSending] = useState(false);

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/compliance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Double-Shield: Only evaluate approved fleet drivers (exclude Pending or Rejected applicants)
      const verifiedOnly = (response.data || []).filter(
        d => d.driverStatus !== 'Pending' && d.driverStatus !== 'Rejected'
      );
      setAtRiskDrivers(verifiedOnly);
    } catch (error) {
      console.error("Failed to fetch compliance data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const sendWarningEmail = async (driverId) => {
    setModalState({ isOpen: true, title: "Dispatching...", message: "Sending official LGU warning email...", type: "info", isConfirm: false });
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${driverId}/inform`, { 
        adminId: adminUser._id || adminUser.id 
      }, { headers: { Authorization: `Bearer ${token}` }});
      
      setModalState({ isOpen: true, title: "Warning Sent", message: "Official LGU warning email successfully dispatched to driver.", type: "success" });
    } catch (error) {
      setModalState({ isOpen: true, title: "Dispatch Failed", message: error.response?.data?.error || "Driver missing email or connection failed.", type: "warning" });
    }
  };

  // === 1-CLICK BULK WARNING DISPATCHER ===
  const sendBulkWarnings = async (targetList) => {
    if (!targetList || targetList.length === 0) return;
    setBulkSending(true);
    setModalState({ 
      isOpen: true, 
      title: "Bulk Dispatch Active...", 
      message: `Transmitting official LGU citations to ${targetList.length} flagged driver(s)...`, 
      type: "info" 
    });

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    let sentCount = 0;
    let failCount = 0;

    for (const driver of targetList) {
      try {
        await axios.post(`https://tricycheck-api.onrender.com/api/admin/drivers/${driver._id}/inform`, { 
          adminId: adminUser._id || adminUser.id 
        }, { headers: { Authorization: `Bearer ${token}` }});
        sentCount++;
      } catch (e) {
        failCount++;
      }
    }

    setBulkSending(false);
    setModalState({
      isOpen: true,
      title: "Bulk Citation Complete",
      message: `Successfully emailed ${sentCount} driver(s).${failCount > 0 ? `\n(${failCount} skipped due to missing email).` : ''}`,
      type: sentCount > 0 ? "success" : "warning"
    });
  };

  // === TELEPORT TO FLEET DIRECTORY ===
  const inspectInFleet = () => {
    window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'fleet' }));
  };

  // === THE COMPLIANCE MATH ENGINE ===
  const evaluateDocuments = (driver) => {
    const today = new Date();
    const docs = [
      { name: "Driver's License", date: driver.licenseExpiry },
      { name: "OR/CR", date: driver.orCrExpiry },
      { name: "Franchise Permit", date: driver.franchisePermitExpiry }
    ];

    let status = 'safe'; // safe, warning, critical
    let issues = [];

    docs.forEach(doc => {
      if (!doc.date) {
        status = 'critical';
        issues.push(`${doc.name} (Missing)`);
      } else {
        const expiry = new Date(doc.date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          status = 'critical';
          issues.push(`${doc.name} (Expired)`);
        } else if (daysLeft <= 30) {
          if (status !== 'critical') status = 'warning';
          issues.push(`${doc.name} (${daysLeft} days left)`);
        }
      }
    });

    return { status, issues };
  };

  const criticalDrivers = atRiskDrivers.filter(d => evaluateDocuments(d).status === 'critical');
  const warningDrivers = atRiskDrivers.filter(d => evaluateDocuments(d).status === 'warning');
  const allFlagged = [...criticalDrivers, ...warningDrivers];

  return (
    <div className="h-full flex flex-col animate-fade-in relative max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoDocumentText className="text-emerald-600 mr-2" /> Compliance Hub
          </h2>
          <p className="text-sm font-medium text-slate-500">Proactive LGU enforcement for expiring credentials of verified fleet drivers.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchComplianceData}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs flex items-center space-x-1.5 hover:bg-slate-50 shadow-sm"
          >
            <IoRefresh className={loading ? "animate-spin text-emerald-600" : ""} />
            <span>Sync</span>
          </button>

          {allFlagged.length > 0 && (
            <button 
              onClick={() => sendBulkWarnings(allFlagged)}
              disabled={bulkSending}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              <IoMail className="text-base" />
              <span>{bulkSending ? "Dispatching..." : `Email All Flagged (${allFlagged.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse">
          Scanning LGU Database...
        </div>
      ) : allFlagged.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-10 flex flex-col items-center justify-center h-[50vh]">
          <IoCheckmarkCircle className="text-7xl text-green-400 mb-4" />
          <h3 className="text-xl font-black text-slate-700">All Verified Fleet Compliant</h3>
          <p className="text-slate-500 font-medium">No active drivers have missing or expiring documents.</p>
        </div>
      ) : (
        <div className="space-y-8 overflow-y-auto pb-10">
          
          {/* === RED ZONE: CRITICAL / EXPIRED === */}
          {criticalDrivers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
              <div className="bg-red-50 p-4 border-b border-red-100 flex items-center space-x-2">
                <IoAlertCircle className="text-red-500 text-xl animate-pulse" />
                <h3 className="font-black text-red-700 uppercase tracking-widest text-sm">Critical Zone (Expired / Missing)</h3>
                <span className="ml-auto bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">{criticalDrivers.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {criticalDrivers.map(driver => (
                  <div key={driver._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                        {driver.bodyNo || 'N/A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{driver.firstName} {driver.lastName}</h4>
                        <p className="text-[11px] font-mono text-slate-400">{driver.phone} • {driver.email || 'No Email'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {evaluateDocuments(driver).issues.map((issue, idx) => (
                            <span key={idx} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{issue}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={inspectInFleet} 
                        className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors"
                        title="Open Fleet Directory to update renewed dates"
                      >
                        <IoEye className="text-base" /> <span>Fleet File</span>
                      </button>
                      <button 
                        onClick={() => sendWarningEmail(driver._id)} 
                        className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm border border-red-100 active:scale-95"
                      >
                        <IoMail className="text-base" /> <span>Send Warning</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === YELLOW ZONE: WARNING / EXPIRING SOON === */}
          {warningDrivers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
              <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center space-x-2">
                <IoWarning className="text-orange-500 text-xl" />
                <h3 className="font-black text-orange-700 uppercase tracking-widest text-sm">Warning Zone (Expiring &le; 30 Days)</h3>
                <span className="ml-auto bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">{warningDrivers.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {warningDrivers.map(driver => (
                  <div key={driver._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                        {driver.bodyNo || 'N/A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{driver.firstName} {driver.lastName}</h4>
                        <p className="text-[11px] font-mono text-slate-400">{driver.phone} • {driver.email || 'No Email'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {evaluateDocuments(driver).issues.map((issue, idx) => (
                            <span key={idx} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{issue}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={inspectInFleet} 
                        className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors"
                      >
                        <IoEye className="text-base" /> <span>Fleet File</span>
                      </button>
                      <button 
                        onClick={() => sendWarningEmail(driver._id)} 
                        className="flex items-center space-x-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm border border-orange-200 active:scale-95"
                      >
                        <IoMail className="text-base" /> <span>Send Warning</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={closeModal}
        onCancel={null}
      />
    </div>
  );
}

export default ComplianceHub;