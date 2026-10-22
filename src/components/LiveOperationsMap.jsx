import React, { useState, useEffect } from 'react';
import axios from 'axios'; // <-- ADDED: Database Connector
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'; // <-- ADDED: Circle for SOS Radar
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { IoWarning, IoSpeedometer, IoCarSport, IoFlash, IoClose } from 'react-icons/io5';
import { io } from 'socket.io-client'; // <-- ADD THIS IMPORT

// === THE FIX: LIVE OPERATIONAL STATUS ENGINE (REPLACES OBSOLETE TODA LEGEND) ===
const getStatusTheme = (status) => {
  if (status === 'On Trip') {
    return { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-800' };
  }
  return { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800' };
};

const getDynamicIcon = (status) => {
  const theme = getStatusTheme(status);
  const isBusy = status === 'On Trip';
  
  const html = `
    <div class="relative flex items-center justify-center w-10 h-10">
      ${isBusy ? `<span class="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${theme.bg}"></span>` : ''}
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-[3px] border-white shadow-lg ${theme.bg} z-10 text-white font-bold text-sm">
        <span style="display: inline-block; transform: scaleX(-1);">🛺</span>
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

  // === THE STRICT SATELLITE GPS ENGINE ===
  useEffect(() => {
    const socket = io('https://tricycheck-api.onrender.com');

    // 1. INITIAL IGNITION: Pull stats instantly
    const fetchRadarData = async () => {
       try {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
          
          // Securely fetch both Radar data and Fleet Stats simultaneously
          const [radarRes, statsRes] = await Promise.all([
             axios.get('https://tricycheck-api.onrender.com/api/admin/radar', { headers: { Authorization: `Bearer ${token}` } }),
             axios.get('https://tricycheck-api.onrender.com/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          // === THE FIX: PURGED THE BEEHIVE TERMINAL SCATTER ===
          // We no longer inject fake coordinates. The map will ONLY draw drivers 
          // who actively ping the WebSocket with military-grade GPS.
          
          // Clean up stale map markers for drivers who went offline
          const activeDbIds = new Set(radarRes.data.activeDrivers.map(d => d._id || d.id));
          setActiveDrivers(prev => prev.filter(d => activeDbIds.has(d.id)));

          // Update the dispatch panel numbers dynamically
          setStats({ 
             ...statsRes.data, 
             activeDrivers: radarRes.data.activeDrivers.length, 
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
            // === THE FIX: Tag them as 'isLive' so the 10-second poller leaves their GPS alone ===
            return prev.map(d => d.id === data.driverId ? { ...d, lat: data.lat, lng: data.lng, status: data.status || 'On Trip', isLive: true } : d);
        }
        return [...prev, { 
            id: data.driverId, bodyNo: data.bodyNo, name: data.driverName,
            status: data.status || 'On Trip', lat: data.lat, lng: data.lng, homeToda: data.homeToda || 'Unassigned', isLive: true
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
            
            {/* REAL DATABASE DRIVER PINS */}
            {filteredDrivers.map(driver => (
              <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={getDynamicIcon(driver.status)} eventHandlers={{ click: () => setSelectedDriver(driver) }}>
                <Popup>
                  <div className="text-center p-1">
                    <p className="font-black text-sm text-slate-900">Body No. {driver.bodyNo}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{driver.name}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 block ${driver.status === 'On Trip' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      ● {driver.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* SOS RADAR: Centers pulsating red beacon over active distress tickets */}
            {stats.activeTickets?.filter(t => t.priority === 'CRITICAL' && t.location?.lat).map(ticket => (
               <Marker 
                  key={ticket._id} 
                  position={[ticket.location.lat, ticket.location.lng]} 
                  icon={L.divIcon({
                      className: 'bg-transparent border-none',
                      html: `<div class="relative flex items-center justify-center w-24 h-24">
                               <span class="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-50 animate-ping"></span>
                               <div class="relative w-5 h-5 bg-red-600 rounded-full border-[3px] border-white shadow-[0_0_18px_rgba(220,38,38,0.9)] flex items-center justify-center text-[10px] text-white">🚨</div>
                             </div>`,
                      iconSize: [96, 96],
                      iconAnchor: [48, 48]
                  })}
               >
                  <Popup><span className="font-black text-xs text-red-600">🚨 CRITICAL SOS DISPATCH ACTIVE</span></Popup>
               </Marker>
            ))}
          </MapContainer>
        </div>
        
        {/* THE FIX: OPERATIONAL STATUS LEGEND */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Live Radar Legend</p>
           <div className="flex flex-col space-y-2 text-[11px] font-bold text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 shadow-sm"></span>
                <span>Available for Dispatch</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 shadow-sm"></span>
                <span>On Active Passenger Trip</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-white"></span>
                <span className="text-red-600 font-black">SOS Emergency Pulse</span>
              </div>
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
          <div className={`bg-white rounded-2xl shadow-sm border p-5 flex-1 relative animate-slide-in ${getStatusTheme(selectedDriver.status).border}`}>
             <button onClick={() => setSelectedDriver(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><IoClose className="text-xl" /></button>
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Target Acquired</h3>
             <div className="flex items-center space-x-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md ${getStatusTheme(selectedDriver.status).bg} text-white`}>
                   🛺
                </div>
                <div>
                   <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedDriver.name}</h2>
                   <p className="text-sm font-bold text-slate-500">Body No. {selectedDriver.bodyNo || 'N/A'}</p>
                   <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md mt-1 ${getStatusTheme(selectedDriver.status).badge}`}>
                      ● {selectedDriver.status}
                   </span>
                </div>
             </div>

             <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Coordinates</span>
                   <span className="font-mono text-xs font-bold text-slate-700">
                     {Number(selectedDriver.lat).toFixed(4)}, {Number(selectedDriver.lng).toFixed(4)}
                   </span>
                </div>

                {/* THE FIX: 1-CLICK FLEET DIRECTORY TELEPORTER */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('teleportDriverId', selectedDriver.id);
                    window.dispatchEvent(new CustomEvent('fleetTeleport'));
                    window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'fleet' }));
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <IoCarSport className="text-base" />
                  <span>Inspect Full Personnel File</span>
                </button>
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex-1 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
              <IoFlash className="mr-1.5 text-amber-500 text-sm" /> Live Incident & Dispatch Feed
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
               
               {/* Maps Active SOS & Support Tickets as Clickable Operational Alerts */}
               {stats.activeTickets?.map(ticket => {
                  const reporterName = ticket.passengerId?.firstName 
                    ? `${ticket.passengerId.firstName} ${ticket.passengerId.lastName || ''}` 
                    : ticket.driverId?.firstName 
                    ? `Driver ${ticket.driverId.firstName} (Body #${ticket.driverId.bodyNo || 'N/A'})` 
                    : 'Commuter / Driver';

                  return (
                    <div 
                      key={ticket._id} 
                      onClick={() => window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'tickets' }))}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex space-x-3 items-start ${
                        ticket.priority === 'CRITICAL' 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100/70' 
                          : 'bg-slate-50 border-slate-200/80 hover:bg-emerald-50/60 hover:border-emerald-200'
                      }`}
                      title="Click to open in Support & Mediation Desk"
                    >
                       <div className={`w-2.5 h-2.5 mt-1 rounded-full shrink-0 ${ticket.priority === 'CRITICAL' ? 'bg-red-600 animate-ping' : 'bg-amber-500'}`}></div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={`text-xs font-black uppercase tracking-wider truncate ${ticket.priority === 'CRITICAL' ? 'text-red-700' : 'text-slate-800'}`}>
                               {ticket.priority === 'CRITICAL' ? '🚨 SOS Emergency Pulse' : ticket.type}
                            </p>
                            <span className="text-[9px] font-black text-emerald-700 uppercase ml-2 shrink-0">Open &rarr;</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5 truncate">
                            Reported by: {reporterName}
                          </p>
                       </div>
                    </div>
                  );
               })}
               
               <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex space-x-3 items-start">
                  <div className="w-2.5 h-2.5 mt-1 rounded-full bg-emerald-500 shrink-0"></div>
                  <div>
                     <p className="text-xs font-black text-emerald-950 leading-tight">POSO Radar Synchronized</p>
                     <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                       {stats.activeDrivers} driver(s) online in fleet • {activeDrivers.length} streaming live GPS.
                     </p>
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