import { useState } from 'react'
import { nanoid } from 'nanoid'
import type { Client, ClientTemplateAssignment, ClientCustomTask, DeadlineRule } from '../../types'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'
import { getDefaultLeadTime } from '../../lib/leadTime'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const categoryLabels: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  'bi-monthly': 'Bi-Monthly',
  'half-yearly': 'Half-Yearly',
  quarterly: 'Quarterly',
  'one-time': 'One-Time',
  yearly: 'Yearly',
}

// ── CustomTaskModal ────────────────────────────────────────────────────────────

interface CustomTaskModalProps {
  initial?: ClientCustomTask | null
  clientId: string
  onSave: (ct: ClientCustomTask) => void
  onCancel: () => void
}

function CustomTaskModal({ initial, clientId, onSave, onCancel }: CustomTaskModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<ClientCustomTask['category']>(initial?.category ?? 'yearly')
  const [dayOfMonth, setDayOfMonth] = useState(String(initial?.deadlineRule.dayOfMonth ?? 15))
  const [selectedMonths, setSelectedMonths] = useState<number[]>(initial?.deadlineRule.monthsOfYear ?? [])
  const [yearlyMonth, setYearlyMonth] = useState(String(initial?.deadlineRule.dayOfYear?.month ?? 3))
  const [yearlyDay, setYearlyDay] = useState(String(initial?.deadlineRule.dayOfYear?.day ?? 31))
  const [oneTimeDate, setOneTimeDate] = useState(initial?.deadlineRule.oneTimeDate ?? '')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(initial?.deadlineRule.weekdays ?? [])
  const [websiteName, setWebsiteName] = useState(initial?.governmentWebsite?.name ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(initial?.governmentWebsite?.url ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [deadlineMode, setDeadlineMode] = useState<'auto' | 'manual'>(initial?.deadlineMode ?? 'auto')
  const [manualDeadline, setManualDeadline] = useState(initial?.manualDeadline ?? '')
  const [leadTimeDays, setLeadTimeDays] = useState(initial?.leadTimeDays ?? getDefaultLeadTime('yearly'))
  const [loginUsername, setLoginUsername] = useState(initial?.loginUsername ?? '')
  const [loginNotes, setLoginNotes] = useState(initial?.loginNotes ?? '')
  const [error, setError] = useState('')

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  function toggleWeekday(d: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  function handleCategoryChange(newCat: ClientCustomTask['category']) {
    setCategory(newCat)
    setLeadTimeDays(getDefaultLeadTime(newCat))
  }

  function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (category === 'weekly' && selectedWeekdays.length === 0) {
      setError('Select at least one day of the week')
      return
    }
    if (deadlineMode === 'manual' && !manualDeadline) {
      setError('Next deadline is required for manual mode')
      return
    }

    let rule: DeadlineRule
    if (category === 'weekly') {
      rule = { type: 'weekly', weekdays: selectedWeekdays }
    } else if (category === 'yearly') {
      rule = {
        type: 'day-of-year',
        dayOfYear: { month: Number(yearlyMonth), day: Number(yearlyDay) },
      }
    } else if (category === 'one-time') {
      rule = { type: 'one-time', oneTimeDate }
    } else {
      rule = {
        type: 'day-of-month',
        dayOfMonth: Number(dayOfMonth) || 15,
        monthsOfYear: selectedMonths.length > 0 ? selectedMonths : undefined,
      }
    }

    const ct: ClientCustomTask = {
      id: initial?.id ?? nanoid(),
      clientId,
      name: name.trim(),
      category,
      deadlineRule: rule,
      governmentWebsite: websiteName.trim() || websiteUrl.trim()
        ? { name: websiteName.trim(), url: websiteUrl.trim() }
        : undefined,
      description: description.trim() || undefined,
      deadlineMode,
      manualDeadline: deadlineMode === 'manual' ? manualDeadline : undefined,
      leadTimeDays,
      loginUsername: loginUsername.trim() || undefined,
      loginNotes: loginNotes.trim() || undefined,
      isActive: initial?.isActive ?? true,
      createdAt: initial?.createdAt ?? new Date(),
      updatedAt: new Date(),
    }
    onSave(ct)
  }

  const showMonthPicker = ['bi-monthly', 'quarterly', 'half-yearly'].includes(category)
  const showDayOfMonth = category !== 'yearly' && category !== 'one-time' && category !== 'weekly'
  const showWeekdayPicker = category === 'weekly'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white border border-neutral-200 rounded-xl p-6 w-full max-w-lg space-y-5 shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-base font-medium text-neutral-900">
          {initial ? 'Edit Custom Task' : 'Add Custom Task'}
        </h2>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <Input
          label="Name *"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="e.g. Annual Office Visit"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Frequency *</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as ClientCustomTask['category'])}
              className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="bi-monthly">Bi-Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>

          {showDayOfMonth && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Day of month</label>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="31">Last day of month</option>
              </select>
            </div>
          )}
        </div>

        {category === 'yearly' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-neutral-700">Month</label>
              <select
                value={yearlyMonth}
                onChange={(e) => setYearlyMonth(e.target.value)}
                className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="Day"
              type="number"
              min={1}
              max={31}
              value={yearlyDay}
              onChange={(e) => setYearlyDay(e.target.value)}
            />
          </div>
        )}

        {category === 'one-time' && (
          <Input
            label="Date"
            type="date"
            value={oneTimeDate}
            onChange={(e) => setOneTimeDate(e.target.value)}
          />
        )}

        {showMonthPicker && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Applicable months</p>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleMonth(i + 1)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    selectedMonths.includes(i + 1)
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-1">Leave blank to apply every period</p>
          </div>
        )}

        {showWeekdayPicker && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Days of week *</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_SHORT.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeekday(i)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    selectedWeekdays.includes(i)
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700">Deadline mode</p>
          <div className="flex gap-4">
            {(['auto', 'manual'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 text-sm text-neutral-700 cursor-pointer">
                <input
                  type="radio"
                  name="ct-deadline-mode"
                  checked={deadlineMode === mode}
                  onChange={() => setDeadlineMode(mode)}
                  className="accent-neutral-900"
                />
                {mode === 'auto' ? 'Auto (from frequency)' : 'Manual (I set the next deadline)'}
              </label>
            ))}
          </div>
          {deadlineMode === 'manual' && (
            <Input
              label="Next deadline *"
              type="date"
              value={manualDeadline}
              onChange={(e) => setManualDeadline(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-700 flex-shrink-0">Show in dashboard:</span>
          <input
            type="number"
            min={0}
            max={3650}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Number(e.target.value))}
            className="w-20 rounded border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <span className="text-xs text-neutral-400">days before deadline</span>
        </div>

        <div className="border-t border-neutral-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Optional</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Website name" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} placeholder="e.g. LHDN" />
            <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Login username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="username" />
            <Input label="Login notes" value={loginNotes} onChange={(e) => setLoginNotes(e.target.value)} placeholder="e.g. use old phone OTP" />
          </div>
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{initial ? 'Save changes' : 'Add task'}</Button>
        </div>
      </div>
    </div>
  )
}

