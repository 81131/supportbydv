import axios from 'axios';
import Cookies from 'js-cookie'; // Optional: install with 'npm install js-cookie'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true, // Required for cookies to be sent
});

// Automatically attach CSRF token to state-changing requests
api.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    const csrfToken = Cookies.get('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;