import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import type { Task, Client, TaskTemplate } from '../../types'
import { formatDeadline, daysUntil, formatPeriodLabel } from '../../lib/dateUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useStore } from '../../store/useStore'
import { Textarea } from '../ui/Input'
import { format } from 'date-fns'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TaskRowProps {
  task: Task
  client: Client
  template: TaskTemplate
  showClient?: boolean
}

export function TaskRow({ task, client, template, showClient = true }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState(
    format(new Date(task.deadline), 'yyyy-MM-dd')
  )
  const { updateTaskStatus, updateTaskNotes, updateTaskDeadline, completeManualTask } = useStore()
  const [showNextDeadline, setShowNextDeadline] = useState(false)
  const [nextDeadlineInput, setNextDeadlineInput] = useState('')
  const [nextLeadTime, setNextLeadTime] = useState(180)

  const days = daysUntil(task.deadline)
  const isCompleted = task.status === 'completed'
  const isPostponed = task.status === 'postponed'
  const isSkipped = task.status === 'skipped'

  const deadlineVariant = isCompleted
    ? 'completed'
    : isPostponed
    ? 'postponed'
    : isSkipped
    ? 'skipped'
    : days < 0
    ? 'overdue'
    : days <= 7
    ? 'soon'
    : 'default'

  async function toggle() {
    if (!isCompleted && task.isManualMode) {
      setShowNextDeadline(true)
      return
    }
    await updateTaskStatus(task.id, isCompleted ? 'pending' : 'completed')
  }

  async function handleSaveNotes() {
    setSaving(true)
    await updateTaskNotes(task.id, notes)
    setSaving(false)
  }

  async function handleSaveDeadline() {
    if (!deadlineInput) return
    const d = new Date(deadlineInput)
    if (isNaN(d.getTime())) return
    await updateTaskDeadline(task.id, d)
    setEditingDeadline(false)
  }

  return (
    <div
      className={`border border-neutral-200 rounded bg-white transition-opacity ${
        isSkipped ? 'opacity-50' : isCompleted ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={toggle}
          className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
            isCompleted
              ? 'bg-neutral-900 border-neutral-900'
              : 'border-neutral-300 hover:border-neutral-900'
          }`}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showClient && (
              <span className="text-xs font-medium text-neutral-400 truncate max-w-[140px]">{client.name}</span>
            )}
            <span
              className={`text-sm font-medium truncate ${
                isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900'
              }`}
            >
              {template.name}
            </span>
            {template.category === 'weekly' && template.deadlineRule.weekdays?.length ? (
              <span className="text-xs text-neutral-400">
                Weekly – {template.deadlineRule.weekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')}
              </span>
            ) : (
              <span className="text-xs text-neutral-400">{formatPeriodLabel(task.periodLabel)}</span>
            )}
            {task.isManualMode && (
              <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">Manual</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={deadlineVariant}>
            {isCompleted
              ? 'Done'
              : isPostponed
              ? 'Postponed'
              : isSkipped
              ? 'Skipped'
              : days < 0
              ? `${Math.abs(days)}d overdue`
              : days === 0
              ? 'Today'
              : days === 1
              ? 'Tomorrow'
              : formatDeadline(task.deadline)}
          </Badge>

          <a
            href={template.governmentWebsite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-neutral-900 transition-colors"
            title={`Open ${template.governmentWebsite.name}`}
          >
            <ExternalLink size={14} />
          </a>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-neutral-300 hover:text-neutral-600 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-3 space-y-3">
          <div className="text-xs text-neutral-500">{template.description}</div>

          <div className="flex flex-wrap gap-3">
            <a
              href={template.governmentWebsite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
            >
              <ExternalLink size={11} />
              {template.governmentWebsite.name}
            </a>
            {template.governmentWebsite.loginUrl && template.governmentWebsite.loginUrl !== template.governmentWebsite.url && (
              <a
                href={template.governmentWebsite.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
              >
                <ExternalLink size={11} />
                Login page
              </a>
            )}
          </div>

          {/* Inline deadline edit */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Deadline:</span>
            {editingDeadline ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
                <button onClick={handleSaveDeadline} className="text-xs text-neutral-900 font-medium hover:underline">
                  Save
                </button>
                <button onClick={() => setEditingDeadline(false)} className="text-xs text-neutral-400 hover:underline">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingDeadline(true)}
                className="text-xs text-neutral-700 hover:underline"
              >
                {formatDeadline(task.deadline)}
              </button>
            )}
          </div>

          <Textarea
            placeholder="Add notes for this task..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!isPostponed && !isSkipped && !isCompleted && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(task.id, 'postponed')}>
                    Postpone
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(task.id, 'skipped')}>
                    Skip
                  </Button>
                </>
              )}
              {(isPostponed || isSkipped) && (
                <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(task.id, 'pending')}>
                  Restore
                </Button>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={saving}>
              {saving ? 'Saving…' : 'Save notes'}
            </Button>
          </div>
        </div>
      )}

      {/* Manual mode: Set Next Deadline modal */}
      {showNextDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNextDeadline(false)} />
          <div className="relative bg-white border border-neutral-200 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg">
            <h2 className="text-base font-medium text-neutral-900">Set Next Deadline</h2>
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-900">{template.name}</span> completed!
              When is the next deadline?
            </p>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-700">Next deadline</label>
                <input
                  type="date"
                  value={nextDeadlineInput}
                  onChange={(e) => setNextDeadlineInput(e.target.value)}
                  className="rounded border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 flex-shrink-0">Show in dashboard:</label>
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={nextLeadTime}
                  onChange={(e) => setNextLeadTime(Number(e.target.value))}
                  className="w-20 rounded border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
                />
                <span className="text-xs text-neutral-400">days before</span>
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await completeManualTask(task.id)
                  setShowNextDeadline(false)
                }}
              >
                Skip for now
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  if (!nextDeadlineInput) return
                  await completeManualTask(task.id, nextDeadlineInput, nextLeadTime)
                  setShowNextDeadline(false)
                }}
              >
                Save & Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
