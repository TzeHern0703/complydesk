import { useState } from 'react'
import { nanoid } from 'nanoid'
import type { Client, ClientTemplateAssignment } from '../../types'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'

interface ClientFormProps {
  client?: Client
  assignments?: ClientTemplateAssignment[]
  onSave: () => void
  onCancel: () => void
  renderFooter?: (buttons: React.ReactNode) => void
}

export function ClientForm({ client, assignments, onSave, onCancel, renderFooter }: ClientFormProps) {
  const { templates, saveClient, setClientAssignments } = useStore()
  const isEdit = !!client

  const [name, setName] = useState(client?.name ?? '')
  const [ssmNumber, setSsmNumber] = useState(client?.ssmNumber ?? '')
  const [tinNumber, setTinNumber] = useState(client?.tinNumber ?? '')
  const [tags, setTags] = useState(client?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [isActive, setIsActive] = useState(client?.isActive ?? true)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(
    new Set(assignments?.map((a) => a.templateId) ?? [])
  )
  const [clientNote, setClientNote] = useState(assignments?.[0]?.clientNote ?? '')
  // Map of templateId -> anniversary date override (for anniversary-based templates)
  const [anniversaryDates, setAnniversaryDates] = useState<Record<string, string>>(
    Object.fromEntries(
      (assignments ?? [])
        .filter((a) => a.anniversaryDate)
        .map((a) => [a.templateId, a.anniversaryDate!])
    )
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const grouped = {
    monthly: templates.filter((t) => t.category === 'monthly'),
    'bi-monthly': templates.filter((t) => t.category === 'bi-monthly'),
    'half-yearly': templates.filter((t) => t.category === 'half-yearly'),
    quarterly: templates.filter((t) => t.category === 'quarterly'),
    'one-time': templates.filter((t) => t.category === 'one-time'),
    yearly: templates.filter((t) => t.category === 'yearly'),
  }

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Client name is required')
      return
    }
    setSaving(true)
    try {
      const id = client?.id ?? nanoid()
      const saved: Client = {
        id,
        name: name.trim(),
        ssmNumber: ssmNumber.trim() || undefined,
        tinNumber: tinNumber.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
        isActive,
        createdAt: client?.createdAt ?? new Date(),
      }
      await saveClient(saved)
      await setClientAssignments(id, Array.from(selectedTemplates), clientNote.trim() || undefined, anniversaryDates)
      onSave()
    } finally {
      setSaving(false)
    }
  }

  const categoryLabels: Record<string, string> = {
    monthly: 'Monthly',
    'bi-monthly': 'Bi-Monthly',
    'half-yearly': 'Half-Yearly',
    quarterly: 'Quarterly',
    'one-time': 'One-Time',
    yearly: 'Yearly',
  }

  const buttons = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-neutral-900 font-medium">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Company Name *"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="e.g. ABC Sdn Bhd"
        />
        <Input
          label="SSM Number"
          value={ssmNumber}
          onChange={(e) => setSsmNumber(e.target.value)}
          placeholder="e.g. 1234567-X"
        />
        <Input
          label="TIN Number"
          value={tinNumber}
          onChange={(e) => setTinNumber(e.target.value)}
          placeholder="e.g. C1234567890"
        />
        <Input
          label="Tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="retail, active (comma-separated)"
        />
      </div>

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any notes about this client..."
        rows={2}
      />

      <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="accent-neutral-900"
        />
        Active client
      </label>

      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">Compliance Tasks</p>
        <div className="space-y-4">
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((cat) => (
            grouped[cat].length > 0 && (
              <div key={cat}>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                  {categoryLabels[cat]}
                </p>
                <div className="space-y-2">
                  {grouped[cat].map((t) => {
                    const isAnniversary = t.deadlineRule.type === 'anniversary-based'
                    return (
                      <div key={t.id}>
                        <label className="flex items-start gap-2 text-sm text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTemplates.has(t.id)}
                            onChange={() => toggleTemplate(t.id)}
                            className="mt-0.5 accent-neutral-900"
                          />
                          <div>
                            <span>{t.name}</span>
                            {t.nameZh && <span className="ml-1 text-xs text-neutral-400">{t.nameZh}</span>}
                          </div>
                        </label>
                        {/* Anniversary date override */}
                        {isAnniversary && selectedTemplates.has(t.id) && (
                          <div className="ml-6 mt-1.5">
                            <Input
                              label={`Anniversary date for ${t.name}`}
                              type="date"
                              value={anniversaryDates[t.id] ?? ''}
                              onChange={(e) =>
                                setAnniversaryDates((prev) => ({ ...prev, [t.id]: e.target.value }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <Textarea
        label="Default task note (applies to all new tasks for this client)"
        value={clientNote}
        onChange={(e) => setClientNote(e.target.value)}
        placeholder="e.g. This company has 2 PR employees, handle separately"
        rows={2}
      />

      {!renderFooter && <div className="pt-2">{buttons}</div>}
    </div>
  )
}
