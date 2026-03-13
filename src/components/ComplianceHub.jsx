import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoWarning, IoAlertCircle, IoCall, IoCheckmarkCircle, IoDocumentText } from 'react-icons/io5';

function ComplianceHub() {
  const [atRiskDrivers, setAtRiskDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComplianceData = async () => {
    try {
      const response = await axios.get('https://tricycheck-api.onrender.com/api/admin/compliance');
      setAtRiskDrivers(response.data);
    } catch (error) {
      console.error("Failed to fetch compliance data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

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

  // Sort drivers into their respective zones
  const criticalDrivers = atRiskDrivers.filter(d => evaluateDocuments(d).status === 'critical');
  const warningDrivers = atRiskDrivers.filter(d => evaluateDocuments(d).status === 'warning');

  return (
    <div className="h-full flex flex-col animate-fade-in relative max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <IoDocumentText className="text-angkasBlue mr-2" /> Compliance Hub
          </h2>
          <p className="text-sm font-medium text-slate-500">Proactive LGU enforcement for expiring driver credentials.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse">
          Scanning LGU Database...
        </div>
      ) : atRiskDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-10 flex flex-col items-center justify-center h-[50vh]">
          <IoCheckmarkCircle className="text-7xl text-green-400 mb-4" />
          <h3 className="text-xl font-black text-slate-700">All Fleet Compliant</h3>
          <p className="text-slate-500 font-medium">No drivers have missing or expiring documents.</p>
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
                      <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center font-black text-lg">
                        {driver.bodyNo || 'N/A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{driver.firstName} {driver.lastName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          {evaluateDocuments(driver).issues.map((issue, idx) => (
                            <span key={idx} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{issue}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <a href={`tel:${driver.phone}`} className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
                      <IoCall /> <span>{driver.phone}</span>
                    </a>
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
                      <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center font-black text-lg">
                        {driver.bodyNo || 'N/A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{driver.firstName} {driver.lastName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          {evaluateDocuments(driver).issues.map((issue, idx) => (
                            <span key={idx} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{issue}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <a href={`tel:${driver.phone}`} className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
                      <IoCall /> <span>{driver.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default ComplianceHub;