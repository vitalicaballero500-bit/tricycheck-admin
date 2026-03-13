import React, { useState, useEffect } from 'react';
import axios from 'axios'; // <-- ADDED: Database Connector
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'; // <-- ADDED: Circle for SOS Radar
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { IoWarning, IoSpeedometer, IoCarSport, IoFlash, IoClose } from 'react-icons/io5';

// === DYNAMIC COLOR CODING ENGINE ===
const getTodaColor = (toda) => {
  switch (toda) {
    case 'Calasiao Plaza TODA': return { bg: 'bg-red-500', shadow: 'shadow-red-500/50', border: 'border-red-600' };
    case 'Bued TODA': return { bg: 'bg-green-500', shadow: 'shadow-green-500/50', border: 'border-green-600' };
    case 'San Miguel TODA': return { bg: 'bg-blue-500', shadow: 'shadow-blue-500/50', border: 'border-blue-600' };
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

  // === THE HYBRID ENGINE (Database + Simulation) ===
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // 1. Fetch live fleet stats and SOS tickets
        const statsRes = await axios.get('https://tricycheck-api.onrender.com/api/admin/stats');
        setStats(statsRes.data);

        // 2. Fetch REAL drivers from MongoDB
        const driversRes = await axios.get('https://tricycheck-api.onrender.com/api/admin/drivers');
        const realActiveDrivers = driversRes.data.filter(d => d.driverStatus === 'Active');

        // 3. Map real drivers onto the radar
        setActiveDrivers(prev => {
          return realActiveDrivers.map(d => {
            const existing = prev.find(p => p.id === d._id);
            if (existing) return existing; // If already on map, keep them moving

            return {
              id: d._id,
              bodyNo: d.bodyNo || 'N/A',
              name: `${d.firstName} ${d.lastName}`,
              status: Math.random() > 0.5 ? 'Available' : 'On Trip', // Mock status for visual effect
              speed: Math.floor(Math.random() * 20 + 10) + ' km/h',
              // Spawn them randomly around Calasiao Plaza
              lat: 16.0089 + (Math.random() - 0.5) * 0.02,
              lng: 120.3572 + (Math.random() - 0.5) * 0.02,
              homeToda: d.homeToda || 'Unassigned'
            };
          });
        });
      } catch (error) {
        console.error("Map Sync Error:", error);
      }
    };

    fetchLiveData();
    const fetchInterval = setInterval(fetchLiveData, 3000); // Fast-sync every 3 seconds

    // 4. GPS Simulator Engine (Moves the pins every 2 seconds)
    const moveInterval = setInterval(() => {
      setActiveDrivers(prev => prev.map(driver => ({
        ...driver,
        lat: driver.lat + (Math.random() - 0.5) * 0.0006,
        lng: driver.lng + (Math.random() - 0.5) * 0.0006,
      })));
    }, 2000);

    return () => { clearInterval(fetchInterval); clearInterval(moveInterval); };
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
            <h3 className="font-black text-slate-800 tracking-tight">LIVE GPS TRACKING</h3>
          </div>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            {['All', 'Available', 'On Trip'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-white text-posoDark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 block ${driver.status === 'Available' ? 'text-green-600' : 'text-blue-600'}`}>{driver.status}</span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 🚨 SOS RADAR: Draws a red zone over active emergencies */}
            {stats.activeTickets?.filter(t => t.priority === 'CRITICAL' && t.location?.lat).map(ticket => (
              <Circle 
                key={ticket._id} 
                center={[ticket.location.lat, ticket.location.lng]} 
                radius={30} // 400 meter search radius
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3, dashArray: '10, 10' }} 
              />
            ))}
          </MapContainer>
        </div>
        
        {/* MAP LEGEND */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-100">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">TODA Color Legend</p>
           <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-600">
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Calasiao Plaza</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Bued</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>San Miguel</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-yellow-400"></div><span>Robinsons</span></div>
           </div>
        </div>
      </div>

      {/* === RIGHT: THE DISPATCH PANEL === */}
      <div className="w-full lg:w-80 flex flex-col space-y-6 shrink-0 z-10">
        
        {/* DATABASE-CONNECTED STATS */}
        <div className="bg-posoDark text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
           <div className="absolute -right-6 -top-6 text-slate-700/30"><IoSpeedometer className="text-9xl" /></div>
           <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 relative z-10">Live Fleet Status</h3>
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                 <p className="text-3xl font-black">{stats.activeDrivers}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase">Drivers Ready</p>
              </div>
              <div>
                 <p className="text-3xl font-black text-angkasBlue">{stats.activeRides}</p>
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
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Current Speed</span><span className="font-mono font-bold text-slate-800">{selectedDriver.speed}</span></div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Status</span><span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${selectedDriver.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedDriver.status}</span></div>
             </div>
             <button className="w-full mt-6 bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"><IoWarning /> <span>Send Alert to Driver</span></button>
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
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
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