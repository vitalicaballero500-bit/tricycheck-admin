import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ResetPassword from './components/ResetPassword';

const ALLOWED_ADMIN_ROLES = ['superadmin', 'secretary', 'dispatcher'];

// === FRONTEND SECURITY MIDDLEWARE: ZERO-TRUST ROUTE GUARD ===
function ProtectedAdminRoute({ children }) {
  const [authState, setAuthState] = useState('verifying'); // 'verifying' | 'authenticated' | 'unauthorized'

  useEffect(() => {
    let isMounted = true;

    const verifyAdminSession = async () => {
      const token = localStorage.getItem('adminToken');
      const storedUserStr = localStorage.getItem('adminUser');

      if (!token || !storedUserStr) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        if (isMounted) setAuthState('unauthorized');
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUserStr);
        if (!parsedUser || !ALLOWED_ADMIN_ROLES.includes(parsedUser.role)) {
          throw new Error('Unauthorized role in local storage');
        }

        // Live cryptographic verification against backend database
        const res = await axios.get('https://tricycheck-api.onrender.com/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.data || !ALLOWED_ADMIN_ROLES.includes(res.data.role) || res.data.status === 'Banned' || res.data.status === 'Suspended') {
          throw new Error('Server rejected admin clearance');
        }

        // Sync verified server identity back into localStorage to overwrite any DevTools tampering
        const verifiedUser = { ...parsedUser, ...res.data };
        localStorage.setItem('adminUser', JSON.stringify(verifiedUser));

        if (isMounted) setAuthState('authenticated');
      } catch (err) {
        // Only kick out on explicit 401/403 or invalid local data (preserve session during brief network blips)
        if (!err.response || err.response.status === 401 || err.response.status === 403 || err.response.status === 404) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          if (isMounted) setAuthState('unauthorized');
        } else {
          // Temporary network hiccup while token & role exist locally
          if (isMounted) setAuthState('authenticated');
        }
      }
    };

    verifyAdminSession();
    return () => { isMounted = false; };
  }, []);

  if (authState === 'verifying') {
    return (
      <div className="h-[100dvh] w-full bg-emerald-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-400">POSO Security Gateway</p>
        <p className="text-[11px] font-bold text-emerald-200/70 mt-1">Verifying cryptographic clearance...</p>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* The Login Screen */}
        <Route path="/" element={<AdminLogin />} />
        
        {/* The Protected Dashboard Screen */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } 
        />

        {/* === THE MAGIC LINK CATCHER === */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Fallback route: If they type a weird URL, send them to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;