import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (process.env.NODE_ENV === 'production') {
        return '/api';
    }
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:3001/api`;
    }
    return 'http://localhost:3001/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies with requests
});

// Retry logic with exponential backoff
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Don't retry on 401/403 errors (auth issues)
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }

        // Don't retry if method is not in retryMethods
        const retryMethods = ['get', 'put', 'patch', 'delete'];
        if (!config.method || !retryMethods.includes(config.method)) {
            return Promise.reject(error);
        }

        // Check if we have retries left
        config.retryCount = config.retryCount || 0;
        if (config.retryCount >= MAX_RETRIES) {
            return Promise.reject(error);
        }

        // Increment retry count
        config.retryCount += 1;

        // Calculate delay with exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, config.retryCount - 1);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry the request
        return api(config);
    }
);

export default api;
