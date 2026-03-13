import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IoWarning, IoCheckmarkCircle, IoTime, IoShieldHalf, 
  IoLocationSharp, IoCall, IoClose, IoFlash, IoPerson 
} from 'react-icons/io5';
import CustomModal from './CustomModal'; 

function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // === KANBAN & DISPATCH STATES ===
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [dispatchPrompt, setDispatchPrompt] = useState({ isOpen: false, ticketId: null, unitName: '' });

  // === MODAL STATE ===
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "success", isConfirm: false });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  // === THE FIX: ADDING THE AUTHORIZATION HEADER ===
const fetchTickets = async () => {
  try {
    // Grab the token from storage (ensure this matches your admin login key, e.g., 'token' or 'adminToken')
    // === THE FIX: Use the Admin VIP Badge ===
    // === THE FIX: Use the Correct Storage Key ===
    const token = localStorage.getItem('token');
    
    const response = await axios.get('https://tricycheck-api.onrender.com/api/tickets', {
        headers: { Authorization: `Bearer ${token}` } 
    });
    setTickets(response.data);
  } catch (error) {
    console.error("Failed to fetch tickets", error);
    // Fallback UI to prevent silent failures
    setModalState({ isOpen: true, type: 'error', title: 'Access Denied', message: 'Failed to load tickets. Session may have expired.' });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchTickets(); }, []);

  // === NATIVE HTML5 DRAG & DROP ENGINE ===
  const handleDragStart = (e, id) => {
    setDraggedTicketId(id);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox compatibility
    e.dataTransfer.setData("text/plain", id); 
    // Adds a slight transparency to the card being dragged
    setTimeout(() => e.target.classList.add('opacity-50'), 0); 
  };

  const handleDragEnd = (e) => {
    setDraggedTicketId(null);
    e.target.classList.remove('opacity-50');
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTicketId) return;

    const ticket = tickets.find(t => t._id === draggedTicketId);
    if (!ticket || ticket.status === newStatus) return;

    // === DISPATCH INTERCEPTOR ===
    // If they drag a ticket into "In Progress", intercept it and ask for the Patrol Unit
    if (newStatus === 'In Progress') {
        setDispatchPrompt({ isOpen: true, ticketId: draggedTicketId, unitName: '' });
        return;
    }

    // Otherwise, standard status update
    executeStatusUpdate(draggedTicketId, newStatus, '');
  };

  // === THE FIX: Secured Drag and Drop API Call ===
  const executeStatusUpdate = async (id, newStatus, dispatchUnit = '') => {
    try {
      // Optimistic UI Update for instant feedback
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus, dispatchUnit: dispatchUnit || t.dispatchUnit } : t));
      
      // Background API Call with Security Headers
      // === THE FIX: Correct URL and Token Key ===
      await axios.put(`https://tricycheck-api.onrender.com/api/tickets/${id}`, { 
          status: newStatus, 
          dispatchUnit: dispatchUnit,
          adminId: adminUser._id || adminUser.id
      }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error("Status update failed:", error);
      fetchTickets(); // Revert on failure
      setModalState({ isOpen: true, title: "Sync Error", message: "Failed to update ticket status on the server.", type: "warning" });
    }
  };

  // === KANBAN COLUMNS DEFINITION ===
  const columns = [
    { id: 'Open', title: 'Pending Reports', icon: <IoWarning className="text-orange-500"/>, color: 'border-t-orange-500', bg: 'bg-orange-50' },
    { id: 'In Progress', title: 'Active Dispatch', icon: <IoFlash className="text-blue-500"/>, color: 'border-t-blue-500', bg: 'bg-blue-50' },
    { id: 'Resolved', title: 'Resolved Cases', icon: <IoCheckmarkCircle className="text-green-500"/>, color: 'border-t-green-500', bg: 'bg-green-50' }
  ];

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      
      <div className="mb-6 flex justify-between items-end">
         <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Live Dispatch Board</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Drag and drop tickets to assign units and resolve issues.</p>
         </div>
         <button onClick={fetchTickets} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
            <IoTime className="inline mr-1"/> Refresh Board
         </button>
      </div>

      {/* === THE KANBAN BOARD === */}
      {loading ? (
         <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse">Loading secure connection...</div>
      ) : (
         <div className="flex-1 flex space-x-6 overflow-x-auto pb-4">
            {columns.map(col => (
               <div 
                  key={col.id}
                  className={`flex-1 min-w-[320px] bg-slate-100/50 rounded-2xl flex flex-col overflow-hidden border border-slate-200 shadow-sm transition-colors ${draggedTicketId ? 'bg-slate-100' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
               >
                  <div className={`p-4 bg-white border-t-4 shadow-sm flex justify-between items-center shrink-0 ${col.color}`}>
                     <h3 className="font-black text-slate-800 flex items-center space-x-2">
                        {col.icon} <span>{col.title}</span>
                     </h3>
                     <span className={`px-2.5 py-1 rounded-full text-xs font-black shadow-inner ${col.bg} ${col.color.replace('border-t-', 'text-')}`}>
                        {tickets.filter(t => t.status === col.id).length}
                     </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {tickets.filter(t => t.status === col.id).map(ticket => (
                        <div 
                           key={ticket._id}
                           draggable
                           onDragStart={(e) => handleDragStart(e, ticket._id)}
                           onDragEnd={handleDragEnd}
                           className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                           {/* Priority Indicator */}
                           <div className={`absolute top-0 left-0 w-1.5 h-full ${ticket.priority === 'High' || ticket.priority === 'CRITICAL' ? 'bg-red-500' : ticket.priority === 'Medium' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                           
                           <div className="pl-2">
                              <div className="flex justify-between items-start mb-2">
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${ticket.priority === 'High' || ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                                    {ticket.priority} Priority
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                              </div>

                              <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">{ticket.type}</h4>
                              <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-2">{ticket.description}</p>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                 <div className="flex items-center space-x-2 min-w-0">
                                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] shrink-0"><IoPerson className="text-slate-400"/></div>
                                    <p className="text-[10px] font-bold text-slate-500 truncate">
                                       {ticket.passengerId?.firstName || 'User'}
                                    </p>
                                 </div>
                                 
                                 {ticket.dispatchUnit && (
                                    <div className="flex items-center space-x-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded shadow-sm shrink-0">
                                       <IoShieldHalf /> <span>{ticket.dispatchUnit}</span>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                     {tickets.filter(t => t.status === col.id).length === 0 && (
                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">
                           Drop tickets here
                        </div>
                     )}
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* === DISPATCH UNIT PROMPT OVERLAY === */}
      {dispatchPrompt.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm z-10 p-6 animate-slide-up">
            <div className="flex justify-center mb-3">
               <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shadow-inner border border-blue-100">
                  <IoFlash className="text-3xl" />
               </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Assign Patrol Unit</h3>
            <p className="text-xs font-medium text-slate-500 text-center mb-6">Which POSO patrol unit is being dispatched to investigate this ticket?</p>
            <input
               type="text"
               placeholder="e.g. Mobile Patrol 3 - Sgt. Cruz"
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 font-bold text-sm outline-none focus:border-angkasBlue focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
               value={dispatchPrompt.unitName}
               onChange={e => setDispatchPrompt({...dispatchPrompt, unitName: e.target.value})}
               autoFocus
            />
            <div className="flex space-x-3">
               <button onClick={() => setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' })} className="flex-1 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-transform">Cancel</button>
               <button 
                  onClick={() => { 
                     executeStatusUpdate(dispatchPrompt.ticketId, 'In Progress', dispatchPrompt.unitName); 
                     setDispatchPrompt({ isOpen: false, ticketId: null, unitName: '' }); 
                  }} 
                  disabled={!dispatchPrompt.unitName.trim()}
                  className="flex-[2] py-3.5 rounded-xl font-black bg-blue-500 text-white hover:bg-blue-600 shadow-[0_5px_15px_rgba(59,130,246,0.3)] active:scale-95 transition-transform disabled:bg-blue-300 disabled:shadow-none"
               >
                  Dispatch Unit
               </button>
            </div>
          </div>
        </div>
      )}

      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.isConfirm ? modalState.onConfirm : closeModal}
        onCancel={modalState.isConfirm ? closeModal : null}
      />
    </div>
  );
}

export default SupportTickets;