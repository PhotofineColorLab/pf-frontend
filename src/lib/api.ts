import axios from 'axios';

const API_URL = 'https://pf-backend-z825.onrender.com/api';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('photofine_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 errors that aren't from the login endpoint
    if (error.response && 
        error.response.status === 401 && 
        !error.config.url.includes('/login')) {
      console.log('Authentication error. Redirecting to login...');
      localStorage.removeItem('photofine_token');
      localStorage.removeItem('photofine_current_user');
      // Use window.location.replace to avoid adding to history
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api; 