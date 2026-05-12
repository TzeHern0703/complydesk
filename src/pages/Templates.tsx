import { useState } from 'react'
import { Plus, ExternalLink, Trash2, Edit } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useStore } from '../store/useStore'
import type { TaskTemplate, DeadlineRule } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

const categoryLabels: Record<string, string> = {
  monthly: 'Monthly',
  'bi-monthly': 'Bi-Monthly',
  'half-yearly': 'Half-Yearly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  'one-time': 'One-time',
  weekly: 'Weekly',
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function Templates() {
  const { templates, saveTemplate, deleteTemplate } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | undefined>()
  const [deleteId, setDeleteId] = useState<string | undefined>()

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900 dark:text-white">Templates</h1>
        <Button variant="primary" onClick={() => { setEditTemplate(undefined); setShowForm(true) }}>
          <Plus size={14} />
          New template
        </Button>
      </div>

      <div className="space-y-2">
        {templates.length === 0 ? (
          <EmptyState
            title="No templates"
            description="Create your first compliance task template."
          />
        ) : (
          templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={() => { setEditTemplate(t); setShowForm(true) }}
              onDelete={() => setDeleteId(t.id)}
            />
          ))
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTemplate ? 'Edit Template' : 'New Template'}
        size="lg"
      >
        <TemplateForm
          template={editTemplate}
          onSave={async (t) => {
            await saveTemplate(t)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        onConfirm={() => deleteId && deleteTemplate(deleteId)}
        title="Delete template"
        message="Delete this template? Existing tasks will remain, but no new tasks will be generated."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

function TemplateRow({
  template,
  onEdit,
  onDelete,
}: {
  template: TaskTemplate
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-neutral-900 dark:text-white">{template.name}</span>
          {template.nameZh && <span className="text-xs text-neutral-400 dark:text-zinc-500">{template.nameZh}</span>}
          <Badge>{categoryLabels[template.category] ?? template.category}</Badge>
        </div>
        <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5 truncate">{template.description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={template.governmentWebsite.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 dark:text-zinc-500 hover:text-neutral-900 dark:hover:text-white"
          title={template.governmentWebsite.name}
        >
          <ExternalLink size={14} />
        </a>
        <button onClick={onEdit} className="text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300">
          <Edit size={14} />
        </button>
        <button onClick={onDelete} className="text-neutral-400 dark:text-zinc-500 hover:text-neutral-900 dark:hover:text-white">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template?: TaskTemplate
  onSave: (t: TaskTemplate) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [nameZh, setNameZh] = useState(template?.nameZh ?? '')
  const [category, setCategory] = useState<TaskTemplate['category']>(template?.category ?? 'monthly')
  const [deadlineType, setDeadlineType] = useState<DeadlineRule['type']>(
    template?.deadlineRule.type ?? 'day-of-month'
  )
  const [dayOfMonth, setDayOfMonth] = useState(String(template?.deadlineRule.dayOfMonth ?? 15))
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    template?.deadlineRule.monthsOfYear ?? []
  )
  const [yearlyMonth, setYearlyMonth] = useState(String(template?.deadlineRule.dayOfYear?.month ?? 3))
  const [yearlyDay, setYearlyDay] = useState(String(template?.deadlineRule.dayOfYear?.day ?? 31))
  const [oneTimeDate, setOneTimeDate] = useState(template?.deadlineRule.oneTimeDate ?? '')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    template?.deadlineRule.weekdays ?? []
  )
  const [websiteName, setWebsiteName] = useState(template?.governmentWebsite.name ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(template?.governmentWebsite.url ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
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

  function handleSave() {
    if (!name.trim() || !websiteUrl.trim()) {
      setError('Name and website URL are required')
      return
    }
    if (category === 'weekly' && selectedWeekdays.length === 0) {
      setError('Select at least one day of the week')
      return
    }

    let rule: DeadlineRule
    if (category === 'weekly') {
      rule = { type: 'weekly', weekdays: selectedWeekdays }
    } else if (category === 'yearly' && deadlineType === 'anniversary-based') {
      rule = { type: 'anniversary-based' }
    } else if (category === 'yearly' && deadlineType === 'day-of-year') {
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

    const t: TaskTemplate = {
      id: template?.id ?? nanoid(),
      name: name.trim(),
      nameZh: nameZh.trim(),
      category,
      deadlineRule: rule,
      governmentWebsite: {
        name: websiteName.trim(),
        url: websiteUrl.trim(),
      },
      description: description.trim(),
      isSystemDefault: template?.isSystemDefault ?? false,
    }
    onSave(t)
  }

  const showMonthPicker = ['bi-monthly', 'quarterly', 'half-yearly'].includes(category)
  const showDayOfMonth = category !== 'yearly' && category !== 'one-time' && category !== 'weekly'
  const showYearlyOptions = category === 'yearly'
  const showWeekdayPicker = category === 'weekly'

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-neutral-900 dark:text-white font-medium">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Name (English) *" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Name (Chinese)" value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-zinc-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskTemplate['category'])}
            className="rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none"
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
            <label className="text-sm font-medium text-neutral-700 dark:text-zinc-300">Day of month</label>
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="31">Last day of month</option>
            </select>
          </div>
        )}

        {showYearlyOptions && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-zinc-300">Deadline type</label>
            <select
              value={deadlineType}
              onChange={(e) => setDeadlineType(e.target.value as DeadlineRule['type'])}
              className="rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none"
            >
              <option value="day-of-year">Fixed date (e.g. March 31)</option>
              <option value="anniversary-based">Anniversary-based (set per client)</option>
            </select>
          </div>
        )}
      </div>

      {showYearlyOptions && deadlineType === 'day-of-year' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-zinc-300">Month</label>
            <select
              value={yearlyMonth}
              onChange={(e) => setYearlyMonth(e.target.value)}
              className="rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none"
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
          <p className="text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-2">Applicable months</p>
          <div className="flex flex-wrap gap-2">
            {MONTHS.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleMonth(i + 1)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  selectedMonths.includes(i + 1)
                    ? 'bg-neutral-900 dark:bg-purple-600 text-white border-neutral-900 dark:border-purple-600'
                    : 'bg-white dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-600 hover:border-neutral-400 dark:hover:border-zinc-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-1">Leave blank to apply every period</p>
        </div>
      )}

      {showWeekdayPicker && (
        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-2">Days of week *</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleWeekday(i)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  selectedWeekdays.includes(i)
                    ? 'bg-neutral-900 dark:bg-purple-600 text-white border-neutral-900 dark:border-purple-600'
                    : 'bg-white dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-600 hover:border-neutral-400 dark:hover:border-zinc-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-1">Select at least one day</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Website Name *" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} />
        <Input label="Website URL *" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      </div>
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>{template ? 'Save changes' : 'Create template'}</Button>
      </div>
    </div>
  )
}
