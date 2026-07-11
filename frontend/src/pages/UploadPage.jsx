import { useCallback, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { docsAPI } from '../utils/api'
import { useDocStore, useAuthStore, useUIStore } from '../store'
import { useDocuments } from '../hooks/useDocuments'
import toast from 'react-hot-toast'
import styles from './UploadPage.module.css'

const ALLOWED_EXTS = ['.pdf','.docx','.doc','.xlsx','.xls','.csv','.txt']

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { documents, isUploading, uploadProgress, pipelineStage, setUploading, setUploadProgress, setPipelineStage, addDocument } = useDocStore()
  const { fetchDocuments } = useDocuments()
  const workerRef = useRef(null)

  const plan = user?.plan || 'free'
  const docsUsed = user?.docs_used || 0
  const planLimit = { free: 3, student: 50, pro: 200, business: 999999 }[plan]
  const atLimit = docsUsed >= planLimit && planLimit !== 999999

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/aiPipeline.worker.js', import.meta.url), { type: 'module' })
    workerRef.current.onmessage = handleWorkerMessage
    return () => workerRef.current?.terminate()
  }, [])

  function handleWorkerMessage(e) {
    const { type, stage, progress } = e.data
    if (type === 'pipeline_stage') setPipelineStage({ stage, progress })
    if (type === 'pipeline_complete') {
      setPipelineStage({ stage: 'Ready', progress: 100 })
      setTimeout(() => { setPipelineStage(null); setUploading(false) }, 800)
    }
    if (type === 'pipeline_error') {
      toast.error('Pipeline error: ' + e.data.error)
      setUploading(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    if (atLimit) { toast.error('Document limit reached. Please upgrade.'); navigate('/pricing'); return }
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }, [atLimit])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt','.md'], 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false
  })

  async function uploadFile(file) {
    setUploading(true)
    setUploadProgress(0)
    setPipelineStage({ stage: 'Ingesting file', progress: 10 })
    try {
      const res = await docsAPI.upload(file, (pct) => setUploadProgress(pct))
      const doc = res.data
      addDocument({ ...doc, name: file.name, status: 'processing', chunk_count: 0 })
      toast.success(`${file.name} uploaded — processing...`)

      pollDocStatus(doc.doc_id)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
      setUploading(false)
      setPipelineStage(null)
    }
  }

  function pollDocStatus(docId) {
    const interval = setInterval(async () => {
      try {
        const res = await docsAPI.get(docId)
        const doc = res.data
        if (doc.status === 'ready') {
          clearInterval(interval)
          useDocStore.getState().updateDocument(docId, doc)
          setPipelineStage({ stage: 'Ready', progress: 100 })
          setTimeout(() => { setPipelineStage(null); setUploading(false) }, 1000)
          toast.success(`${doc.name} is ready!`, { icon: '✅' })
          fetchDocuments()
          navigate(`/app/chat/${docId}`)
        } else if (doc.status === 'error') {
          clearInterval(interval)
          setUploading(false)
          setPipelineStage(null)
          toast.error('Document processing failed')
        }
      } catch {}
    }, 2000)
    setTimeout(() => clearInterval(interval), 120000)
  }

  const progressPct = pipelineStage?.progress || uploadProgress

  return (
    <div className={styles.pageOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Upload a document</h2>
          <button className={styles.closeBtn} onClick={() => navigate('/app/chat')}>✕</button>
        </div>
        <p className={styles.subtitle}>PDF, Word, Excel, CSV or TXT — up to 20MB. Your files stay private to you.</p>

        <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dragging : ''}`}>
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className={styles.uploadingState}>
              <div className="spinner-lg" style={{ marginBottom: 16 }}></div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>Processing...</div>
              <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>{progressPct}% • {pipelineStage?.stage}</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          ) : (
            <div className={styles.idleState}>
              <div className={styles.uploadIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <h3>Drop your file here, or click to browse</h3>
              <p className={styles.exts}>{ALLOWED_EXTS.join(' · ')}</p>
              <button className="btn btn-primary" onClick={open} style={{ marginTop: 16 }}>Choose file</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
