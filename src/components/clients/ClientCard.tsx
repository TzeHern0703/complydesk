import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Client, Task } from '../../types'

interface ClientCardProps {
  client: Client
  tasks: Task[]
}

export function ClientCard({ client, tasks }: ClientCardProps) {
  const navigate = useNavigate()
  const overdue = tasks.filter((t) => t.status === 'pending' && new Date(t.deadline) < new Date()).length
  const completed = tasks.filter((t) => t.status === 'completed').length
  const total = tasks.filter((t) => t.status !== 'skipped').length

  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className="w-full text-left bg-white border border-neutral-200 rounded p-4 hover:border-neutral-400 transition-colors flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 truncate">{client.name}</span>
          {!client.isActive && (
            <span className="text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">Inactive</span>
          )}
          {overdue > 0 && (
            <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900" />
              {overdue} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {client.ssmNumber && (
            <span className="text-xs text-neutral-400">SSM: {client.ssmNumber}</span>
          )}
          {client.tags.length > 0 && (
            <div className="flex gap-1">
              {client.tags.map((tag) => (
                <span key={tag} className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {completed}/{total} tasks completed
        </p>
      </div>
      <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
    </button>
  )
}
