import { useEffect } from 'react'
import { docsAPI } from '../utils/api'
import { useDocStore } from '../store'
import toast from 'react-hot-toast'

export function useDocuments() {
  const { setDocuments, removeDocument } = useDocStore()

  async function fetchDocuments() {
    try {
      const res = await docsAPI.list()
      setDocuments(res.data || [])
    } catch {}
  }

  async function deleteDocument(id) {
    try {
      await docsAPI.delete(id)
      removeDocument(id)
    } catch { toast.error('Failed to delete document') }
  }

  useEffect(() => { fetchDocuments() }, [])

  return { fetchDocuments, deleteDocument }
}
