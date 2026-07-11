import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({ baseURL: API_URL, timeout: 60000 })

// ── Request interceptor — attach token ──
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor — handle errors ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Something went wrong'
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      toast.error('Session expired. Please log in again.')
    } else if (error.response?.status === 402) {
      toast.error('Plan limit reached. Please upgrade your plan.', { duration: 5000 })
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.', { icon: '🔧' })
    }
    return Promise.reject(error)
  }
)

// ── Auth ──
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// ── Documents ──
export const docsAPI = {
  upload: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/docs/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100))
    })
  },
  list: () => api.get('/docs/'),
  get: (id) => api.get(`/docs/${id}`),
  delete: (id) => api.delete(`/docs/${id}`),
}

// ── Chat ──
export const chatAPI = {
  send: (data) => api.post('/chat/', data),
  history: (docId) => api.get(`/chat/history/${docId}`),
  clearHistory: (docId) => api.delete(`/chat/history/${docId}`),

  // Streaming version
  stream: async (data, onDelta, onDone, onError) => {
    const token = useAuthStore.getState().token
    const res = await fetch(`${API_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...data, stream: true })
    })
    if (!res.ok) { onError?.('Chat request failed'); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      const lines = text.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.replace('data: ', ''))
          if (parsed.error) { onError?.(parsed.error); break }
          if (parsed.done) { onDone?.(parsed); break }
          if (parsed.delta) onDelta?.(parsed.delta)
        } catch {}
      }
    }
  }
}

// ── Summary ──
export const summaryAPI = {
  generate: (data) => api.post('/summary/', data),
}

// ── Quiz ──
export const quizAPI = {
  generate: (data) => api.post('/quiz/generate', data),
  submit: (quizId, answers) => api.post(`/quiz/submit/${quizId}`, answers),
}

// ── Dashboard ──
export const dashboardAPI = {
  getData: (docId) => api.get(`/dashboard/${docId}`),
  ask: (data) => api.post('/dashboard/ask', data),
}

// ── Extraction ──
export const extractionAPI = {
  extract: (data) => api.post('/extraction/', data),
}

// ── Payments ──
export const paymentsAPI = {
  plans: () => api.get('/payments/plans'),
  createOrder: (plan) => api.post('/payments/create-order', { plan }),
  verify: (data) => api.post('/payments/verify', data),
}

// ── Health ──
export const healthAPI = {
  check: () => api.get('/health'),
}

export default api
