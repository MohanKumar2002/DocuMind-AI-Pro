import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Auth store ──
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token) => set({ user, token }),
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('documind_auth');
      },

      updatePlan: (plan) => set(s => ({ user: { ...s.user, plan } })),
      incrementUsage: (field) => set(s => ({
        user: { ...s.user, [field]: (s.user?.[field] || 0) + 1 }
      })),

      isPro: () => ['pro', 'business'].includes(get().user?.plan),
      isStudent: () => get().user?.plan === 'student',
      isFree: () => get().user?.plan === 'free' || !get().user?.plan,
      planLimit: () => {
        const plan = get().user?.plan || 'free';
        const limits = { free: 3, student: 50, pro: 200, business: 999999 };
        return limits[plan] || 3;
      }
    }),
    { name: 'documind_auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)

// ── Document store ──
export const useDocStore = create((set, get) => ({
  documents: [],
  activeDoc: null,
  isUploading: false,
  uploadProgress: 0,
  pipelineStage: null,

  setDocuments: (documents) => set({ documents }),
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setPipelineStage: (pipelineStage) => set({ pipelineStage }),

  addDocument: (doc) => set(s => ({ documents: [doc, ...s.documents] })),
  removeDocument: (id) => set(s => ({
    documents: s.documents.filter(d => d.id !== id),
    activeDoc: s.activeDoc?.id === id ? null : s.activeDoc
  })),
  updateDocument: (id, updates) => set(s => ({
    documents: s.documents.map(d => d.id === id ? { ...d, ...updates } : d),
    activeDoc: s.activeDoc?.id === id ? { ...s.activeDoc, ...updates } : s.activeDoc
  })),
}))

// ── Chat store ──
export const useChatStore = create((set) => ({
  messages: {},  // { docId: [...messages] }
  isStreaming: false,
  streamContent: '',

  addMessage: (docId, msg) => set(s => ({
    messages: {
      ...s.messages,
      [docId]: [...(s.messages[docId] || []), msg]
    }
  })),
  setMessages: (docId, msgs) => set(s => ({
    messages: { ...s.messages, [docId]: msgs }
  })),
  clearMessages: (docId) => set(s => ({
    messages: { ...s.messages, [docId]: [] }
  })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamContent: (streamContent) => set({ streamContent }),
  appendStream: (delta) => set(s => ({ streamContent: s.streamContent + delta })),
}))

// ── UI store ──
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeView: 'upload',
  language: 'en',
  hardwareWarning: false,

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveView: (activeView) => set({ activeView }),
  setLanguage: (language) => set({ language }),
  setHardwareWarning: (hardwareWarning) => set({ hardwareWarning }),
}))
