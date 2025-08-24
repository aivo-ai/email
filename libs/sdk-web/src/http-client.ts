const axios = require('axios')

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://mail.ceerion.com/api/v1'
  : 'http://localhost:3000/api/v1'

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: any) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          })
          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)
          
          // Retry original request with new token
          error.config.headers.Authorization = `Bearer ${accessToken}`
          return apiClient.request(error.config)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Custom instance for orval
export const customInstance = <T>(
  config: any,
  options?: any
): Promise<T> => {
  const source = axios.CancelToken.source()
  const promise = apiClient({
    ...config,
    ...options,
    cancelToken: source.token
  }).then(({ data }: any) => data)

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

export default apiClient
