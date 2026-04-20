import { useState } from 'react'
import { Download, FileText, Image, Eye } from 'lucide-react'
import type { EmailAttachment } from '../../types'
import { fetchAttachmentData } from '../../lib/gmail'
import { Button } from '../ui/Button'

interface AttachmentViewerProps {
  attachment: EmailAttachment
  token: string
}

export function AttachmentItem({ attachment, token }: AttachmentViewerProps) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isPDF = attachment.mimeType === 'application/pdf'
  const isImage = attachment.mimeType.startsWith('image/')

  async function getBase64(): Promise<string> {
    if (attachment.data) return attachment.data
    setLoading(true)
    try {
      const data = await fetchAttachmentData(token, attachment.messageId, attachment.attachmentId)
      return data
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    const data = await getBase64()
    const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: attachment.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePreview() {
    if (previewUrl) {
      setPreviewUrl(null)
      return
    }
    const data = await getBase64()
    const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: attachment.mimeType })
    setPreviewUrl(URL.createObjectURL(blob))
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2 bg-neutral-50">
        <div className="text-neutral-400">
          {isPDF ? <FileText size={16} /> : isImage ? <Image size={16} /> : <FileText size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-900 truncate">{attachment.filename}</p>
          <p className="text-xs text-neutral-400">{formatSize(attachment.size)}</p>
        </div>
        <div className="flex gap-1">
          {(isPDF || isImage) && (
            <Button size="sm" variant="ghost" onClick={handlePreview} disabled={loading}>
              <Eye size={12} />
              {previewUrl ? 'Hide' : 'Preview'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDownload} disabled={loading}>
            <Download size={12} />
            {loading ? 'Loading…' : 'Save'}
          </Button>
        </div>
      </div>
      {previewUrl && (
        <div className="border-t border-neutral-100">
          {isPDF ? (
            <iframe src={previewUrl} className="w-full h-96" title={attachment.filename} />
          ) : (
            <img src={previewUrl} alt={attachment.filename} className="max-w-full max-h-96 object-contain p-2" />
          )}
        </div>
      )}
    </div>
  )
}
