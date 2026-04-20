import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ClientCard } from '../components/clients/ClientCard'
import { ClientForm } from '../components/clients/ClientForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'

export function Clients() {
  const { clients, tasks } = useStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ssmNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Clients</h1>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Add client
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name, SSM, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No clients match your search' : 'No clients yet'}
          description={search ? '' : 'Add your first client to get started.'}
          action={
            !search ? (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus size={14} />
                Add client
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              tasks={tasks.filter((t) => t.clientId === client.id)}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Client" size="lg">
        <ClientForm
          onSave={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
