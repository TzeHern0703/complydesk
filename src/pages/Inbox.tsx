import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Paperclip, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import JSZip from 'jszip'
import { format } from 'date-fns'
import { useStore } from '../store/useStore'
import type { EmailMessage } from '../types'
import { fetchEmails } from '../lib/gmail'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { AttachmentItem } from '../components/email/AttachmentViewer'
import { fetchAttachmentData } from '../lib/gmail'

type FilterTab = 'all' | 'unprocessed' | 'attachments'

export function Inbox() {
  const { settings, emailMessages, saveEmailMessages, updateEmailProcessed, updateEmailClient, clients } = useStore()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<FilterTab>(
    (searchParams.get('filter') as FilterTab) ?? 'all'
  )
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const token = settings?.gmailAccessToken ?? ''
  const tokenValid = !!token && (settings?.gmailTokenExpiry ?? 0) > Date.now()
  const filters = settings?.emailFilters ?? []
  const clientRules = settings?.clientEmailRules ?? []

  async function handleSync() {
    if (!tokenValid) {
      setSyncError('Gmail not connected or token expired. Reconnect in Settings.')
      return
    }
    setSyncing(true)
    setSyncError('')
    try {
      const msgs = await fetchEmails(token, filters)
      // Apply client rules
      const ruleMap = new Map(
        clientRules.flatMap((r) => {
          const entries: [string, string][] = []
          if (r.emailDomain) entries.push([r.emailDomain.toLowerCase(), r.clientId])
          if (r.emailAddress) entries.push([r.emailAddress.toLowerCase(), r.clientId])
          return entries
        })
      )

      const enriched = msgs.map((m) => {
        const existingMsg = emailMessages.find((e) => e.id === m.id)
        if (existingMsg) return existingMsg // keep existing processed state
        const domain = m.fromEmail.split('@')[1]?.toLowerCase()
        const byEmail = ruleMap.get(m.fromEmail.toLowerCase())
        const byDomain = domain ? ruleMap.get(domain) : undefined
        return { ...m, clientId: byEmail ?? byDomain ?? undefined }
      })
      await saveEmailMessages(enriched)
    } catch (e: any) {
      setSyncError(e.message ?? 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const filtered = emailMessages.filter((m) => {
    if (activeTab === 'unprocessed' && m.isProcessed) return false
    if (activeTab === 'attachments' && !m.hasAttachments) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function handleBulkDownload(msg: EmailMessage) {
    const zip = new JSZip()
    const folder = zip.folder(msg.from) ?? zip
    for (const att of msg.attachments) {
      try {
        const data = await fetchAttachmentData(token, att.messageId, att.attachmentId)
        const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const clientName = clients.find((c) => c.id === msg.clientId)?.name ?? msg.from
        const dateStr = format(new Date(msg.date), 'yyyy-MM-dd')
        const filename = `${clientName}_${dateStr}_${att.filename}`
        folder.file(filename, bytes)
      } catch {
        // skip failed attachments
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attachments_${format(new Date(msg.date), 'yyyy-MM-dd')}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!settings?.gmailClientId) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <h1 className="text-lg font-medium text-neutral-900 mb-6">Inbox</h1>
        <EmptyState
          title="Gmail not configured"
          description="Connect your Gmail account in Settings to use the Inbox."
          action={
            <Button variant="primary" onClick={() => (window.location.hash = '#/settings')}>
              Go to Settings
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Inbox</h1>
        <Button variant="secondary" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync'}
        </Button>
      </div>

      {syncError && (
        <div className="mb-4 px-4 py-3 border border-neutral-200 rounded text-sm text-neutral-900">
          {syncError}
        </div>
      )}

      {!tokenValid && settings.gmailClientId && (
        <div className="mb-4 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded text-sm text-neutral-700">
          Gmail token expired.{' '}
          <a href="/settings" className="underline font-medium">
            Reconnect in Settings.
          </a>
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 border border-neutral-200 rounded p-0.5">
          {(['all', 'unprocessed', 'attachments'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'unprocessed' ? 'Unprocessed' : 'Attachments'}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search emails…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={emailMessages.length === 0 ? 'No emails yet' : 'No emails match this filter'}
          description={emailMessages.length === 0 ? 'Click Sync to fetch emails from Gmail.' : ''}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((msg) => (
            <EmailRow
              key={msg.id}
              msg={msg}
              isExpanded={expandedId === msg.id}
              onToggle={() => setExpandedId((v) => (v === msg.id ? null : msg.id))}
              onProcessed={(v) => updateEmailProcessed(msg.id, v)}
              onClientChange={(clientId) => updateEmailClient(msg.id, clientId)}
              onBulkDownload={() => handleBulkDownload(msg)}
              clients={clients}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmailRow({
  msg,
  isExpanded,
  onToggle,
  onProcessed,
  onClientChange,
  onBulkDownload,
  clients,
  token,
}: {
  msg: EmailMessage
  isExpanded: boolean
  onToggle: () => void
  onProcessed: (v: boolean) => void
  onClientChange: (clientId: string | undefined) => void
  onBulkDownload: () => void
  clients: { id: string; name: string }[]
  token: string
}) {
  const clientName = clients.find((c) => c.id === msg.clientId)?.name

  return (
    <div className={`border border-neutral-200 rounded bg-white ${msg.isProcessed ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Processed checkbox */}
        <button
          onClick={() => onProcessed(!msg.isProcessed)}
          className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
            msg.isProcessed ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300 hover:border-neutral-900'
          }`}
          title={msg.isProcessed ? 'Mark unprocessed' : 'Mark processed'}
        >
          {msg.isProcessed && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900 truncate">{msg.from || msg.fromEmail}</span>
            {msg.hasAttachments && <Paperclip size={12} className="text-neutral-400 flex-shrink-0" />}
            {clientName && (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded flex-shrink-0">
                {clientName}
              </span>
            )}
          </div>
          <p className={`text-sm truncate ${msg.isProcessed ? 'text-neutral-400' : 'text-neutral-700'}`}>
            {msg.subject}
          </p>
          <p className="text-xs text-neutral-400 truncate">{msg.snippet}</p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs text-neutral-400 whitespace-nowrap">
            {format(new Date(msg.date), 'd MMM')}
          </span>
          <button
            onClick={onToggle}
            className="text-neutral-300 hover:text-neutral-600"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-100 px-4 py-4 space-y-4">
          {/* Client tagging */}
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-neutral-400" />
            <span className="text-xs text-neutral-500">Client:</span>
            <select
              value={msg.clientId ?? ''}
              onChange={(e) => onClientChange(e.target.value || undefined)}
              className="text-xs rounded border border-neutral-200 px-2 py-1 text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Email body */}
          <div className="rounded border border-neutral-100 bg-neutral-50 p-3 max-h-64 overflow-y-auto">
            {msg.bodyHtml ? (
              <div
                className="text-sm text-neutral-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
              />
            ) : (
              <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-sans">
                {msg.bodyText ?? msg.snippet}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {msg.hasAttachments && msg.attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-700">
                  {msg.attachments.length} attachment{msg.attachments.length !== 1 ? 's' : ''}
                </p>
                {msg.attachments.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={onBulkDownload}>
                    Download all (ZIP)
                  </Button>
                )}
              </div>
              {msg.attachments.map((att) => (
                <AttachmentItem key={att.attachmentId} attachment={att} token={token} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
