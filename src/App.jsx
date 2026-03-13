import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* The Login Screen */}
        <Route path="/" element={<AdminLogin />} />
        
        {/* The Dashboard Screen */}
        <Route path="/dashboard" element={<AdminDashboard />} />

        {/* Fallback route: If they type a weird URL, send them to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;