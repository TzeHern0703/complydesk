import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'

export function Calendar() {
  const { tasks, clients, templates } = useStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const clientMap = new Map(clients.map((c) => [c.id, c]))
  const templateMap = new Map(templates.map((t) => [t.id, t]))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)
  const paddedDays = [...Array(startPad).fill(null), ...days]

  const monthTasks = tasks.filter((t) => {
    const d = new Date(t.deadline)
    return isSameMonth(d, currentMonth) && t.status !== 'skipped'
  })

  function tasksForDay(day: Date): Task[] {
    return monthTasks.filter((t) => isSameDay(new Date(t.deadline), day))
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="text-neutral-400 hover:text-neutral-700">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-neutral-700 min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="text-neutral-400 hover:text-neutral-700">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded overflow-hidden">
        <div className="grid grid-cols-7 border-b border-neutral-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-neutral-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {paddedDays.map((day, i) => {
            if (!day) {
              return <div key={`pad-${i}`} className="min-h-[80px] border-r border-b border-neutral-50" />
            }
            const dayTasks = tasksForDay(day)
            const isToday = isSameDay(day, new Date())
            return (
              <div key={day.toISOString()} className="min-h-[80px] border-r border-b border-neutral-100 p-1.5">
                <div className={`text-xs mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-500'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const client = clientMap.get(task.clientId)
                    const template = templateMap.get(task.templateId)
                    const isCompleted = task.status === 'completed'
                    return (
                      <div
                        key={task.id}
                        className={`text-xs truncate rounded px-1 py-0.5 ${
                          isCompleted
                            ? 'text-neutral-400 line-through'
                            : new Date(task.deadline) < new Date()
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                        title={`${client?.name}: ${template?.name}`}
                      >
                        {client?.name.split(' ')[0]}: {template?.name.split(' ')[0]}
                      </div>
                    )
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-neutral-400 px-1">+{dayTasks.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
