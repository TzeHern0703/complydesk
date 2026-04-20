import { useState } from 'react'
import { Download, Upload, Lock, Unlock, Plus, X, Wifi } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { EmailFilter, ClientEmailRule } from '../types'
import { requestGmailToken } from '../lib/gmail'
import * as q from '../db/queries'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function Settings() {
  const { settings, updateSettings, loadAll, clients } = useStore()
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingImport, setPendingImport] = useState<any>(null)

  // Gmail state
  const [gmailClientId, setGmailClientId] = useState(settings?.gmailClientId ?? '')
  const [gmailStatus, setGmailStatus] = useState('')
  const [gmailConnecting, setGmailConnecting] = useState(false)

  // Email filters state
  const [filters, setFilters] = useState<EmailFilter[]>(settings?.emailFilters ?? [
    { id: nanoid(), type: 'keyword', value: 'invoice' },
    { id: nanoid(), type: 'keyword', value: 'receipt' },
    { id: nanoid(), type: 'keyword', value: 'statement' },
    { id: nanoid(), type: 'keyword', value: 'bill' },
  ])
  const [newFilterValue, setNewFilterValue] = useState('')
  const [newFilterType, setNewFilterType] = useState<EmailFilter['type']>('keyword')

  // Client email rules
  const [clientRules, setClientRules] = useState<ClientEmailRule[]>(settings?.clientEmailRules ?? [])
  const [newRuleClientId, setNewRuleClientId] = useState('')
  const [newRuleEmail, setNewRuleEmail] = useState('')

  const tokenValid = !!settings?.gmailAccessToken && (settings.gmailTokenExpiry ?? 0) > Date.now()

  async function handleExport() {
    const data = await q.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `complydesk-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        setPendingImport(data)
        setShowImportConfirm(true)
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImport() {
    if (!pendingImport) return
    await q.importData(pendingImport, importMode === 'replace')
    await loadAll()
    setPendingImport(null)
    alert('Import complete!')
  }

  async function handleSetPassword() {
    setPwdError('')
    setPwdSuccess('')
    if (password.length < 4) {
      setPwdError('Password must be at least 4 characters')
      return
    }
    if (password !== confirmPwd) {
      setPwdError('Passwords do not match')
      return
    }
    const hash = await sha256(password)
    await updateSettings({ passwordHash: hash, passwordEnabled: true })
    setPassword('')
    setConfirmPwd('')
    setPwdSuccess('Password set successfully')
  }

  async function handleDisablePassword() {
    await updateSettings({ passwordEnabled: false, passwordHash: undefined })
    setPwdSuccess('Password disabled')
  }

  async function handleSaveGmailClientId() {
    await updateSettings({ gmailClientId: gmailClientId.trim() })
    setGmailStatus('Client ID saved.')
  }

  async function handleConnectGmail() {
    if (!gmailClientId.trim()) {
      setGmailStatus('Enter a Client ID first.')
      return
    }
    setGmailConnecting(true)
    setGmailStatus('')
    try {
      await updateSettings({ gmailClientId: gmailClientId.trim() })
      await requestGmailToken(
        gmailClientId.trim(),
        async (token, expiry) => {
          await updateSettings({ gmailAccessToken: token, gmailTokenExpiry: expiry })
          setGmailStatus('Connected! Token valid for ~1 hour.')
          setGmailConnecting(false)
        },
        (err) => {
          setGmailStatus(`Auth failed: ${err}`)
          setGmailConnecting(false)
        }
      )
    } catch (e: any) {
      setGmailStatus(e.message)
      setGmailConnecting(false)
    }
  }

  async function handleDisconnectGmail() {
    await updateSettings({ gmailAccessToken: undefined, gmailTokenExpiry: undefined })
    setGmailStatus('Disconnected.')
  }

  async function handleSaveFilters() {
    await updateSettings({ emailFilters: filters })
    setGmailStatus('Filters saved.')
  }

  function addFilter() {
    if (!newFilterValue.trim()) return
    setFilters((prev) => [...prev, { id: nanoid(), type: newFilterType, value: newFilterValue.trim() }])
    setNewFilterValue('')
  }

  async function handleSaveClientRules() {
    await updateSettings({ clientEmailRules: clientRules })
    setGmailStatus('Client rules saved.')
  }

  function addClientRule() {
    if (!newRuleClientId || !newRuleEmail.trim()) return
    const isDomain = !newRuleEmail.includes('@')
    setClientRules((prev) => [
      ...prev,
      {
        id: nanoid(),
        clientId: newRuleClientId,
        emailDomain: isDomain ? newRuleEmail.trim() : undefined,
        emailAddress: !isDomain ? newRuleEmail.trim() : undefined,
      },
    ])
    setNewRuleEmail('')
  }

  const filterTypeLabels: Record<EmailFilter['type'], string> = {
    keyword: 'Subject keyword',
    sender: 'From sender',
    'exclude-sender': 'Exclude sender',
    'exclude-keyword': 'Exclude keyword',
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-10">
      <h1 className="text-lg font-medium text-neutral-900">Settings</h1>

      {/* Export / Import */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">Data Backup</h2>
        <p className="text-sm text-neutral-500">
          Export all your data as a JSON file for backup. Import to restore from a previous backup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} />
            Export data
          </Button>
          <label className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            <Upload size={14} />
            Import data
          </label>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="radio" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="accent-neutral-900" />
            Merge
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-neutral-900" />
            Replace (overwrite everything)
          </label>
        </div>
      </section>

      {/* Gmail Integration */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">Gmail Integration</h2>
        <p className="text-xs text-neutral-400">
          Your Gmail data never leaves your browser. All processing happens locally.
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded p-4 space-y-2">
          <p className="text-xs font-medium text-neutral-700">Setup instructions</p>
          <ol className="text-xs text-neutral-500 space-y-1 list-decimal list-inside">
            <li>Go to <strong>console.cloud.google.com</strong> → Create a project</li>
            <li>Enable the <strong>Gmail API</strong></li>
            <li>Create <strong>OAuth 2.0 credentials</strong> (Web application type)</li>
            <li>Add <strong>{window.location.origin}</strong> to Authorized JavaScript Origins</li>
            <li>Copy the <strong>Client ID</strong> and paste below</li>
          </ol>
        </div>

        <div className="space-y-3">
          <Input
            label="Google OAuth Client ID"
            value={gmailClientId}
            onChange={(e) => setGmailClientId(e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSaveGmailClientId}>
              Save Client ID
            </Button>
            {tokenValid ? (
              <Button variant="ghost" onClick={handleDisconnectGmail}>
                <Wifi size={14} />
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={handleConnectGmail} disabled={gmailConnecting}>
                <Wifi size={14} />
                {gmailConnecting ? 'Connecting…' : 'Connect Gmail'}
              </Button>
            )}
          </div>
          {tokenValid && (
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-900" />
              Connected
            </p>
          )}
          {gmailStatus && <p className="text-xs text-neutral-600">{gmailStatus}</p>}
        </div>

        {/* Forwarding placeholder */}
        <div className="border border-neutral-200 rounded p-3">
          <p className="text-xs font-medium text-neutral-500">Forwarding email — coming soon</p>
          <p className="text-xs text-neutral-400 mt-0.5">Forward emails to a dedicated address for automatic capture. Requires a backend service.</p>
        </div>
      </section>

      {/* Email Filters */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">Email Filters</h2>
        <p className="text-sm text-neutral-500">Define what counts as a work email when syncing from Gmail.</p>

        <div className="space-y-1">
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-50">
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded min-w-[100px]">
                {filterTypeLabels[f.type]}
              </span>
              <span className="text-sm text-neutral-900 flex-1">{f.value}</span>
              <button
                onClick={() => setFilters((prev) => prev.filter((x) => x.id !== f.id))}
                className="text-neutral-300 hover:text-neutral-700"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={newFilterType}
            onChange={(e) => setNewFilterType(e.target.value as EmailFilter['type'])}
            className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            {(Object.entries(filterTypeLabels) as [EmailFilter['type'], string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Input
            placeholder="e.g. invoice"
            value={newFilterValue}
            onChange={(e) => setNewFilterValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFilter()}
            className="flex-1"
          />
          <Button variant="secondary" onClick={addFilter}>
            <Plus size={14} />
          </Button>
        </div>

        <Button variant="primary" onClick={handleSaveFilters}>
          Save filters
        </Button>
      </section>

      {/* Client email rules */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">Client Email Rules</h2>
        <p className="text-sm text-neutral-500">Auto-tag emails to a client based on sender email or domain.</p>

        <div className="space-y-1">
          {clientRules.map((r) => {
            const client = clients.find((c) => c.id === r.clientId)
            return (
              <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-50">
                <span className="text-sm text-neutral-900 flex-1">
                  {r.emailAddress ?? `@${r.emailDomain}`}
                </span>
                <span className="text-xs text-neutral-500">→ {client?.name ?? 'Unknown'}</span>
                <button
                  onClick={() => setClientRules((prev) => prev.filter((x) => x.id !== r.id))}
                  className="text-neutral-300 hover:text-neutral-700"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <select
            value={newRuleClientId}
            onChange={(e) => setNewRuleClientId(e.target.value)}
            className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none flex-1"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input
            placeholder="email@domain.com or domain.com"
            value={newRuleEmail}
            onChange={(e) => setNewRuleEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addClientRule()}
            className="flex-1"
          />
          <Button variant="secondary" onClick={addClientRule}>
            <Plus size={14} />
          </Button>
        </div>

        <Button variant="primary" onClick={handleSaveClientRules}>
          Save rules
        </Button>
      </section>

      {/* Password */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">App Lock</h2>
        <p className="text-sm text-neutral-500">
          Set a password to lock the app on open. Password is stored locally (hashed).
        </p>
        {settings?.passwordEnabled ? (
          <div>
            <p className="text-sm text-neutral-700 flex items-center gap-1.5 mb-3">
              <Lock size={14} />
              App lock is enabled
            </p>
            <Button variant="secondary" onClick={handleDisablePassword}>
              <Unlock size={14} />
              Disable password
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-xs">
            <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 4 characters" />
            <Input label="Confirm password" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Repeat password" />
            {pwdError && <p className="text-xs text-neutral-900 font-medium">{pwdError}</p>}
            {pwdSuccess && <p className="text-xs text-neutral-600">{pwdSuccess}</p>}
            <Button variant="primary" onClick={handleSetPassword}>
              <Lock size={14} />
              Set password
            </Button>
          </div>
        )}
      </section>

      {/* About */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-900 border-b border-neutral-100 pb-2">About</h2>
        <p className="text-sm text-neutral-500"><strong>ComplyDesk</strong> — Malaysian Accounting Compliance Tracker</p>
        <p className="text-xs text-neutral-400">All data is stored locally in your browser. Nothing leaves your device.</p>
      </section>

      <ConfirmDialog
        open={showImportConfirm}
        onClose={() => { setShowImportConfirm(false); setPendingImport(null) }}
        onConfirm={handleImport}
        title="Import data"
        message={
          importMode === 'replace'
            ? 'This will REPLACE all your current data with the imported file. This cannot be undone.'
            : 'This will merge the imported data with your existing data.'
        }
        confirmLabel="Import"
        danger={importMode === 'replace'}
      />
    </div>
  )
}
