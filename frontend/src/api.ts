import axios from 'axios';
import Cookies from 'js-cookie'; // Optional: install with 'npm install js-cookie'

const api = axios.create({
  baseURL: 'http://localhost:8000',
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

export default api;