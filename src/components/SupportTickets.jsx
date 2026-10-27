import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IoWarning, IoCheckmarkCircle, IoTime, IoClose, 
  IoPerson, IoMegaphone, IoArrowForward, IoChatbubbles, 
  IoCall, IoMail, IoCarSport, IoSend, IoCamera
} from 'react-icons/io5';
import CustomModal from './CustomModal'; 

function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [manualBodyNo, setManualBodyNo] = useState('');
  const [linkingDriver, setLinkingDriver] = useState(false);
  const [replyImage, setReplyImage] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);

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

  const executeStatusUpdate = async (id, newStatus) => {
    try {
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
      
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.put(`https://tricycheck-api.onrender.com/api/tickets/${id}`, { 
        status: newStatus, 
        adminId: adminUser._id || adminUser.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchTickets();
      if (newStatus === 'Resolved') {
        setModalState({ 
          isOpen: true, 
          title: "Case Resolved", 
          message: "This ticket has been marked as Resolved. Official closure notifications have been sent to the involved parties.", 
          type: "success" 
        });
      }
    } catch (error) {
      fetchTickets(); 
      setModalState({ isOpen: true, title: "Sync Error", message: "Failed to update ticket status on the server.", type: "warning" });
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'CRITICAL') return 'bg-red-500 text-white animate-pulse';
    if (priority === 'High') return 'bg-orange-500 text-white';
    if (priority === 'Medium') return 'bg-yellow-400 text-yellow-900';
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  };

  const filteredTickets = tickets.filter(ticket => {
    const searchString = `${ticket._id} ${ticket.type} ${ticket.description} ${ticket.passengerId?.firstName || ''} ${ticket.passengerId?.lastName || ''} ${ticket.driverId?.firstName || ''} ${ticket.driverId?.lastName || ''} ${ticket.driverId?.bodyNo || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    
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
    <div className="h-full flex flex-col lg:flex-row gap-5 animate-fade-in relative min-h-0">
      
      {/* === LEFT: THE TICKET INBOX QUEUE === */}
      <div className="w-full lg:w-[34%] bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col shrink-0 z-10 min-h-0">
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center">
                <IoMegaphone className="mr-2 text-emerald-600"/> Support & Mediation Desk
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Passenger & Driver Reports
              </p>
            </div>
            <button onClick={fetchTickets} disabled={loading} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm hover:bg-slate-100 transition-colors disabled:opacity-50" title="Sync Feed">
              <IoTime className={`text-base ${loading ? 'animate-spin text-emerald-600' : ''}`}/>
            </button>
          </div>
          
          <div className="flex flex-col space-y-2.5">
            <div className="flex space-x-2">
              <select 
                className="w-[95px] px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Dismissed">Dismissed</option>
              </select>
              <select 
                className="w-[95px] px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
              </select>
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search Name, Body #, ID..." 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 text-[11px] font-bold shadow-sm" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm relative">
              <div>
                <label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-0.5 ml-1">
                  Start Date (From)
                </label>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none text-[11px] font-bold text-slate-700 cursor-pointer focus:border-emerald-600"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5 px-1">
                  <label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                    End Date (To)
                  </label>
                  {(dateFilter.start || dateFilter.end) && (
                    <button 
                      type="button"
                      onClick={() => setDateFilter({ start: '', end: '' })} 
                      className="text-[9px] font-black text-red-500 hover:underline uppercase"
                      title="Clear Dates"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none text-[11px] font-bold text-slate-700 cursor-pointer focus:border-emerald-600"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400 font-bold text-sm animate-pulse">Syncing Support Feed...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold text-sm">No tickets found matching your filters.</div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket._id} 
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 cursor-pointer transition-colors relative border-l-4 ${
                  selectedTicket?._id === ticket._id 
                    ? 'bg-emerald-50/80 border-l-emerald-600' 
                    : 'hover:bg-slate-50 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority} 
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(ticket.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} • {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-sm leading-tight mb-1 truncate">{ticket.type}</h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-1 mb-2">{ticket.description}</p>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      ticket.status === 'Resolved' ? 'text-green-600' : ticket.status === 'In Progress' ? 'text-blue-600' : ticket.status === 'Dismissed' ? 'text-slate-400' : 'text-orange-500'
                    }`}>
                      ● {ticket.status}
                    </span>
                    {ticket.messages?.length > 0 && (
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center">
                        <IoChatbubbles className="mr-1 text-[10px]" /> {ticket.messages.length}
                      </span>
                    )}
                  </div>
                  <IoArrowForward className={`text-base transition-transform ${selectedTicket?._id === ticket._id ? 'text-emerald-600 translate-x-1' : 'text-slate-300'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === RIGHT: THE DIGITAL MEDIATION & MESSENGER CONSOLE (NO MAP BLOAT) === */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative flex flex-col z-0 min-h-0">
        {selectedTicket ? (
          <div className="flex flex-col h-full animate-fade-in min-h-0">
            
            {/* COMPACT TICKET HEADER */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedTicket.type}</h2>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Case ID: #{selectedTicket._id.slice(-6).toUpperCase()} • Filed {new Date(selectedTicket.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                selectedTicket.status === 'Resolved' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : selectedTicket.status === 'In Progress'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : selectedTicket.status === 'Dismissed'
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : 'bg-orange-100 text-orange-700 border-orange-200'
              }`}>
                ● {selectedTicket.status}
              </span>
            </div>

            {/* SCROLLABLE BODY: CONTACTS + TELEMETRY + MESSENGER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
              
              {/* SIDE-BY-SIDE CONTACT CARDS: PASSENGER & DRIVER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CARD 1: PASSENGER / COMPLAINANT CONTACT */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {selectedTicket.passengerId ? 'Passenger Contact' : 'Filed By Driver'}
                      </span>
                      {selectedTicket.passengerId && (
                        <button
                          type="button"
                          onClick={() => {
                            const query = selectedTicket.passengerId?.phone || selectedTicket.passengerId?.firstName || '';
                            localStorage.setItem('teleportPassengerQuery', query);
                            window.dispatchEvent(new CustomEvent('passengerTeleport'));
                            window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'passengers' }));
                          }}
                          className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wider flex items-center"
                        >
                          <IoPerson className="mr-1" /> Passenger File &rarr;
                        </button>
                      )}
                    </div>

                    {selectedTicket.passengerId ? (
                      <>
                        <p className="text-base font-black text-slate-900">
                          {selectedTicket.passengerId.firstName} {selectedTicket.passengerId.lastName}
                        </p>
                        <div className="mt-2 space-y-1 text-xs font-bold text-slate-600">
                          <p className="flex items-center">
                            <IoCall className="text-emerald-600 mr-2 shrink-0" />
                            <span className="font-mono">{selectedTicket.passengerId.phone || 'No Phone'}</span>
                          </p>
                          <p className="flex items-center break-all">
                            <IoMail className="text-emerald-600 mr-2 shrink-0" />
                            <span>{selectedTicket.passengerId.email || 'No Email Registered'}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        This ticket was submitted directly by the driver to the POSO desk.
                      </p>
                    )}
                  </div>
                </div>

                {/* CARD 2: LINKED DRIVER CONTACT (OR 1-CLICK BODY NO. LINKER) */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
                  selectedTicket.driverId ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/40 border-blue-200'
                }`}>
                  {selectedTicket.driverId ? (
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                          Linked Driver • Body #{selectedTicket.driverId.bodyNo || 'N/A'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = selectedTicket.driverId._id || selectedTicket.driverId.id;
                            localStorage.setItem('teleportDriverId', targetId);
                            localStorage.setItem('teleportTicketId', selectedTicket._id);
                            window.dispatchEvent(new CustomEvent('fleetTeleport'));
                            window.dispatchEvent(new CustomEvent('forceDashboardTabChange', { detail: 'fleet' }));
                          }}
                          className="text-[10px] font-black text-red-600 hover:underline uppercase tracking-wider flex items-center"
                        >
                          <IoWarning className="mr-1" /> Tribunal File &rarr;
                        </button>
                      </div>

                      <p className="text-base font-black text-slate-900">
                        {selectedTicket.driverId.firstName} {selectedTicket.driverId.lastName}
                      </p>
                      <div className="mt-2 space-y-1 text-xs font-bold text-slate-700">
                        <p className="flex items-center">
                          <IoCall className="text-amber-600 mr-2 shrink-0" />
                          <span className="font-mono">{selectedTicket.driverId.phone || 'No Phone'}</span>
                        </p>
                        <p className="flex items-center break-all">
                          <IoMail className="text-amber-600 mr-2 shrink-0" />
                          <span>{selectedTicket.driverId.email || 'No Email Registered'}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                          No Driver Linked Yet
                        </span>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">
                          Enter a Tricycle Body No. to attach the driver and enable driver inbox messaging:
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <input 
                          type="text"
                          placeholder="Body No. (e.g. 0143)"
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
                          {linkingDriver ? "..." : "Link"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INCIDENT REPORT & ATTACHED TRIP TELEMETRY */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                {selectedTicket.bookingId && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                    <div className="flex items-center space-x-2">
                      <IoCarSport className="text-emerald-600 text-base shrink-0" />
                      <span className="font-bold text-slate-700">
                        Trip Route: <b className="text-slate-900">{selectedTicket.bookingId.pickupLocation}</b> &rarr; <b className="text-emerald-700">{selectedTicket.bookingId.dropoffLocation}</b>
                      </span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-md">
                      Fare: ₱{selectedTicket.bookingId.fare}.00
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Reported Issue Description
                  </span>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    "{selectedTicket.description}"
                  </p>
                </div>

                {selectedTicket.driverExplanation && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      Driver's Latest Counter-Statement:
                    </span>
                    <p className="text-xs font-bold text-slate-800 italic mt-0.5">
                      "{selectedTicket.driverExplanation}"
                    </p>
                  </div>
                )}
              </div>

              {/* === POSO MEDIATED IN-APP MESSENGER (DIRECT TO PASSENGER OR DRIVER INBOX) === */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col">
                <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <IoChatbubbles className="text-emerald-400 text-lg" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                      POSO In-App Inbox Messenger
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Messages appear directly inside the Driver or Passenger App Inbox
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2.5 mb-3 pr-1 text-xs">
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                    <p className="text-slate-500 italic text-center py-6">
                      No messages sent yet. Choose a recipient below to message their app inbox.
                    </p>
                  ) : (
                    selectedTicket.messages.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl ${
                          m.senderRole === 'passenger' 
                            ? 'bg-blue-950/90 border border-blue-800 text-blue-100' 
                            : m.senderRole === 'driver' 
                            ? 'bg-amber-950/90 border border-amber-800 text-amber-100' 
                            : 'bg-emerald-950/90 border border-emerald-800 text-emerald-100'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] font-black opacity-80 mb-1">
                          <span>
                            {m.senderName} ({m.senderRole.toUpperCase()}) &rarr; {m.targetChannel.toUpperCase()} INBOX
                          </span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-medium text-xs leading-relaxed">{m.message}</p>
                        {m.attachmentUrl && (
                          <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-2">
                            <img 
                              src={m.attachmentUrl} 
                              alt="Attachment" 
                              className="max-h-44 rounded-lg border border-white/20 object-cover hover:opacity-90 transition-opacity" 
                            />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* MESSAGE COMPOSER WITH PHOTO ATTACHMENT */}
                {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Dismissed' ? (
                  <div className="p-3 bg-slate-800 rounded-xl text-center text-xs font-bold text-slate-400">
                    🔒 This ticket is marked as {selectedTicket.status}. Messaging is closed.
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    {replyImagePreview && (
                      <div className="flex items-center space-x-3 bg-slate-800 p-2 rounded-xl border border-slate-700 w-max">
                        <img src={replyImagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-[11px] font-bold text-emerald-400">Photo Ready to Send</span>
                        <button 
                          type="button" 
                          onClick={() => { setReplyImage(null); setReplyImagePreview(null); }} 
                          className="p-1 bg-slate-700 hover:bg-red-500 rounded-full text-white transition-colors"
                        >
                          <IoClose />
                        </button>
                      </div>
                    )}

                    <form 
                      key={selectedTicket._id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const input = e.target.elements.adminReply;
                        const channel = e.target.elements.channelSelect.value;
                        if (!input.value.trim() && !replyImage) return;

                        if (channel === 'driver' && !selectedTicket.driverId) {
                          return setModalState({ 
                            isOpen: true, 
                            title: "No Driver Linked", 
                            message: "Please link a Tricycle Body No. in the top-right box first before sending a message to the driver.", 
                            type: "warning" 
                          });
                        }

                        setSendingReply(true);
                        try {
                          const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                          const formData = new FormData();
                          formData.append('senderId', adminUser._id || adminUser.id);
                          formData.append('senderRole', adminUser.role || 'dispatcher');
                          formData.append('senderName', `${adminUser.firstName || 'POSO'} ${adminUser.lastName || 'Officer'}`);
                          formData.append('targetChannel', channel);
                          formData.append('message', input.value.trim());
                          if (replyImage) formData.append('image', replyImage);

                          await axios.post(`https://tricycheck-api.onrender.com/api/tickets/${selectedTicket._id}/reply`, formData, { 
                            headers: { 
                              Authorization: `Bearer ${token}`,
                              'Content-Type': 'multipart/form-data'
                            } 
                          });
                          input.value = '';
                          setReplyImage(null);
                          setReplyImagePreview(null);
                          fetchTickets();
                        } catch (err) {
                          setModalState({ 
                            isOpen: true, 
                            title: "Message Failed", 
                            message: err.response?.data?.error || "Failed to send message.", 
                            type: "warning" 
                          });
                        } finally {
                          setSendingReply(false);
                        }
                      }}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <select 
                        name="channelSelect" 
                        defaultValue={selectedTicket.passengerId ? "passenger" : "driver"}
                        className="bg-slate-800 border border-slate-700 text-xs font-black text-amber-300 rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                      >
                        {selectedTicket.passengerId && (
                          <option value="passenger">➔ To Passenger ({selectedTicket.passengerId.firstName})</option>
                        )}
                        {selectedTicket.driverId ? (
                          <option value="driver">➔ To Driver (Body #{selectedTicket.driverId.bodyNo || 'N/A'})</option>
                        ) : (
                          <option value="driver" disabled>➔ To Driver (Link Body # Above)</option>
                        )}
                      </select>

                      <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3.5 py-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0" title="Attach Photo">
                        <IoCamera className="text-lg" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReplyImage(file);
                              setReplyImagePreview(URL.createObjectURL(file));
                            }
                          }} 
                        />
                      </label>

                      <input 
                        name="adminReply"
                        type="text" 
                        placeholder="Type message or attach photo for their In-App Inbox..." 
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                      />
                      <button 
                        type="submit" 
                        disabled={sendingReply}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <IoSend /> <span>{sendingReply ? '...' : 'Send'}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* CLEAN DIGITAL RESOLUTION FOOTER (NO PATROL DISPATCH PROMPT) */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Dismissed' ? (
                <div className="w-full flex space-x-3">
                  {selectedTicket.status === 'Open' && (
                    <button 
                      onClick={() => executeStatusUpdate(selectedTicket._id, 'In Progress')} 
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <IoTime className="mr-1.5 text-base" /> Mark Under Review
                    </button>
                  )}
                  <button 
                    onClick={() => executeStatusUpdate(selectedTicket._id, 'Resolved')} 
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <IoCheckmarkCircle className="mr-1.5 text-base" /> Mark Case as Resolved
                  </button>
                  <button 
                    onClick={() => executeStatusUpdate(selectedTicket._id, 'Dismissed')} 
                    className="px-6 py-3 bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-300 active:scale-95 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="flex items-center text-emerald-700 font-black">
                    <IoCheckmarkCircle className="text-lg mr-1.5" /> Case Closed ({selectedTicket.status})
                  </span>
                  <span>Both parties have been notified via their In-App Inbox and Email.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-inner">
              <IoChatbubbles className="text-3xl text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700">Select a Support Ticket</h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs mt-1">
              Choose any report on the left to view passenger & driver contact details and message their in-app inbox.
            </p>
          </div>
        )}
      </div>

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