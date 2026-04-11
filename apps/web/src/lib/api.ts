import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  withCredentials: true,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('popstack_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      try {
        const res = await axios.post(
          process.env.NEXT_PUBLIC_API_URL + '/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        )
        const token = res.data.accessToken
        localStorage.setItem('popstack_token', token)
        err.config.headers.Authorization = `Bearer ${token}`
        return api(err.config)
      } catch {
        localStorage.removeItem('popstack_token')
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(err)
  }
)
