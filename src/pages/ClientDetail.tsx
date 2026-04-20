import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { TaskSection } from '../components/tasks/TaskSection'
import { ClientForm } from '../components/clients/ClientForm'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Button } from '../components/ui/Button'
import { isOverdue, isDueThisWeek, daysUntil } from '../lib/dateUtils'
import { db } from '../db/schema'
import type { ClientTemplateAssignment } from '../types'

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients, tasks, templates, deleteClient } = useStore()
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const client = clients.find((c) => c.id === id)
  if (!client || !id) return <div className="p-8 text-neutral-500 text-sm">Client not found.</div>

  const clientTasks = tasks.filter((t) => t.clientId === id)

  const overdue = clientTasks.filter((t) => t.status === 'pending' && isOverdue(t.deadline))
  const thisWeek = clientTasks.filter((t) => t.status === 'pending' && isDueThisWeek(t.deadline))
  const thisMonth = clientTasks.filter(
    (t) => t.status === 'pending' && !isOverdue(t.deadline) && !isDueThisWeek(t.deadline) && daysUntil(t.deadline) <= 31
  )
  const upcoming = clientTasks.filter((t) => t.status === 'pending' && daysUntil(t.deadline) > 31)
  const completed = clientTasks.filter((t) => t.status === 'completed')
  const postponed = clientTasks.filter((t) => t.status === 'postponed')

  async function handleDelete() {
    if (!client) return
    await deleteClient(client.id)
    navigate('/clients')
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 mb-2"
          >
            <ArrowLeft size={14} />
            Clients
          </button>
          <h1 className="text-lg font-medium text-neutral-900">{client.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-400">
            {client.ssmNumber && <span>SSM: {client.ssmNumber}</span>}
            {client.tinNumber && <span>TIN: {client.tinNumber}</span>}
            {!client.isActive && (
              <span className="text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">Inactive</span>
            )}
            {client.tags.map((tag) => (
              <span key={tag} className="bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
          {client.notes && <p className="mt-2 text-sm text-neutral-500">{client.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
            <Edit size={13} />
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setShowDelete(true)}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {overdue.length > 0 && (
        <TaskSection title="Overdue" tasks={overdue} clients={[client]} templates={templates} showClient={false} />
      )}
      <TaskSection title="Due This Week" tasks={thisWeek} clients={[client]} templates={templates} showClient={false} emptyMessage="None" />
      <TaskSection title="Due This Month" tasks={thisMonth} clients={[client]} templates={templates} showClient={false} emptyMessage="None" />
      {upcoming.length > 0 && (
        <TaskSection title="Upcoming" tasks={upcoming} clients={[client]} templates={templates} showClient={false} defaultCollapsed />
      )}
      {completed.length > 0 && (
        <TaskSection title="Completed" tasks={completed} clients={[client]} templates={templates} showClient={false} defaultCollapsed />
      )}
      {postponed.length > 0 && (
        <TaskSection title="Postponed" tasks={postponed} clients={[client]} templates={templates} showClient={false} defaultCollapsed />
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Client" size="lg">
        <EditClientFormWrapper clientId={client.id} onDone={() => setShowEdit(false)} />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete client"
        message={`Delete ${client.name} and all their tasks? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

function EditClientFormWrapper({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { clients } = useStore()
  const [assignments, setAssignments] = useState<ClientTemplateAssignment[]>([])
  const client = clients.find((c) => c.id === clientId)

  useEffect(() => {
    db.assignments.where('clientId').equals(clientId).toArray().then(setAssignments)
  }, [clientId])

  if (!client) return null
  return <ClientForm client={client} assignments={assignments} onSave={onDone} onCancel={onDone} />
}
