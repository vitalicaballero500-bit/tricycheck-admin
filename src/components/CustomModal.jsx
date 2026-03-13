import React from 'react';
import { IoWarning, IoCheckmarkCircle } from 'react-icons/io5';

function CustomModal({ isOpen, title, message, onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm z-10 p-6 animate-slide-up">
        <div className="flex justify-center mb-4">
          {type === 'warning' ? <IoWarning className="text-5xl text-red-500" /> : <IoCheckmarkCircle className="text-5xl text-green-500" />}
        </div>
        <h3 className="text-xl font-black text-slate-800 text-center mb-2">{title}</h3>
        <p className="text-sm text-slate-500 text-center mb-6">{message}</p>
        <div className="flex space-x-3">
          {onCancel && <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>}
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-angkasBlue text-white hover:bg-blue-600 shadow-lg">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;