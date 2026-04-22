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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh') {
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(error);
      }

      if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/google' || originalRequest.url === '/auth/register') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err);
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;