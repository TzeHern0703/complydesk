import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Task, Client, TaskTemplate } from '../../types'
import { TaskRow } from './TaskRow'

interface TaskSectionProps {
  title: string
  tasks: Task[]
  clients: Client[]
  templates: TaskTemplate[]
  defaultCollapsed?: boolean
  showClient?: boolean
  emptyMessage?: string
}

export function TaskSection({
  title,
  tasks,
  clients,
  templates,
  defaultCollapsed = false,
  showClient = true,
  emptyMessage,
}: TaskSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const clientMap = new Map(clients.map((c) => [c.id, c]))
  const templateMap = new Map(templates.map((t) => [t.id, t]))

  if (tasks.length === 0 && emptyMessage === undefined) return null

  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </span>
        <span className="text-xs text-neutral-400">({tasks.length})</span>
        <span className="ml-auto text-neutral-400">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-neutral-400 py-2">{emptyMessage ?? 'No tasks.'}</p>
          ) : (
            tasks.map((task) => {
              const client = clientMap.get(task.clientId)
              const template = templateMap.get(task.templateId)
              if (!client || !template) return null
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  client={client}
                  template={template}
                  showClient={showClient}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
