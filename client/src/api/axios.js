import axios from 'axios';

// Single shared axios instance. baseURL already includes the '/api' prefix,
// so every call site should use paths WITHOUT a leading '/api'
// (e.g. api.get('/vehicle'), not api.get('/api/vehicle')).
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
