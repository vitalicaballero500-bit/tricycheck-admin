// === THE FIX: COMPLETE SWITCHBOARD & RADAR REWRITE ===
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <-- THE TELEPORTER
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // === THE FIX: Required for Custom HTML Radar ===
import { 
  IoWarning, IoCheckmarkCircle, IoTime, IoShieldHalf, 
  IoLocationSharp, IoClose, IoFlash, IoPerson, IoMegaphone, IoArrowForward
} from 'react-icons/io5';
import CustomModal from './CustomModal'; 

function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // === THE FIX: SEARCH & STATUS FILTER STATE ===
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' }); // <-- INJECTED DATE STATE
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dispatchPrompt, setDispatchPrompt] = useState({ isOpen: false, ticketId: null, unitName: '' });
  const [manualBodyNo, setManualBodyNo] = useState('');
  const [linkingDriver, setLinkingDriver] = useState(false);

  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "success", isConfirm: false });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/tickets', {
          headers: { Authorization: `Bearer ${token}` } 
      });
      const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTickets(sorted);
      
      setSelectedTicket(prev => {
        if (!prev) return null;
        return sorted.find(t => t._id === prev._id) || prev;
      });
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchTickets(); 
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const executeStatusUpdate = async (id, newStatus, dispatchUnit = '') => {
    try {
      // Ensure we don't accidentally wipe out an existing dispatchUnit during resolution
      const currentTicket = tickets.find(t => t._id === id);
      const finalDispatchUnit = dispatchUnit || (currentTicket ? currentTicket.dispatchUnit : '');

      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus, dispatchUnit: finalDispatchUnit } : t));
      
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.put(`https://tricycheck-api.onrender.com/api/tickets/${id}`, { 
          status: newStatus, 
          dispatchUnit: finalDispatchUnit,
          adminId: adminUser._id || adminUser.id
      }, {
          headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchTickets();
      if (newStatus === 'Resolved') {
          setModalState({ isOpen: true, title: "Case Closed", message: "Automated LGU resolution email has been successfully dispatched to the passenger.", type: "success" });
      }
    } catch (error) {
      fetchTickets(); 
      setModalState({ isOpen: true, title: "Sync Error", message: "Failed to update ticket status on the server.", type: "warning" });
    }
  };

  const getPriorityColor = (priority) => {
      if (priority === 'CRITICAL') return 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]';
      if (priority === 'High') return 'bg-orange-500 text-white';
      if (priority === 'Medium') return 'bg-yellow-400 text-yellow-900';
      return 'bg-emerald-400 text-emerald-900';
  };
// === THE FIX: TRI-FILTERING & SORTING ENGINE (NOW WITH DATES) ===
  const filteredTickets = tickets.filter(ticket => {
     // Check 1: Deep Text Search
     const searchString = `${ticket._id} ${ticket.type} ${ticket.description} ${ticket.passengerId?.firstName || ''} ${ticket.passengerId?.lastName || ''}`.toLowerCase();
     const matchesSearch = searchString.includes(searchTerm.toLowerCase());
     
     // Check 2: Status Dropdown
     const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
     
     // Check 3: Date Filter
     let matchesDate = true;
     if (dateFilter.start && dateFilter.end) {
         const tDate = new Date(ticket.createdAt);
         const sDate = new Date(dateFilter.start);
         sDate.setHours(0, 0, 0, 0);
         const eDate = new Date(dateFilter.end);
         eDate.setHours(23, 59, 59, 999);
         matchesDate = tDate >= sDate && tDate <= eDate;
     }
     
     return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
     if (sortOrder === 'Newest') return new Date(b.createdAt) - new Date(a.createdAt);
     return new Date(a.createdAt) - new Date(b.createdAt);
  });
  return (
    <div className="h-full flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 animate-fade-in relative">
      
      {/* === LEFT: THE INBOX === */}
      <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col shrink-0 z-10">
         {/* === THE FIX: ADVANCED FILTER HEADER === */}
         <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-4">
                <div>
                   <h2 className="text-xl font-black text-slate-800 flex items-center"><IoMegaphone className="mr-2 text-emerald-600"/> Switchboard</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Dispatches</p>
                </div>
                <button onClick={fetchTickets} disabled={loading} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm hover:bg-slate-100 transition-colors disabled:opacity-50" title="Sync Feed">
                    <IoTime className={`text-lg ${loading ? 'animate-spin text-emerald-600' : ''}`}/>
                </button>
            </div>
            
            <div className="flex flex-col space-y-3">
                <div className="flex space-x-2">
                    <select 
                        className="w-[100px] px-2 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Dismissed">Dismissed</option>
                    </select>
                    <select 
                        className="w-[100px] px-2 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="Newest">Newest First</option>
                        <option value="Oldest">Oldest First</option>
                    </select>
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Search IDs or Passengers..." 
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold shadow-sm" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>
                {/* === THE FIX: INJECTED DATE FILTER UI === */}
                <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <input 
                        type="date" 
                        className="flex-1 px-2 py-1.5 bg-transparent outline-none text-[11px] font-bold text-slate-600 cursor-pointer"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                    />
                    <span className="text-slate-300 text-xs font-black">-</span>
                    <input 
                        type="date" 
                        className="flex-1 px-2 py-1.5 bg-transparent outline-none text-[11px] font-bold text-slate-600 cursor-pointer"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                    />
                    {(dateFilter.start || dateFilter.end) && (
                        <button 
                            onClick={() => setDateFilter({ start: '', end: '' })} 
                            className="px-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Clear Dates"
                        >
                            <IoClose className="text-sm" />
                        </button>
                    )}
                </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
                <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Syncing Encrypted Feed...</div>
            ) : filteredTickets.length === 0 ?
