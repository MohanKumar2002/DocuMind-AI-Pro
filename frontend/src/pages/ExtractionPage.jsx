import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { extractionAPI } from '../utils/api'
import { useDocStore, useUIStore } from '../store'
import toast from 'react-hot-toast'
import styles from './ChatPage.module.css'

export default function ExtractionPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { activeDoc, documents, setActiveDoc } = useDocStore()
  const { language } = useUIStore()

  const [loading, setLoading] = useState(false)
  const [fieldsInput, setFieldsInput] = useState('')
  const [result, setResult] = useState(null)

  const currentDoc = docId ? documents.find(d => d.id === docId) || activeDoc : activeDoc

  useEffect(() => {
    if (docId) {
      const doc = documents.find(d => d.id === docId)
      if (doc) setActiveDoc(doc)
    }
  }, [docId])

  function setPreset(type) {
    if (type === 'invoice') setFieldsInput('Vendor Name, Invoice Date, Invoice Number, Total Amount, Tax Amount')
    if (type === 'receipt') setFieldsInput('Store Name, Date, Items Purchased, Total Amount')
    if (type === 'resume') setFieldsInput('Full Name, Email, Phone, Top Skills, Total Years Experience')
  }

  async function handleExtract() {
    if (!currentDoc) { toast.error('Select a document first'); navigate('/app/upload'); return }
    if (currentDoc.status !== 'ready') { toast.error('Document is still processing...'); return }
    if (!fieldsInput.trim()) { toast.error('Please enter fields to extract'); return }

    const fields = fieldsInput.split(',').map(f => f.trim()).filter(f => f)
    setLoading(true)
    setResult(null)

    try {
      const res = await extractionAPI.extract({
        doc_id: currentDoc.id,
        fields,
        language
      })
      setResult(res.data.extracted_data)
      toast.success('Data extracted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to extract data')
    }
    setLoading(false)
  }

  function downloadCSV() {
    if (!result) return
    const keys = Object.keys(result)
    const values = keys.map(k => {
      const val = result[k]
      // wrap in quotes and escape internal quotes
      return `"${String(val !== null ? val : '').replace(/"/g, '""')}"`
    })
    
    const csvContent = keys.join(',') + '\n' + values.join(',')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `extraction_${currentDoc?.name || 'data'}.csv`
    link.click()
  }

  return (
    <div className={styles.container} style={{ padding: '20px', overflowY: 'auto' }}>
      {currentDoc && (
        <div className={styles.docHeader} style={{ marginBottom: 24 }}>
          <div className={styles.docIcon}>📄</div>
          <div className={styles.docInfo}>
            <div className={styles.docName}>{currentDoc.name}</div>
            <div className={styles.docMeta}>Extract structured data using AI</div>
          </div>
          <div className={styles.docActions}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chat/${currentDoc.id}`)}>💬 Chat</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/summary/${currentDoc.id}`)}>📝 Summary</button>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 16 }}>Data Extraction</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
          Define the fields you want to extract from this document. The AI will read the document and pull the exact structured data for you.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPreset('invoice')}>📄 Invoice Preset</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPreset('receipt')}>🧾 Receipt Preset</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPreset('resume')}>👔 Resume Preset</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="input-label">Fields to extract (comma separated)</label>
          <textarea 
            className="input" 
            rows={3}
            placeholder="e.g. Vendor Name, Invoice Date, Total Amount"
            value={fieldsInput}
            onChange={e => setFieldsInput(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleExtract}
          disabled={loading || !fieldsInput.trim()}
        >
          {loading ? <span className="spinner" style={{width:16,height:16,marginRight:8}} /> : '✨ '}
          {loading ? 'Extracting...' : 'Extract Data'}
        </button>

        {result && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Results</h3>
              <button className="btn btn-cyan btn-sm" onClick={downloadCSV}>📥 Download CSV</button>
            </div>
            
            <div style={{ background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {Object.entries(result).map(([key, value], idx) => (
                    <tr key={key} style={{ borderBottom: idx === Object.keys(result).length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, width: '40%', borderRight: '1px solid var(--border)' }}>{key}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                        {value === null ? <span style={{ opacity: 0.5 }}>Not found</span> : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
