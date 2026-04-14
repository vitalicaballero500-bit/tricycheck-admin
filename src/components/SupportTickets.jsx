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
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dispatchPrompt, setDispatchPrompt] = useState({ isOpen: false, ticketId: null, unitName: '' });

  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "success", isConfirm: false });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const response = await axios.get('https://tricycheck-api.onrender.com/api/tickets', {
          headers: { Authorization: `Bearer ${token}` } 
      });
      // Sort newest first
      const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTickets(sorted);
      
      // Auto-update selected ticket if it's currently open
      if (selectedTicket) {
          const updatedSelected = sorted.find(t => t._id === selectedTicket._id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
      }
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const executeStatusUpdate = async (id, newStatus, dispatchUnit = '') => {
    try {
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus, dispatchUnit: dispatchUnit || t.dispatchUnit } : t));
      
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.put(`https://tricycheck-api.onrender.com/api/tickets/${id}`, { 
          status: newStatus, 
          dispatchUnit: dispatchUnit,
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
// === THE FIX: DUAL-FILTERING ENGINE ===
  const filteredTickets = tickets.filter(ticket => {
     // Check 1: Deep Text Search (Matches ID, Issue Type, Description, or Passenger Name)
     const searchString = `${ticket._id} ${ticket.type} ${ticket.description} ${ticket.passengerId?.firstName || ''} ${ticket.passengerId?.lastName || ''}`.toLowerCase();
     const matchesSearch = searchString.includes(searchTerm.toLowerCase());
     
     // Check 2: Status Dropdown
     const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
     
     return matchesSearch && matchesStatus;
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
                <button onClick={fetchTickets} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm hover:bg-slate-100 transition-colors" title="Sync Feed"><IoTime className="text-lg"/></button>
            </div>
            
            <div className="flex space-x-2">
                <select 
                    className="w-[110px] px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Dismissed">Dismissed</option>
                </select>
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search ID, Passenger, or Details..." 
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
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
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Complainant / Passenger</h3>
                     <p className="text-lg font-bold text-slate-800 mb-4">{selectedTicket.passengerId?.firstName || 'Unknown User'}</p>
                     
                     {/* === THE FIX: TARGET ACQUISITION PANEL === */}
                     {selectedTicket.driverId && (
                        <div className="mb-6 p-5 bg-red-50/50 border border-red-100 rounded-2xl flex justify-between items-center">
                           <div>
                              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Reported Driver</h3>
                              <p className="text-base font-black text-red-900 leading-tight">{selectedTicket.driverId.firstName} {selectedTicket.driverId.lastName}</p>
                              <p className="text-xs font-bold text-red-700 mt-0.5">Body No: {selectedTicket.driverId.bodyNo}</p>
                           </div>
                           <button 
                              onClick={() => {
                                  const targetId = selectedTicket.driverId._id || selectedTicket.driverId.id;
                                  localStorage.setItem('teleportDriverId', targetId);
                                  window.dispatchEvent(new CustomEvent('fleetTeleport'));
                                  
                                  setModalState({ isOpen: true, title: "Target Locked 🎯", message: "Driver profile acquired. Re-routing Command Center to Fleet Disciplinary Matrix...", type: "success" });
                                  
                                  // Auto-trigger tab change after 1.5 seconds!
                                  setTimeout(() => {
                                      closeModal();
                                      // === THE FIX: STRICT LOWERCASE 'fleet' TO MATCH DASHBOARD STATE ===
                                      window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'fleet' }));
                                  }, 1500);
                              }}
                              className="px-5 py-3 bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all flex items-center"
                           >
                              <IoWarning className="mr-2 text-lg"/> Investigate Driver Profile
                           </button>
                        </div>
                     )}

                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incident Report</h3>
                     <p className="text-sm font-medium text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">{selectedTicket.description}</p>
                  </div>

                  {selectedTicket.dispatchUnit && (
                     <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-8 flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl shadow-md shrink-0"><IoShieldHalf /></div>
                        <div>
                           <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Responding Patrol Unit</h3>
                           <p className="text-lg font-black text-emerald-900 leading-tight">{selectedTicket.dispatchUnit}</p>
                        </div>
                     </div>
                  )}

                  {/* ACTION CONTROLS */}
                  {selectedTicket.status !== 'Resolved' && (
                     <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-100">
                        {selectedTicket.status === 'Open' ? (
                           <button 
                              onClick={() => setDispatchPrompt({ isOpen: true, ticketId: selectedTicket._id, unitName: '' })} 
                              className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center"
                           >
                              <IoFlash className="mr-2 text-xl" /> Dispatch Patrol Unit
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
                  Dispatch Unit
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