(
                <div className="p-10 text-center text-slate-400 font-bold">No tickets found matching your search filters.</div>
            ) : (
                filteredTickets.map(ticket => (
                   <div 
                      key={ticket._id} 
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-5 cursor-pointer transition-colors relative border-l-4 ${selectedTicket?._id === ticket._id ? 'bg-emerald-50 border-l-emerald-600' : 'hover:bg-slate-50 border-l-transparent'}`}
                   >
                      <div className="flex justify-between items-start mb-2">
                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority} 
                         </span>
                         <span className="text-[10px] font-bold text-slate-400">
                            {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                      <h4 className="font-black text-slate-800 text-sm leading-tight mb-1 truncate">{ticket.type}</h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 mb-2">{ticket.description}</p>
                      
                      <div className="flex justify-between items-center">
                         <span className={`text-[10px] font-black uppercase tracking-wider ${ticket.status === 'Resolved' ? 'text-green-500' : ticket.status === 'In Progress' ? 'text-blue-500' : 'text-orange-500'}`}>
                            ● {ticket.status}
                         </span>
                         <IoArrowForward className={`text-lg transition-transform ${selectedTicket?._id === ticket._id ? 'text-emerald-600 translate-x-1' : 'text-slate-300'}`} />
                      </div>
                   </div>
                ))
            )}
         </div>
      </div>

      {/* === RIGHT: THE RADAR & TICKET VIEWER === */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden relative flex flex-col z-0">
         {selectedTicket ? (
            <div className="flex flex-col h-full animate-slide-in">
               
               {/* RADAR MAP (Only shows if coordinates exist) */}
               {selectedTicket.location && selectedTicket.location.lat ? (
                  <div className="h-64 bg-slate-100 border-b border-slate-200 relative shrink-0 z-0">
                     <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Live SOS Radar</span>
                     </div>
                     <MapContainer center={[selectedTicket.location.lat, selectedTicket.location.lng]} zoom={16} zoomControl={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {/* === THE FIX: PERFECTLY CENTERED HTML SNIPER RADAR === */}
                        <Marker 
                           position={[selectedTicket.location.lat, selectedTicket.location.lng]}
                           icon={L.divIcon({
                              className: 'bg-transparent border-none',
                              html: `<div class="relative flex items-center justify-center w-20 h-20">
                                       <span class="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-40 animate-ping"></span>
                                       <div class="relative w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
                                     </div>`,
                              iconSize: [80, 80],
                              iconAnchor: [40, 40]
                           })}
                        >
                           <Popup><span className="font-bold text-xs">Exact Distress Coordinates</span></Popup>
                        </Marker>
                     </MapContainer>
                  </div>
               ) : (
                  <div className="h-20 bg-slate-100 border-b border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                     <IoLocationSharp className="mr-1 text-lg" /> No GPS Coordinates Provided
                  </div>
               )}

               {/* TICKET DETAILS */}
               <div className="flex-1 overflow-y-auto p-8 bg-white relative z-10">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{selectedTicket.type}</h2>
                        <p className="text-sm font-medium text-slate-500">Ticket ID: {selectedTicket._id}</p>
                     </div>
                     <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority} PRIORITY
                     </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 relative">
                     <IoPerson className="absolute top-6 right-6 text-4xl text-slate-200" />
                     
                     {/* COMPLAINANT BADGE (SUPPORTS PASSENGER OR DRIVER REPORT) */}
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {selectedTicket.passengerId ? "Complainant (Passenger)" : "Complainant (Driver / Official Report)"}
                     </h3>
                     <p className="text-lg font-bold text-slate-900 mb-2">
                        {selectedTicket.passengerId 
                          ? `${selectedTicket.passengerId.firstName} ${selectedTicket.passengerId.lastName}`
                          : (selectedTicket.driverId ? `${selectedTicket.driverId.firstName} ${selectedTicket.driverId.lastName} (Driver)` : 'Anonymous / System')}
                     </p>
                     
                     <div className="flex flex-col space-y-1 mb-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm w-max">
                        <span className="text-xs font-bold text-slate-600 flex items-center">
                           <span className="w-5">📞</span> {selectedTicket.passengerId?.phone || selectedTicket.driverId?.phone || 'No Phone Registered'}
                        </span>
                        <span className="text-xs font-bold text-slate-600 flex items-center">
                           <span className="w-5">✉️</span> {selectedTicket.passengerId?.email || selectedTicket.driverId?.email || 'No Email Registered'}
                        </span>
                     </div>
                     
                     {/* DUAL TARGET ACQUISITION PANEL */}
                     {selectedTicket.driverId ? (
                        <div className="mb-6 p-5 bg-red-50/50 border border-red-100 rounded-2xl flex justify-between items-center shadow-sm">
                           <div>
                              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Reported Driver</h3>
                              <p className="text-base font-black text-red-900 leading-tight">{selectedTicket.driverId.firstName} {selectedTicket.driverId.lastName}</p>
                              <p className="text-xs font-bold text-red-700 mt-0.5">Body No: {selectedTicket.driverId.bodyNo || 'N/A'}</p>
                           </div>
                           <button 
                              onClick={() => {
                                  const targetId = selectedTicket.driverId._id || selectedTicket.driverId.id;
                                  localStorage.setItem('teleportDriverId', targetId);
                                  window.dispatchEvent(new CustomEvent('fleetTeleport'));
                                  window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'fleet' }));
                              }}
                              className="px-5 py-3 bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all flex items-center shrink-0"
                           >
                              <IoWarning className="mr-1.5 sm:mr-2 text-lg"/> Investigate Driver
                           </button>
                        </div>
                     ) : (
                        <div className="mb-6 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4 shadow-sm">
                           <div className="flex justify-between items-center">
                              <div>
                                 <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">No Driver Linked Yet</h3>
                                 <p className="text-xs font-bold text-slate-600 leading-tight">Link a Tricycle Body No. below to notify the driver, or inspect the passenger.</p>
                              </div>
                              {selectedTicket.passengerId && (
                                <button 
                                   onClick={() => {
                                       const query = selectedTicket.passengerId?.phone || selectedTicket.passengerId?.firstName || '';
                                       localStorage.setItem('teleportPassengerQuery', query);
                                       window.dispatchEvent(new CustomEvent('passengerTeleport'));
                                       window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'passengers' }));
                                   }}
                                   className="px-4 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow hover:bg-blue-700 active:scale-95 transition-all flex items-center shrink-0"
                                >
                                   <IoPerson className="mr-1.5 text-sm"/> Inspect Passenger
                                </button>
                              )}
                           </div>

                           {/* 1-CLICK BODY NO. DRIVER LINKER */}
                           <div className="flex space-x-2 pt-2 border-t border-blue-100">
                              <input 
                                type="text"
                                placeholder="Enter Body No. (e.g. 0143) to link & notify driver..."
                                value={manualBodyNo}
                                onChange={(e) => setManualBodyNo(e.target.value.toUpperCase())}
                                className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                disabled={linkingDriver || !manualBodyNo.trim()}
                                onClick={async () => {
                                  setLinkingDriver(true);
                                  try {
                                    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                                    const res = await axios.put(`https://tricycheck-api.onrender.com/api/tickets/${selectedTicket._id}/link-driver`, {
                                      bodyNo: manualBodyNo.trim()
                                    }, { headers: { Authorization: `Bearer ${token}` } });
                                    setManualBodyNo('');
                                    setSelectedTicket(res.data.ticket);
                                    fetchTickets();
                                    setModalState({ isOpen: true, title: "Driver Linked & Notified", message: res.data.message, type: "success" });
                                  } catch (err) {
                                    setModalState({ isOpen: true, title: "Link Failed", message: err.response?.data?.error || "Could not link driver.", type: "warning" });
                                  } finally {
                                    setLinkingDriver(false);
                                  }
                                }}
                                className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 disabled:opacity-50"
                              >
                                {linkingDriver ? "Linking..." : "Link Driver"}
                              </button>
                           </div>
                        </div>
                     )}

                     {/* TRIP TELEMETRY RECEIPT CARD (IF FILED FROM TRIP HISTORY OR AUTO-LINKED) */}
                     {selectedTicket.bookingId && (
                       <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                             Official Trip Telemetry
                          </span>
                          <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                             <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Pickup Point</p>
                                <p className="font-bold text-slate-800 truncate">{selectedTicket.bookingId.pickupLocation}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Dropoff Point</p>
                                <p className="font-bold text-emerald-700 truncate">{selectedTicket.bookingId.dropoffLocation}</p>
                             </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-emerald-200/60">
                             <span className="text-[11px] font-bold text-slate-500">Trip Fare Paid:</span>
                             <span className="text-sm font-black text-slate-900">₱{selectedTicket.bookingId.fare}.00</span>
                          </div>
                       </div>
                     )}

                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incident Description</h3>
                     <p className="text-sm font-medium text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 mb-6">{selectedTicket.description}</p>

                     {/* DRIVER'S DUE-PROCESS COUNTER-STATEMENT */}
                     {selectedTicket.driverExplanation ? (
                       <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">
                                Driver's Official Counter-Statement
                             </span>
                             <span className="text-[10px] font-bold text-slate-400">
                                {new Date(selectedTicket.driverExplanationSubmittedAt || selectedTicket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 italic mt-2">
                             "{selectedTicket.driverExplanation}"
                          </p>
                       </div>
                     ) : selectedTicket.driverId ? (
                       <div className="mb-6 p-3 bg-slate-100 border border-dashed border-slate-300 rounded-xl text-center">
                          <p className="text-xs font-bold text-slate-500">Awaiting driver counter-statement in driver app inbox...</p>
                       </div>
                     ) : null}

                     {/* MEDIATED INVESTIGATION MESSENGER THREAD */}
                     <div className="bg-slate-900 text-white p-5 rounded-2xl mb-6 shadow-md">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                           <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                              POSO Mediated Investigation Channel
                           </h4>
                           <span className="text-[9px] font-bold text-slate-400">Strictly Moderated by LGU</span>
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-2 mb-3 pr-1 text-xs">
                           {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                              <p className="text-slate-500 italic text-center py-4">No dialogue logged yet. Use the field below to issue an inquiry or directive.</p>
                           ) : (
                              selectedTicket.messages.map((m, idx) => (
                                 <div key={idx} className={`p-2.5 rounded-xl ${m.senderRole === 'passenger' ? 'bg-blue-950 border border-blue-800 text-blue-100' : m.senderRole === 'driver' ? 'bg-amber-950 border border-amber-800 text-amber-100' : 'bg-emerald-950 border border-emerald-800 text-emerald-100'}`}>
                                    <div className="flex justify-between text-[10px] font-black opacity-80 mb-0.5">
                                       <span>{m.senderName} ({m.senderRole.toUpperCase()}) ➔ {m.targetChannel.toUpperCase()}</span>
                                       <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="font-medium text-xs leading-relaxed">{m.message}</p>
                                 </div>
                              ))
                           )}
                        </div>

                        {/* DISPATCHER REPLY INPUT */}
                        {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Dismissed' ? (
                          <div className="p-2.5 bg-slate-800 rounded-xl text-center text-xs font-bold text-slate-400">
                            🔒 This ticket is {selectedTicket.status}. Messaging is locked.
                          </div>
                        ) : (
                          <form 
                            key={selectedTicket._id}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const input = e.target.elements.adminReply;
                              const channel = e.target.elements.channelSelect.value;
                              if (!input.value.trim()) return;

                              if (channel === 'driver' && !selectedTicket.driverId) {
                                return setModalState({ 
                                  isOpen: true, 
                                  title: "No Driver Linked", 
                                  message: "There is no driver attached to this ticket yet. Please enter a Body No. in the blue box above to link a driver first.", 
                                  type: "warning" 
                                });
                              }

                              try {
                                const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                                await axios.post(`https://tricycheck-api.onrender.com/api/tickets/${selectedTicket._id}/reply`, {
                                  senderId: adminUser._id || adminUser.id,
                                  senderRole: adminUser.role || 'dispatcher',
                                  senderName: `${adminUser.firstName || 'POSO'} ${adminUser.lastName || 'Officer'}`,
                                  targetChannel: channel,
                                  message: input.value.trim()
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                input.value = '';
                                fetchTickets();
                              } catch (err) {
                                setModalState({ 
                                  isOpen: true, 
                                  title: "Dispatch Failed", 
                                  message: err.response?.data?.error || "Failed to send message to ticket thread.", 
                                  type: "warning" 
                                });
                              }
                            }}
                            className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800"
                          >
                             <select 
                                name="channelSelect" 
                                defaultValue={selectedTicket.driverId ? "driver" : "passenger"}
                                className="bg-slate-800 border border-slate-700 text-xs font-black text-amber-300 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                             >
                                {selectedTicket.driverId ? (
                                  <option value="driver">➔ To Driver (Body #{selectedTicket.driverId.bodyNo || 'N/A'})</option>
                                ) : (
                                  <option value="driver" disabled>➔ To Driver (None Linked)</option>
                                )}
                                {selectedTicket.passengerId && (
                                  <option value="passenger">➔ To Passenger ({selectedTicket.passengerId.firstName})</option>
                                )}
                             </select>
                             <input 
                                name="adminReply"
                                type="text" 
                                placeholder="Type official directive or inquiry..." 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                             />
                             <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-xl active:scale-95 transition-all">
                                Send
                             </button>
                          </form>
                        )}
                     </div>
                  </div>

                  {/* ACTION CONTROLS: WIRED TO PATROL UNIT DISPATCH MODAL */}
                  {selectedTicket.status !== 'Resolved' && (
                     <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-100">
                        {selectedTicket.status === 'Open' ? (
                           <button 
                              onClick={() => setDispatchPrompt({ isOpen: true, ticketId: selectedTicket._id, unitName: '' })} 
                              className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
                           >
                              <IoFlash className="mr-2 text-xl" /> Assign Patrol & Investigate
                           </button>
                        ) : (
                           <button 
                              onClick={() => executeStatusUpdate(selectedTicket._id, 'Resolved')} 
                              className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-black shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center"
                           >
                              <IoCheckmarkCircle className="mr-2 text-xl" /> Mark Case as Resolved
                           </button>
                        )}
                        <button 
                           onClick={() => executeStatusUpdate(selectedTicket._id, 'Dismissed')} 
                           className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                        >
                           Dismiss
                        </button>
                     </div>
                  )}
                  
                  {selectedTicket.status === 'Resolved' && (
                     <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-center">
                        <IoCheckmarkCircle className="text-3xl text-emerald-500 mx-auto mb-2" />
                        <h3 className="text-sm font-black text-slate-800">Case Closed & Archived</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">An official email has been sent to the passenger confirming resolution.</p>
                     </div>
                  )}
               </div>
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center relative z-10">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                  <IoMegaphone className="text-4xl text-slate-300" />
               </div>
               <h3 className="text-xl font-black text-slate-700">Command Switchboard Offline</h3>
               <p className="text-sm font-medium text-slate-500 max-w-xs mt-2">Select an emergency ticket from the inbox to initiate radar tracking and dispatch protocol.</p>
            </div>
         )}
      </div>

      {/* === DISPATCH UNIT PROMPT OVERLAY === */}
      {dispatchPrompt.isOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm z-10 p-8 animate-slide-up">
            <div className="flex justify-center mb-4">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner border border-emerald-100">
                  <IoFlash className="text-3xl" />
               </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Assign Patrol Unit</h3>
            <p className="text-xs font-medium text-slate-500 text-center mb-6">Enter the official POSO unit responding to this emergency.</p>
            {/* 1-CLICK QUICK PATROL UNIT PILLS (ZERO MANUAL TYPING) */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['POSO Patrol 1', 'POSO Sector Alpha', 'PNP Desk Officer', 'MDRRMO Rescue'].map(pill => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setDispatchPrompt(prev => ({ ...prev, unitName: pill }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    dispatchPrompt.unitName === pill 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            <input
               type="text"
               placeholder="e.g. Mobile Patrol 3 - Sgt. Cruz"
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 font-bold text-sm outline-none focus:border-emerald-600 transition-all shadow-inner"
               value={dispatchPrompt.unitName}
               onChange={e => setDispatchPrompt({...dispatchPrompt, unitName: e.target.value})}
               autoFocus
            />
            <div className="flex space-x-3">
               <button onClick={() => setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' })} className="flex-1 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
               <button 
                  onClick={() => { 
                     executeStatusUpdate(dispatchPrompt.ticketId, 'In Progress', dispatchPrompt.unitName); 
                     setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' }); 
                  }} 
                  disabled={!dispatchPrompt.unitName.trim()}
                  className="flex-[2] py-3.5 rounded-xl font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg active:scale-95 transition-all disabled:opacity-50"
               >
                  Confirm & Dispatch
               </button>
            </div>
          </div>
        </div>,
        document.body // <-- INJECTS AT THE ABSOLUTE ROOT
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

export default SupportTickets;