import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios' // <--- 1. IMPORT AXIOS
import './index.css'
import App from './App.jsx'

// === THE ENTERPRISE CHEAT CODE: GLOBAL AXIOS INTERCEPTOR ===
// This acts as the global "Badge Flipper". Before ANY request leaves the browser,
// it intercepts it and staples the JWT security token to the headers.
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Staple the ID Badge to the request
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)