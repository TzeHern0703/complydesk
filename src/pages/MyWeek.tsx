import { useState, useMemo, useEffect } from 'react'
import { addWeeks, addDays, format, isToday, isBefore } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useStore } from '../store/useStore'
import type { PersonalTask, RecurringWeeklyInstance } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  getWeekStart,
  getWeekDays,
  weekStartToString,
  formatTime12h,
  WEEKDAY_LABELS,
  WEEKDAY_DISPLAY_ORDER,
  isCurrentWeek,
  isPastWeek,
} from '../lib/weekUtils'

// ── Forms ──────────────────────────────────────────────────────────────────────

function OneTimeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<PersonalTask>
  onSave: (d: Pick<PersonalTask, 'title' | 'notes' | 'scheduledWeekday' | 'scheduledTime'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [day, setDay] = useState(
    initial?.scheduledWeekday !== undefined ? String(initial.scheduledWeekday) : ''
  )
  const [time, setTime] = useState(initial?.scheduledTime ?? '')
  const [error, setError] = useState('')

  return (
    <div className="space-y-4">
      {error && <p className="text-sm font-medium text-neutral-900">{error}</p>}
      <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Day of week</label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Unscheduled</option>
            {WEEKDAY_DISPLAY_ORDER.map((d) => (
              <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <Input label="Time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => {
          if (!title.trim()) { setError('Title is required'); return }
          onSave({
            title: title.trim(),
            notes: notes.trim() || undefined,
            scheduledWeekday: day !== '' ? Number(day) : undefined,
            scheduledTime: time || undefined,
          })
        }}>Save</Button>
      </div>
    </div>
  )
}

function RecurringForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<PersonalTask>
  onSave: (d: Pick<PersonalTask, 'title' | 'notes' | 'recurringWeekdays' | 'recurringTime'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.recurringWeekdays ?? [])
  const [time, setTime] = useState(initial?.recurringTime ?? '')
  const [error, setError] = useState('')

  function toggle(d: number) {
    setWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm font-medium text-neutral-900">{error}</p>}
      <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">Repeat on *</p>
        <div className="flex gap-2 flex-wrap">
          {WEEKDAY_DISPLAY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`w-10 h-10 rounded text-xs font-medium border transition-colors ${
                weekdays.includes(d)
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              {WEEKDAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>
      <Input label="Time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => {
          if (!title.trim()) { setError('Title is required'); return }
          if (weekdays.length === 0) { setError('Select at least one day'); return }
          onSave({
            title: title.trim(),
            notes: notes.trim() || undefined,
            recurringWeekdays: weekdays,
            recurringTime: time || undefined,
          })
        }}>Save</Button>
      </div>
    </div>
  )
}

function TodoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<PersonalTask>
  onSave: (d: Pick<PersonalTask, 'title' | 'notes' | 'deadline'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [error, setError] = useState('')

  return (
    <div className="space-y-4">
      {error && <p className="text-sm font-medium text-neutral-900">{error}</p>}
      <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <Input label="Deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => {
          if (!title.trim()) { setError('Title is required'); return }
          onSave({ title: title.trim(), notes: notes.trim() || undefined, deadline: deadline || undefined })
        }}>Save</Button>
      </div>
    </div>
  )
}

// ── Task Rows ──────────────────────────────────────────────────────────────────

function PersonalTaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  readonly,
}: {
  task: PersonalTask
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  readonly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const done = task.status === 'completed'
  const time = task.scheduledTime ? formatTime12h(task.scheduledTime) : null
  const isOverdue =
    task.type === 'todo' &&
    task.deadline &&
    isBefore(new Date(task.deadline + 'T23:59:59'), new Date()) &&
    !done

  return (
    <div className={`border border-neutral-200 rounded bg-white ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          disabled={readonly}
          className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
            done ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300 hover:border-neutral-900'
          } disabled:cursor-default`}
        >
          {done && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${done ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
            {task.title}
          </span>
          {time && <span className="text-xs text-neutral-400">{time}</span>}
          {isOverdue && <span className="text-xs text-red-500">Overdue</span>}
          {task.deadline && !done && (
            <span className="text-xs text-neutral-400">
              due {format(new Date(task.deadline + 'T00:00:00'), 'd MMM')}
            </span>
          )}
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-neutral-300 hover:text-neutral-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-3 space-y-2">
          {task.notes && <p className="text-xs text-neutral-500">{task.notes}</p>}
          {!readonly && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={onDelete}>Delete</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecurringInstanceRow({
  instance,
  task,
  onToggle,
  onEditTask,
  onDeleteTask,
  readonly,
}: {
  instance: RecurringWeeklyInstance
  task: PersonalTask
  onToggle: () => void
  onEditTask: () => void
  onDeleteTask: () => void
  readonly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const done = instance.status === 'completed'
  const time = task.recurringTime ? formatTime12h(task.recurringTime) : null
  const pattern = (task.recurringWeekdays ?? []).map((d) => WEEKDAY_LABELS[d]).join(', ')

  return (
    <div className={`border border-neutral-200 rounded bg-white ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          disabled={readonly}
          className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
            done ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300 hover:border-neutral-900'
          } disabled:cursor-default`}
        >
          {done && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${done ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
            {task.title}
          </span>
          {time && <span className="text-xs text-neutral-400">{time}</span>}
          <span className="text-xs text-neutral-400">every {pattern}</span>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-neutral-300 hover:text-neutral-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-3 space-y-2">
          {task.notes && <p className="text-xs text-neutral-500">{task.notes}</p>}
          {!readonly && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onEditTask}>Edit recurring</Button>
              <Button size="sm" variant="ghost" onClick={onDeleteTask}>Delete recurring</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function MyWeek() {
  const {
    personalTasks,
    recurringInstances,
    savePersonalTask,
    deletePersonalTask,
    updatePersonalTaskStatus,
    updateRecurringInstanceStatus,
    ensureRecurringInstancesForWeek,
  } = useStore()

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [showCompletedTodos, setShowCompletedTodos] = useState(false)
  const [addOneTimeOpen, setAddOneTimeOpen] = useState(false)
  const [addOneTimeDay, setAddOneTimeDay] = useState<number | undefined>()
  const [addRecurringOpen, setAddRecurringOpen] = useState(false)
  const [addTodoOpen, setAddTodoOpen] = useState(false)
  const [editTask, setEditTask] = useState<PersonalTask | undefined>()
  const [deleteId, setDeleteId] = useState<string | undefined>()

  const weekStartStr = weekStartToString(weekStart)
  const weekDays = getWeekDays(weekStart)
  const isPast = isPastWeek(weekStart)
  const isCurrent = isCurrentWeek(weekStart)
  const weekEnd = addDays(weekStart, 6)

  // Ensure instances exist when week changes
  useEffect(() => {
    ensureRecurringInstancesForWeek(weekStartStr)
  }, [weekStartStr])

  const recurringTaskMap = useMemo(() => {
    const m = new Map<string, PersonalTask>()
    personalTasks.filter((t) => t.type === 'recurring-weekly').forEach((t) => m.set(t.id, t))
    return m
  }, [personalTasks])

  const oneTimeTasks = personalTasks.filter(
    (t) => t.type === 'one-time-weekly' && t.weekStart === weekStartStr
  )
  const thisWeekInstances = recurringInstances.filter((i) => i.weekStart === weekStartStr)
  const todos = personalTasks.filter((t) => t.type === 'todo')

  const pendingTodos = [...todos.filter((t) => t.status === 'pending')].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const completedTodos = [...todos.filter((t) => t.status === 'completed')].sort(
    (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
  )

  async function handleAddOneTime(data: Pick<PersonalTask, 'title' | 'notes' | 'scheduledWeekday' | 'scheduledTime'>) {
    await savePersonalTask({ id: nanoid(), type: 'one-time-weekly', weekStart: weekStartStr, status: 'pending', createdAt: new Date(), ...data })
    setAddOneTimeOpen(false)
  }

  async function handleAddRecurring(data: Pick<PersonalTask, 'title' | 'notes' | 'recurringWeekdays' | 'recurringTime'>) {
    await savePersonalTask({ id: nanoid(), type: 'recurring-weekly', status: 'pending', createdAt: new Date(), ...data })
    setAddRecurringOpen(false)
  }

  async function handleAddTodo(data: Pick<PersonalTask, 'title' | 'notes' | 'deadline'>) {
    await savePersonalTask({ id: nanoid(), type: 'todo', status: 'pending', createdAt: new Date(), ...data })
    setAddTodoOpen(false)
  }

  async function handleEditSave(data: Pick<PersonalTask, 'title' | 'notes'> & Partial<PersonalTask>) {
    if (editTask) {
      await savePersonalTask({ ...editTask, ...data })
      setEditTask(undefined)
    }
  }

  async function handleDelete() {
    if (deleteId) {
      await deletePersonalTask(deleteId)
      setDeleteId(undefined)
    }
  }

  const deleteTarget = personalTasks.find((t) => t.id === deleteId)

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">My Week</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
            <ChevronLeft size={14} />
          </Button>
          {!isCurrent && (
            <Button variant="secondary" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Today
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {isPast && (
        <div className="bg-neutral-50 border border-neutral-200 rounded px-4 py-2 text-sm text-neutral-500">
          Viewing past week — read only.
        </div>
      )}

      {!isPast && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => { setAddOneTimeDay(undefined); setAddOneTimeOpen(true) }}>
            <Plus size={14} /> Add Task
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAddRecurringOpen(true)}>
            <Plus size={14} /> Add Recurring
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAddTodoOpen(true)}>
            <Plus size={14} /> Add To-Do
          </Button>
        </div>
      )}

      {/* Recurring Section */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Recurring</h2>
        {recurringTaskMap.size === 0 ? (
          <p className="text-sm text-neutral-400">
            No recurring tasks yet.{!isPast && (
              <button onClick={() => setAddRecurringOpen(true)} className="ml-1 underline underline-offset-2 text-neutral-900">
                Add one
              </button>
            )}
          </p>
        ) : thisWeekInstances.length === 0 ? (
          <p className="text-sm text-neutral-400">No recurring instances for this week.</p>
        ) : (
          <div className="space-y-4">
            {WEEKDAY_DISPLAY_ORDER.map((wd) => {
              const instances = thisWeekInstances.filter((i) => i.weekday === wd)
              if (instances.length === 0) return null
              return (
                <div key={wd}>
                  <p className="text-xs font-medium text-neutral-500 mb-1.5">{WEEKDAY_LABELS[wd]}</p>
                  <div className="space-y-2">
                    {instances.map((inst) => {
                      const rt = recurringTaskMap.get(inst.recurringTaskId)
                      if (!rt) return null
                      return (
                        <RecurringInstanceRow
                          key={inst.id}
                          instance={inst}
                          task={rt}
                          onToggle={() => updateRecurringInstanceStatus(inst.id, inst.status === 'completed' ? 'pending' : 'completed')}
                          onEditTask={() => setEditTask(rt)}
                          onDeleteTask={() => setDeleteId(rt.id)}
                          readonly={isPast}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* This Week Section */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">This Week</h2>
        <div className="space-y-3">
          {weekDays.map((day) => {
            const wd = day.getDay()
            const dayTasks = oneTimeTasks.filter((t) => t.scheduledWeekday === wd)
            const today = isToday(day)
            return (
              <div key={wd} className={`rounded p-3 ${today ? 'bg-neutral-50 border border-neutral-200' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`text-xs font-medium ${today ? 'text-neutral-900' : 'text-neutral-500'}`}>
                    {format(day, 'EEE d MMM')}
                    {today && <span className="ml-1.5 font-normal text-neutral-400">Today</span>}
                  </p>
                  {!isPast && (
                    <button
                      onClick={() => { setAddOneTimeDay(wd); setAddOneTimeOpen(true) }}
                      className="text-neutral-300 hover:text-neutral-700 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-neutral-300 pl-0.5">empty</p>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map((t) => (
                      <PersonalTaskRow
                        key={t.id}
                        task={t}
                        onToggle={() => updatePersonalTaskStatus(t.id, t.status === 'completed' ? 'pending' : 'completed')}
                        onEdit={() => setEditTask(t)}
                        onDelete={() => setDeleteId(t.id)}
                        readonly={isPast}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Unscheduled */}
          <div className="pt-1">
            <p className="text-xs font-medium text-neutral-500 mb-1.5">Unscheduled</p>
            {oneTimeTasks.filter((t) => t.scheduledWeekday === undefined).length === 0 ? (
              <p className="text-xs text-neutral-300">empty</p>
            ) : (
              <div className="space-y-2">
                {oneTimeTasks
                  .filter((t) => t.scheduledWeekday === undefined)
                  .map((t) => (
                    <PersonalTaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => updatePersonalTaskStatus(t.id, t.status === 'completed' ? 'pending' : 'completed')}
                      onEdit={() => setEditTask(t)}
                      onDelete={() => setDeleteId(t.id)}
                      readonly={isPast}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* To-Do Section */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">To-Do</h2>
        {pendingTodos.length === 0 && completedTodos.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No to-dos yet.{' '}
            <button onClick={() => setAddTodoOpen(true)} className="underline underline-offset-2 text-neutral-900">
              Add one
            </button>
          </p>
        ) : (
          <div className="space-y-2">
            {pendingTodos.map((t) => (
              <PersonalTaskRow
                key={t.id}
                task={t}
                onToggle={() => updatePersonalTaskStatus(t.id, 'completed')}
                onEdit={() => setEditTask(t)}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}

            {completedTodos.length > 0 && (
              <button
                onClick={() => setShowCompletedTodos((v) => !v)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 mt-2"
              >
                {showCompletedTodos ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showCompletedTodos ? 'Hide' : 'Show'} completed ({completedTodos.length})
              </button>
            )}

            {showCompletedTodos &&
              completedTodos.map((t) => (
                <PersonalTaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => updatePersonalTaskStatus(t.id, 'pending')}
                  onEdit={() => setEditTask(t)}
                  onDelete={() => setDeleteId(t.id)}
                />
              ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <Modal open={addOneTimeOpen} onClose={() => setAddOneTimeOpen(false)} title="Add Task">
        <OneTimeForm
          initial={{ scheduledWeekday: addOneTimeDay }}
          onSave={handleAddOneTime}
          onCancel={() => setAddOneTimeOpen(false)}
        />
      </Modal>

      <Modal open={addRecurringOpen} onClose={() => setAddRecurringOpen(false)} title="Add Recurring Task">
        <RecurringForm onSave={handleAddRecurring} onCancel={() => setAddRecurringOpen(false)} />
      </Modal>

      <Modal open={addTodoOpen} onClose={() => setAddTodoOpen(false)} title="Add To-Do">
        <TodoForm onSave={handleAddTodo} onCancel={() => setAddTodoOpen(false)} />
      </Modal>

      {editTask && (
        <Modal
          open
          onClose={() => setEditTask(undefined)}
          title={editTask.type === 'recurring-weekly' ? 'Edit Recurring Task' : editTask.type === 'todo' ? 'Edit To-Do' : 'Edit Task'}
        >
          {editTask.type === 'one-time-weekly' && (
            <OneTimeForm
              initial={editTask}
              onSave={(d) => handleEditSave(d)}
              onCancel={() => setEditTask(undefined)}
            />
          )}
          {editTask.type === 'recurring-weekly' && (
            <RecurringForm
              initial={editTask}
              onSave={(d) => handleEditSave(d)}
              onCancel={() => setEditTask(undefined)}
            />
          )}
          {editTask.type === 'todo' && (
            <TodoForm
              initial={editTask}
              onSave={(d) => handleEditSave(d)}
              onCancel={() => setEditTask(undefined)}
            />
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        onConfirm={handleDelete}
        title="Delete task"
        message={
          deleteTarget?.type === 'recurring-weekly'
            ? 'Delete this recurring task? All instances will be removed.'
            : 'Delete this task?'
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
