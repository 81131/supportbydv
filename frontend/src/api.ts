import axios from 'axios';
import Cookies from 'js-cookie';

// Relative path — works on localhost and any LAN peer without touching env vars.
// Nginx proxies /api/* → backend:8000/*, stripping the /api prefix.
export const API_BASE_URL = '/api'; // used for static file paths: /api/static/...

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
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