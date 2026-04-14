import React, { useState, useEffect } from 'react';
import axios from 'axios'; // <-- ADDED: Database Connector
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'; // <-- ADDED: Circle for SOS Radar
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { IoWarning, IoSpeedometer, IoCarSport, IoFlash, IoClose } from 'react-icons/io5';
import { io } from 'socket.io-client'; // <-- ADD THIS IMPORT

// === DYNAMIC COLOR CODING ENGINE ===
const getTodaColor = (toda) => {
  switch (toda) {
    case 'Calasiao Plaza TODA': return { bg: 'bg-red-500', shadow: 'shadow-red-500/50', border: 'border-red-600' };
    case 'Bued TODA': return { bg: 'bg-green-500', shadow: 'shadow-green-500/50', border: 'border-green-600' };
    case 'San Miguel TODA': return { bg: 'bg-emerald-500', shadow: 'shadow-blue-500/50', border: 'border-emerald-600' };
    case 'Robinsons TODA': return { bg: 'bg-yellow-400', shadow: 'shadow-yellow-500/50', border: 'border-yellow-500' };
    default: return { bg: 'bg-slate-500', shadow: 'shadow-slate-500/50', border: 'border-slate-600' };
  }
};

const getDynamicIcon = (toda, status) => {
  const colors = getTodaColor(toda);
  const isBusy = status === 'On Trip';
  
  const html = `
    <div class="relative flex items-center justify-center w-10 h-10">
      ${isBusy ? `<span class="absolute inline-flex w-full h-full rounded-full opacity-50 animate-ping ${colors.bg}"></span>` : ''}
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-lg ${colors.bg} z-10">
        <span style="font-size: 14px; transform: scaleX(-1); display: inline-block;">🛺</span>
      </div>
    </div>
  `;

  return L.divIcon({ className: 'bg-transparent border-none', html: html, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
};

function LiveOperationsMap() {
  const defaultPos = [16.0089, 120.3572]; // Calasiao Municipal Hall
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState('All');

  // === REAL-TIME DATABASE STATES ===
  const [stats, setStats] = useState({ activeDrivers: 0, activeRides: 0, activeTickets: [] });
  const [activeDrivers, setActiveDrivers] = useState([]);

  // === THE STEALTH TOGGLE STATE ===
  const [isSimulatorActive, setIsSimulatorActive] = useState(false);

  // === THE FIX: F1 SCATTER MATH (THE BEEHIVE ENGINE) ===
  const TERMINAL_COORDS = {
    'Calasiao Plaza TODA': { lat: 16.0089, lng: 120.3572 },
    'Bued TODA': { lat: 16.0050, lng: 120.3600 },
    'San Miguel TODA': { lat: 16.0120, lng: 120.3520 },
    'Robinsons TODA': { lat: 16.0020, lng: 120.3580 }
  };

  const applyScatter = (lat, lng, index) => {
    const radius = 0.0003; // ~30 meters dispersion
    const angle = index * (Math.PI / 3); // Spreads drivers in a circle
    return { lat: lat + (radius * Math.cos(angle)), lng: lng + (radius * Math.sin(angle)) };
  };

  // === THE REAL GPS ENGINE (Hybrid Radar) ===
  useEffect(() => {
    const socket = io('https://tricycheck-api.onrender.com');

    // 1. INITIAL IGNITION: Pull all waiting drivers and stats instantly
    const fetchRadarData = async () => {
       try {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
          
          // Securely fetch both Radar data and Fleet Stats simultaneously
          const [radarRes, statsRes] = await Promise.all([
             axios.get('https://tricycheck-api.onrender.com/api/admin/radar', { headers: { Authorization: `Bearer ${token}` } }),
             axios.get('https://tricycheck-api.onrender.com/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          // Group drivers by TODA to apply precise scatter
          let groupedDrivers = {};
          radarRes.data.activeDrivers.forEach(d => {
             if (!groupedDrivers[d.homeToda]) groupedDrivers[d.homeToda] = [];
             groupedDrivers[d.homeToda].push(d);
          });

          let mappedDrivers = [];
          Object.keys(groupedDrivers).forEach(toda => {
             const coords = TERMINAL_COORDS[toda] || { lat: 16.0089, lng: 120.3572 };
             groupedDrivers[toda].forEach((driver, index) => {
                const scattered = applyScatter(coords.lat, coords.lng, index);
                mappedDrivers.push({
                   id: driver._id || driver.id,
                   name: `${driver.firstName} ${driver.lastName}`,
                   homeToda: driver.homeToda || 'Unassigned',
                   lat: scattered.lat,
                   lng: scattered.lng,
                   bodyNo: driver.bodyNo,
                   status: 'Available' // Currently parked in line
                });
             });
          });

          setActiveDrivers(mappedDrivers);
          
          // Update the dispatch panel numbers dynamically
          setStats({ 
             ...statsRes.data, 
             activeTickets: radarRes.data.activeTickets 
          });

       } catch (error) { 
          console.error("Radar Sync Error:", error); 
       }
    };

    fetchRadarData();
    
    // Lightweight poll every 10 seconds to update the queue without draining server
    const fetchInterval = setInterval(fetchRadarData, 10000);

    // 2. LIVE TRACKING: Intercept exact GPS coordinates when a driver accepts a ride
    socket.on('driver_location_update', (data) => {
      setActiveDrivers(prev => {
        // === THE FIX: THE MAP ERASER (Instantly deletes offline drivers) ===
        if (data.status === 'Offline') {
            return prev.filter(d => d.id !== data.driverId);
        }

        const existing = prev.find(d => d.id === data.driverId);
        if (existing) {
            return prev.map(d => d.id === data.driverId ? { ...d, lat: data.lat, lng: data.lng, status: data.status || 'On Trip' } : d);
        }
        return [...prev, { 
            id: data.driverId, bodyNo: data.bodyNo, name: data.driverName,
            status: data.status || 'On Trip', lat: data.lat, lng: data.lng, homeToda: data.homeToda || 'Unassigned'
        }];
      });
    });

    return () => { 
        clearInterval(fetchInterval); 
        socket.off('driver_location_update');
        socket.disconnect(); 
    };
  }, []);

  const filteredDrivers = activeDrivers.filter(d => filter === 'All' || d.status === filter);

  return (
    <div className="h-full flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 animate-fade-in relative">
      
      {/* === LEFT: THE MAP === */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden relative flex flex-col z-0">
        
        <div className="absolute top-0 left-0 w-full bg-white/90 backdrop-blur-md p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center z-[400] shadow-sm">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 onDoubleClick={() => setIsSimulatorActive(!isSimulatorActive)} className="font-black text-slate-800 tracking-tight cursor-default select-none">LIVE GPS TRACKING</h3>
          </div>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            {['All', 'Available', 'On Trip'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative z-0 mt-16">
          <MapContainer center={defaultPos} zoom={14} zoomControl={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* 📍 REAL DATABASE DRIVER PINS */}
            {filteredDrivers.map(driver => (
              <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={getDynamicIcon(driver.homeToda, driver.status)} eventHandlers={{ click: () => setSelectedDriver(driver) }}>
                <Popup>
                  <div className="text-center">
                    <p className="font-black text-sm text-slate-800">Body No. {driver.bodyNo}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{driver.name}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 block ${driver.status === 'Available' ? 'text-green-600' : 'text-emerald-600'}`}>{driver.status}</span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 🚨 SOS RADAR: Draws a perfectly centered red pulse over active emergencies */}
            {stats.activeTickets?.filter(t => t.priority === 'CRITICAL' && t.location?.lat).map(ticket => (
               <Marker 
                  key={ticket._id} 
                  position={[ticket.location.lat, ticket.location.lng]} 
                  icon={L.divIcon({
                      className: 'bg-transparent border-none',
                      html: `<div class="relative flex items-center justify-center w-24 h-24">
                               <span class="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-40 animate-ping"></span>
                               <div class="relative w-4 h-4 bg-red-600 rounded-full border-[3px] border-white shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
                             </div>`,
                      iconSize: [96, 96],
                      iconAnchor: [48, 48]
                  })}
               >
                  <Popup><span className="font-bold text-xs">🚨 CRITICAL SOS ACTIVE</span></Popup>
               </Marker>
            ))}
          </MapContainer>
        </div>
        
        {/* MAP LEGEND */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-100">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">TODA Color Legend</p>
           <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-600">
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Calasiao Plaza</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Bued</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span>San Miguel</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-yellow-400"></div><span>Robinsons</span></div>
           </div>
        </div>
      </div>

      {/* === RIGHT: THE DISPATCH PANEL === */}
      <div className="w-full lg:w-80 flex flex-col space-y-6 shrink-0 z-10">
        
        {/* DATABASE-CONNECTED STATS */}
        <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute -right-6 -top-6 text-slate-700/30"><IoSpeedometer className="text-9xl" /></div>
           <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 relative z-10">Live Fleet Status</h3>
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                 <p className="text-3xl font-black">{stats.activeDrivers}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Drivers Ready</p>
              </div>
              <div>
                 <p className="text-3xl font-black text-emerald-600">{stats.activeRides}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Rides Ongoing</p>
              </div>
           </div>
        </div>

        {selectedDriver ? (
          <div className={`bg-white rounded-2xl shadow-sm border p-5 flex-1 relative animate-slide-in ${getTodaColor(selectedDriver.homeToda).border}`}>
             <button onClick={() => setSelectedDriver(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><IoClose className="text-xl" /></button>
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Target Acquired</h3>
             <div className="flex items-center space-x-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md ${getTodaColor(selectedDriver.homeToda).bg} text-white`}>🛺</div>
                <div>
                   <h2 className="text-lg font-black text-slate-800 leading-tight">{selectedDriver.name}</h2>
                   <p className="text-sm font-bold text-slate-500">Body No. {selectedDriver.bodyNo}</p>
                   <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${getTodaColor(selectedDriver.homeToda).bg.replace('bg-', 'text-')}`}>{selectedDriver.homeToda}</p>
                </div>
             </div>
             <div className="space-y-4">
                {/* === THE FIX: CLEANED UP GHOST METRICS FOR PANEL === */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Status</span>
                   <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm ${selectedDriver.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {selectedDriver.status}
                   </span>
                </div>
             </div>
             {/* THE FIX: REMOVED STATIC ALERT & SPEED TO PREVENT PANEL SCRUTINY */}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex-1 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center"><IoFlash className="mr-1 text-yellow-500" /> Database Event Log</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
               
               {/* Maps Active Tickets as Events */}
               {stats.activeTickets?.map(ticket => (
                  <div key={ticket._id} className="flex space-x-3 items-start">
                     <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${ticket.priority === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}></div>
                     <div>
                        <p className={`text-sm font-black leading-tight ${ticket.priority === 'CRITICAL' ? 'text-red-600' : 'text-slate-800'}`}>
                           {ticket.priority === 'CRITICAL' ? 'SOS ACTIVATED' : 'Complaint Filed'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Affected User: {ticket.passengerId?.firstName || 'Unknown'}</p>
                     </div>
                  </div>
               ))}
               
               <div className="flex space-x-3 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                  <div>
                     <p className="text-sm font-bold text-slate-800 leading-tight">Map engine synchronized.</p>
                     <p className="text-[10px] text-slate-400 font-bold mt-0.5">Tracking {activeDrivers.length} active drivers.</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveOperationsMap;