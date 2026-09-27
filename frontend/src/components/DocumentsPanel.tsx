import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Document } from '../lib/types'

interface Props {
  workspaceId: string
}

const STATUS_STYLES: Record<Document['status'], { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
  ready: { bg: 'var(--success-soft)', fg: 'var(--success)', icon: CheckCircle2 },
  processing: { bg: '#fef6e7', fg: '#b7791f', icon: Loader2 },
  error: { bg: 'var(--danger-soft)', fg: 'var(--danger)', icon: AlertCircle },
}

export default function DocumentsPanel({ workspaceId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      setDocuments(await api.listDocuments(workspaceId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await api.uploadDocument(workspaceId, file)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
          style={{ background: 'var(--primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading…' : 'Upload document'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        ) : documents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <FileText size={26} style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              No documents yet. Upload a .txt, .md, or .pdf file.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const style = STATUS_STYLES[doc.status]
            const StatusIcon = style.icon
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 transition hover:border-slate-300"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: 'var(--primary-soft)' }}
                  >
                    <FileText size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {doc.filename}
                    </p>
                    {doc.status === 'error' && doc.error_message && (
                      <p className="text-xs" style={{ color: 'var(--danger)' }}>
                        {doc.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: style.bg, color: style.fg }}
                >
                  <StatusIcon size={11} className={doc.status === 'processing' ? 'animate-spin' : ''} />
                  {doc.status}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
