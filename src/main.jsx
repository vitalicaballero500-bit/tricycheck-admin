import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// 1. OUTGOING REQUEST INTERCEPTOR: Staple JWT Bearer Token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. INCOMING RESPONSE INTERCEPTOR: Auto-Eject Forged or Expired Sessions
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Do not auto-redirect on the login endpoint itself so login error messages still show
    const isLoginRequest = requestUrl.includes('/admin-login') || requestUrl.includes('/login');

    if ((status === 401 || status === 403) && !isLoginRequest) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)