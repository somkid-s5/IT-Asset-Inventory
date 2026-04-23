import axios from 'axios'

const isProd = process.env.NODE_ENV === 'production'
const apiUrl = process.env.NEXT_PUBLIC_API_URL

if (isProd && !apiUrl) {
  // In production, we should not fallback to localhost
  throw new Error('CRITICAL: NEXT_PUBLIC_API_URL is not defined in production environment. API calls will fail.')
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:3001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
