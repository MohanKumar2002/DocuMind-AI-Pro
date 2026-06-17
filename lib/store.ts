import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Doc {
  id: string
  name: string
  type: string
  size: string
  pages: number
  chunkCount: number
  text: string
  index: any[]
  sheets?: Record<string, any>
  status: 'processing' | 'ready' | 'error'
  uploadedAt: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { section: number; preview: string; score: number }[]
  createdAt: string
}

interface DocStore {
  docs: Doc[]
  activeDoc: Doc | null
  isUploading: boolean
  uploadProgress: number
  pipelineStage: string | null
  addDoc: (doc: Doc) => void
  updateDoc: (id: string, updates: Partial<Doc>) => void
  removeDoc: (id: string) => void
  setActiveDoc: (doc: Doc | null) => void
  setUploading: (v: boolean) => void
  setUploadProgress: (v: number) => void
  setPipelineStage: (v: string | null) => void
}

interface ChatStore {
  messages: Record<string, Message[]>
  isStreaming: boolean
  streamContent: string
  addMessage: (docId: string, msg: Message) => void
  setMessages: (docId: string, msgs: Message[]) => void
  clearMessages: (docId: string) => void
  setStreaming: (v: boolean) => void
  setStreamContent: (v: string) => void
  appendStream: (delta: string) => void
}

interface UIStore {
  sidebarOpen: boolean
  activeView: string
  language: string
  toggleSidebar: () => void
  setActiveView: (v: string) => void
  setLanguage: (v: string) => void
}

export const useDocStore = create<DocStore>((set) => ({
  docs: [],
  activeDoc: null,
  isUploading: false,
  uploadProgress: 0,
  pipelineStage: null,
  addDoc: (doc) => set(s => ({ docs: [doc, ...s.docs] })),
  updateDoc: (id, updates) => set(s => ({
    docs: s.docs.map(d => d.id === id ? { ...d, ...updates } : d),
    activeDoc: s.activeDoc?.id === id ? { ...s.activeDoc, ...updates } : s.activeDoc,
  })),
  removeDoc: (id) => set(s => ({
    docs: s.docs.filter(d => d.id !== id),
    activeDoc: s.activeDoc?.id === id ? null : s.activeDoc,
  })),
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setUploading: (v) => set({ isUploading: v }),
  setUploadProgress: (v) => set({ uploadProgress: v }),
  setPipelineStage: (v) => set({ pipelineStage: v }),
}))

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  isStreaming: false,
  streamContent: '',
  addMessage: (docId, msg) => set(s => ({
    messages: { ...s.messages, [docId]: [...(s.messages[docId] || []), msg] }
  })),
  setMessages: (docId, msgs) => set(s => ({ messages: { ...s.messages, [docId]: msgs } })),
  clearMessages: (docId) => set(s => ({ messages: { ...s.messages, [docId]: [] } })),
  setStreaming: (v) => set({ isStreaming: v }),
  setStreamContent: (v) => set({ streamContent: v }),
  appendStream: (delta) => set(s => ({ streamContent: s.streamContent + delta })),
}))

export const useUIStore = create<UIStore>(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeView: 'upload',
      language: 'en',
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setActiveView: (v) => set({ activeView: v }),
      setLanguage: (v) => set({ language: v }),
    }),
    { name: 'documind_ui' }
  ) as any
)
