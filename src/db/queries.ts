import { db } from './schema'
import { SYSTEM_TEMPLATES } from './seed'
import type { Client, Task, TaskTemplate, ClientTemplateAssignment, EmailMessage, EmailFilter, ClientEmailRule } from '../types'
import { generateTasksForAssignment } from '../lib/taskGenerator'

export async function initializeDB() {
  const settings = await db.settings.get('app')
  if (settings?.isSeeded) return

  await db.taskTemplates.bulkPut(SYSTEM_TEMPLATES)
  await db.settings.put({ id: 'app', passwordEnabled: false, isSeeded: true })
}

// Clients
export async function getAllClients(): Promise<Client[]> {
  return db.clients.orderBy('name').toArray()
}

export async function getClient(id: string): Promise<Client | undefined> {
  return db.clients.get(id)
}

export async function saveClient(client: Client): Promise<void> {
  await db.clients.put(client)
}

export async function deleteClient(id: string): Promise<void> {
  await db.transaction('rw', [db.clients, db.assignments, db.tasks], async () => {
    await db.clients.delete(id)
    const assignments = await db.assignments.where('clientId').equals(id).toArray()
    for (const a of assignments) {
      await db.tasks.where('clientId').equals(id).delete()
      await db.assignments.delete(a.id)
    }
  })
}

// Templates
export async function getAllTemplates(): Promise<TaskTemplate[]> {
  return db.taskTemplates.toArray()
}

export async function getTemplate(id: string): Promise<TaskTemplate | undefined> {
  return db.taskTemplates.get(id)
}

export async function saveTemplate(template: TaskTemplate): Promise<void> {
  await db.taskTemplates.put(template)
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.transaction('rw', [db.taskTemplates, db.assignments, db.tasks], async () => {
    await db.tasks.where('templateId').equals(id).delete()
    await db.assignments.where('templateId').equals(id).delete()
    await db.taskTemplates.delete(id)
  })
}

// Assignments
export async function getAssignmentsForClient(clientId: string): Promise<ClientTemplateAssignment[]> {
  return db.assignments.where('clientId').equals(clientId).toArray()
}

export async function setClientAssignments(
  clientId: string,
  templateIds: string[],
  clientNote?: string,
  anniversaryDates?: Record<string, string>
): Promise<void> {
  await db.transaction('rw', [db.assignments, db.tasks, db.taskTemplates], async () => {
    const existing = await db.assignments.where('clientId').equals(clientId).toArray()
    const existingIds = new Set(existing.map((a) => a.templateId))
    const newIds = new Set(templateIds)

    // Remove unselected
    for (const a of existing) {
      if (!newIds.has(a.templateId)) {
        await db.assignments.delete(a.id)
      }
    }

    // Add new assignments and generate tasks
    for (const templateId of templateIds) {
      const anniversaryDate = anniversaryDates?.[templateId]
      if (!existingIds.has(templateId)) {
        const id = `${clientId}-${templateId}`
        const assignment: ClientTemplateAssignment = {
          id,
          clientId,
          templateId,
          clientNote,
          anniversaryDate,
          createdAt: new Date(),
        }
        await db.assignments.put(assignment)
        const template = await db.taskTemplates.get(templateId)
        if (template) {
          const tasks = generateTasksForAssignment(assignment, template)
          await db.tasks.bulkPut(tasks)
        }
      } else {
        // Update note/anniversary on existing
        const a = existing.find((e) => e.templateId === templateId)!
        await db.assignments.update(a.id, { clientNote, anniversaryDate })
      }
    }
  })
}

// Tasks
export async function getAllTasks(): Promise<Task[]> {
  return db.tasks.toArray()
}

export async function getTasksForClient(clientId: string): Promise<Task[]> {
  return db.tasks.where('clientId').equals(clientId).toArray()
}

export async function updateTaskStatus(id: string, status: Task['status']): Promise<void> {
  const update: Partial<Task> = { status }
  if (status === 'completed') {
    update.completedAt = new Date()
  } else {
    update.completedAt = undefined
  }
  await db.tasks.update(id, update)
}

export async function updateTaskNotes(id: string, notes: string): Promise<void> {
  await db.tasks.update(id, { notes })
}

export async function updateTaskDeadline(id: string, deadline: Date): Promise<void> {
  await db.tasks.update(id, { deadline })
}

export async function ensureTasksGenerated(): Promise<void> {
  const assignments = await db.assignments.toArray()
  const templates = await db.taskTemplates.toArray()
  const templateMap = new Map(templates.map((t) => [t.id, t]))

  for (const assignment of assignments) {
    const template = templateMap.get(assignment.templateId)
    if (!template) continue
    const tasks = generateTasksForAssignment(assignment, template)
    for (const task of tasks) {
      const existing = await db.tasks.get(task.id)
      if (!existing) {
        await db.tasks.put(task)
      }
    }
  }
}

// Settings
export async function getSettings() {
  return db.settings.get('app')
}

export async function updateSettings(data: Partial<{
  passwordHash: string
  passwordEnabled: boolean
  gmailClientId: string
  gmailAccessToken: string
  gmailTokenExpiry: number
  emailFilters: EmailFilter[]
  clientEmailRules: ClientEmailRule[]
}>) {
  await db.settings.update('app', data)
}

// Email messages
export async function getAllEmailMessages(): Promise<EmailMessage[]> {
  return db.emailMessages.orderBy('date').reverse().toArray()
}

export async function saveEmailMessage(msg: EmailMessage): Promise<void> {
  await db.emailMessages.put(msg)
}

export async function bulkSaveEmailMessages(msgs: EmailMessage[]): Promise<void> {
  await db.emailMessages.bulkPut(msgs)
}

export async function updateEmailProcessed(id: string, isProcessed: boolean): Promise<void> {
  await db.emailMessages.update(id, { isProcessed })
}

export async function updateEmailClient(id: string, clientId: string | undefined): Promise<void> {
  await db.emailMessages.update(id, { clientId })
}

// Export / Import
export async function exportData() {
  const [clients, taskTemplates, tasks, assignments, settings] = await Promise.all([
    db.clients.toArray(),
    db.taskTemplates.toArray(),
    db.tasks.toArray(),
    db.assignments.toArray(),
    db.settings.toArray(),
  ])
  return { clients, taskTemplates, tasks, assignments, settings, exportedAt: new Date().toISOString() }
}

export async function importData(
  data: { clients: Client[]; taskTemplates: TaskTemplate[]; tasks: Task[]; assignments: ClientTemplateAssignment[] },
  replace: boolean
) {
  if (replace) {
    await db.transaction('rw', [db.clients, db.taskTemplates, db.tasks, db.assignments, db.settings], async () => {
      await db.clients.clear()
      await db.taskTemplates.clear()
      await db.tasks.clear()
      await db.assignments.clear()
      await db.clients.bulkPut(data.clients)
      await db.taskTemplates.bulkPut(data.taskTemplates)
      await db.tasks.bulkPut(data.tasks)
      await db.assignments.bulkPut(data.assignments)
    })
  } else {
    await db.transaction('rw', [db.clients, db.taskTemplates, db.tasks, db.assignments], async () => {
      await db.clients.bulkPut(data.clients)
      await db.taskTemplates.bulkPut(data.taskTemplates)
      await db.tasks.bulkPut(data.tasks)
      await db.assignments.bulkPut(data.assignments)
    })
  }
}