interface ClientFormProps {
  client?: Client
  assignments?: ClientTemplateAssignment[]
  onSave: () => void
  onCancel: () => void
  renderFooter?: (buttons: React.ReactNode) => void
}

export function ClientForm({ client, assignments, onSave, onCancel, renderFooter }: ClientFormProps) {
  const { templates, saveClient, setClientAssignments, clientCustomTasks: allCustomTasks, saveClientCustomTask, deleteClientCustomTask } = useStore()
  const isEdit = !!client
  const existingCustomTasks = allCustomTasks.filter((ct) => ct.clientId === client?.id)

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
  const [deadlineModes, setDeadlineModes] = useState<Record<string, 'auto' | 'manual'>>(
    Object.fromEntries((assignments ?? []).map((a) => [a.templateId, a.deadlineMode ?? 'auto']))
  )
  const [manualDeadlines, setManualDeadlines] = useState<Record<string, string>>(
    Object.fromEntries(
      (assignments ?? []).filter((a) => a.manualDeadline).map((a) => [a.templateId, a.manualDeadline!])
    )
  )
  const [leadTimeDaysMap, setLeadTimeDaysMap] = useState<Record<string, number>>(
    Object.fromEntries((assignments ?? []).map((a) => [a.templateId, a.leadTimeDays ?? 0]))
  )
  const [loginUsernames, setLoginUsernames] = useState<Record<string, string>>(
    Object.fromEntries((assignments ?? []).filter((a) => a.loginUsername).map((a) => [a.templateId, a.loginUsername!]))
  )
  const [loginNotesMap, setLoginNotesMap] = useState<Record<string, string>>(
    Object.fromEntries((assignments ?? []).filter((a) => a.loginNotes).map((a) => [a.templateId, a.loginNotes!]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customTasks, setCustomTasks] = useState<ClientCustomTask[]>(existingCustomTasks)
  const [deletedCustomTaskIds, setDeletedCustomTaskIds] = useState<Set<string>>(new Set())
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingCustomTask, setEditingCustomTask] = useState<ClientCustomTask | null>(null)
  const [confirmDeleteCustom, setConfirmDeleteCustom] = useState<string | null>(null)

  const grouped = {
    weekly: templates.filter((t) => t.category === 'weekly'),
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
    // Validate anniversary dates are set for all anniversary-based templates
    const missingAnniversary = Array.from(selectedTemplates).find((tid) => {
      const tmpl = templates.find((t) => t.id === tid)
      return tmpl?.deadlineRule.type === 'anniversary-based' && !anniversaryDates[tid]
    })
    if (missingAnniversary) {
      const tmpl = templates.find((t) => t.id === missingAnniversary)
      setError(`Anniversary date is required for "${tmpl?.name}". Set it in the Compliance Tasks section.`)
      return
    }

    setSaving(true)
    try {
      const savedClientId = client?.id ?? nanoid()
      const saved: Client = {
        id: savedClientId,
        name: name.trim(),
        ssmNumber: ssmNumber.trim() || undefined,
        tinNumber: tinNumber.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
        isActive,
        createdAt: client?.createdAt ?? new Date(),
      }
      await saveClient(saved)
      await setClientAssignments(savedClientId, Array.from(selectedTemplates), clientNote.trim() || undefined, anniversaryDates, deadlineModes, manualDeadlines, leadTimeDaysMap, loginUsernames, loginNotesMap)
      // Delete removed custom tasks
      for (const id of deletedCustomTaskIds) {
        await deleteClientCustomTask(id, savedClientId)
      }
      // Save new/modified custom tasks
      for (const ct of customTasks) {
        await saveClientCustomTask({ ...ct, clientId: savedClientId })
      }
      onSave()
    } finally {
      setSaving(false)
    }
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
                    const isSelected = selectedTemplates.has(t.id)
                    const showLeadTime = isSelected && t.category !== 'monthly' && t.category !== 'weekly' && t.category !== 'one-time'
                    const currentMode = deadlineModes[t.id] ?? 'auto'
                    const currentLeadTime = leadTimeDaysMap[t.id] ?? getDefaultLeadTime(t.category)
                    return (
                      <div key={t.id}>
                        <label className="flex items-start gap-2 text-sm text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTemplate(t.id)}
                            className="mt-0.5 accent-neutral-900"
                          />
                          <div>
                            <span>{t.name}</span>
                            {t.nameZh && <span className="ml-1 text-xs text-neutral-400">{t.nameZh}</span>}
                          </div>
                        </label>

                        {isSelected && (
                          <div className="ml-6 mt-2 space-y-2">
                            {/* Anniversary date */}
                            {isAnniversary && (
                              <Input
                                label={`Anniversary date for ${t.name}`}
                                type="date"
                                value={anniversaryDates[t.id] ?? ''}
                                onChange={(e) =>
                                  setAnniversaryDates((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                              />
                            )}

                            {/* Deadline mode */}
                            {showLeadTime && (
                              <div className="space-y-2">
                                <div className="flex gap-4">
                                  {(['auto', 'manual'] as const).map((mode) => (
                                    <label key={mode} className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`mode-${t.id}`}
                                        checked={currentMode === mode}
                                        onChange={() => setDeadlineModes((prev) => ({ ...prev, [t.id]: mode }))}
                                        className="accent-neutral-900"
                                      />
                                      {mode === 'auto' ? 'Auto (from template)' : 'Manual deadline'}
                                    </label>
                                  ))}
                                </div>

                                {currentMode === 'manual' && (
                                  <Input
                                    label="Next deadline"
                                    type="date"
                                    value={manualDeadlines[t.id] ?? ''}
                                    onChange={(e) =>
                                      setManualDeadlines((prev) => ({ ...prev, [t.id]: e.target.value }))
                                    }
                                  />
                                )}

                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-neutral-500">Show in dashboard:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={3650}
                                    value={currentLeadTime}
                                    onChange={(e) =>
                                      setLeadTimeDaysMap((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
                                    }
                                    className="w-20 rounded border border-neutral-200 px-2 py-1 text-xs focus:border-neutral-900 focus:outline-none"
                                  />
                                  <span className="text-xs text-neutral-400">days before deadline</span>
                                </div>
                              </div>
                            )}

                            {/* Login username */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500 w-28 flex-shrink-0">Login username:</span>
                                <input
                                  type="text"
                                  value={loginUsernames[t.id] ?? ''}
                                  onChange={(e) =>
                                    setLoginUsernames((prev) => ({ ...prev, [t.id]: e.target.value }))
                                  }
                                  placeholder="e.g. ACME_EPF_2020"
                                  className="flex-1 rounded border border-neutral-200 px-2 py-1 text-xs focus:border-neutral-900 focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500 w-28 flex-shrink-0">Login notes:</span>
                                <input
                                  type="text"
                                  value={loginNotesMap[t.id] ?? ''}
                                  onChange={(e) =>
                                    setLoginNotesMap((prev) => ({ ...prev, [t.id]: e.target.value }))
                                  }
                                  placeholder="e.g. use old phone for OTP"
                                  className="flex-1 rounded border border-neutral-200 px-2 py-1 text-xs focus:border-neutral-900 focus:outline-none"
                                />
                              </div>
                            </div>
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

      {/* Custom Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-700">Custom Tasks</p>
          <button
            type="button"
            onClick={() => { setEditingCustomTask(null); setShowCustomModal(true) }}
            className="text-xs font-medium text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
          >
            + Add Custom
          </button>
        </div>
        {customTasks.length === 0 && (
          <p className="text-xs text-neutral-400">No custom tasks yet.</p>
        )}
        <div className="space-y-2">
          {customTasks.map((ct) => (
            <div key={ct.id} className="border border-neutral-200 rounded px-3 py-2.5 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-neutral-900">{ct.name}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {categoryLabels[ct.category] ?? ct.category}
                    {ct.deadlineMode === 'manual' && ct.manualDeadline ? ` · Manual · ${ct.manualDeadline}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => { setEditingCustomTask(ct); setShowCustomModal(true) }}
                    className="text-xs text-neutral-400 hover:text-neutral-700">Edit</button>
                  <button type="button" onClick={() => setConfirmDeleteCustom(ct.id)}
                    className="text-xs text-neutral-400 hover:text-red-600">Delete</button>
                </div>
              </div>
            </div>
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

      {showCustomModal && (
        <CustomTaskModal
          initial={editingCustomTask}
          clientId={client?.id ?? ''}
          onSave={(ct) => {
            if (editingCustomTask) {
              setCustomTasks((prev) => prev.map((t) => t.id === ct.id ? ct : t))
            } else {
              setCustomTasks((prev) => [...prev, ct])
            }
            setShowCustomModal(false)
          }}
          onCancel={() => setShowCustomModal(false)}
        />
      )}

      {confirmDeleteCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteCustom(null)} />
          <div className="relative bg-white border border-neutral-200 rounded-xl p-6 w-full max-w-sm shadow-lg space-y-4">
            <h2 className="text-base font-medium text-neutral-900">Delete custom task?</h2>
            <p className="text-sm text-neutral-500">Pending tasks will be removed. Completed tasks are preserved in history.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDeleteCustom(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => {
                const id = confirmDeleteCustom
                setCustomTasks((prev) => prev.filter((t) => t.id !== id))
                if (existingCustomTasks.some((t) => t.id === id)) {
                  setDeletedCustomTaskIds((prev) => new Set([...prev, id]))
                }
                setConfirmDeleteCustom(null)
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
