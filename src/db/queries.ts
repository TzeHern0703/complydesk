import { addDays } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from './schema'
import { SYSTEM_TEMPLATES } from './seed'
import type { Client, Task, TaskTemplate, ClientTemplateAssignment, EmailMessage, PersonalTask, RecurringWeeklyInstance, TaskHistory } from '../types'
import { generateTasksForAssignment } from '../lib/taskGenerator'
import { getWeekStart, weekStartToString } from '../lib/weekUtils'
import { getDefaultLeadTime, computeHiddenUntil } from '../lib/leadTime'

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
  const existing = await db.taskTemplates.get(template.id)
  if (existing?.isSystemDefault) throw new Error('System templates cannot be modified')
  await db.taskTemplates.put(template)
}

export async function deleteTemplate(id: string): Promise<void> {
  const existing = await db.taskTemplates.get(id)
  if (existing?.isSystemDefault) throw new Error('System templates cannot be deleted')
  await db.transaction('rw', [db.taskTemplates, db.assignments, db.tasks], async () => {
    await db.tasks.where('templateId').equals(id).delete()
    await db.assignments.where('templateId').equals(id).delete()
    await db.taskTemplates.delete(id)
  })
}

// Assignments
export async function getAllAssignments(): Promise<ClientTemplateAssignment[]> {
  return db.assignments.toArray()
}

export async function getAssignmentsForClient(clientId: string): Promise<ClientTemplateAssignment[]> {
  return db.assignments.where('clientId').equals(clientId).toArray()
}

export async function setClientAssignments(
  clientId: string,
  templateIds: string[],
  clientNote?: string,
  anniversaryDates?: Record<string, string>,
  deadlineModes?: Record<string, 'auto' | 'manual'>,
  manualDeadlines?: Record<string, string>,
  leadTimeDaysMap?: Record<string, number>
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

    // Add new or update existing assignments
    for (const templateId of templateIds) {
      const anniversaryDate = anniversaryDates?.[templateId]
      const template = await db.taskTemplates.get(templateId)
      const newMode = deadlineModes?.[templateId] ?? 'auto'
      const newManualDeadline = newMode === 'manual' ? manualDeadlines?.[templateId] : undefined
      const newLeadTime = leadTimeDaysMap?.[templateId] ?? getDefaultLeadTime(template?.category ?? 'yearly')

      if (!existingIds.has(templateId)) {
        const assignment: ClientTemplateAssignment = {
          id: `${clientId}-${templateId}`,
          clientId,
          templateId,
          clientNote,
          anniversaryDate,
          deadlineMode: newMode,
          manualDeadline: newManualDeadline,
          leadTimeDays: newLeadTime,
          createdAt: new Date(),
        }
        await db.assignments.put(assignment)
        if (template) {
          const tasks = generateTasksForAssignment(assignment, template)
          await db.tasks.bulkPut(tasks)
        }
      } else {
        const a = existing.find((e) => e.templateId === templateId)!
        const oldMode = a.deadlineMode ?? 'auto'
        const oldManualDeadline = a.manualDeadline
        const oldLeadTime = a.leadTimeDays ?? 0

        const modeChanged = oldMode !== newMode
        const deadlineChanged = oldManualDeadline !== newManualDeadline
        const leadTimeChanged = oldLeadTime !== newLeadTime

        await db.assignments.update(a.id, {
          clientNote,
          anniversaryDate,
          deadlineMode: newMode,
          manualDeadline: newManualDeadline,
          leadTimeDays: newLeadTime,
        })

        if ((modeChanged || deadlineChanged) && template) {
          // Delete pending tasks and regenerate with new settings
          const pending = await db.tasks
            .where('templateId').equals(templateId)
            .filter((t) => t.clientId === clientId && t.status === 'pending')
            .toArray()
          for (const t of pending) await db.tasks.delete(t.id)

          const updatedAssignment: ClientTemplateAssignment = {
            ...a, deadlineMode: newMode, manualDeadline: newManualDeadline, leadTimeDays: newLeadTime,
          }
          const newTasks = generateTasksForAssignment(updatedAssignment, template)
          await db.tasks.bulkPut(newTasks)
        } else if (leadTimeChanged) {
          // Just update hiddenUntil on pending tasks
          const pending = await db.tasks
            .where('templateId').equals(templateId)
            .filter((t) => t.clientId === clientId && t.status === 'pending')
            .toArray()
          for (const t of pending) {
            const hiddenUntil = computeHiddenUntil(new Date(t.deadline), newLeadTime)
            await db.tasks.update(t.id, { hiddenUntil })
          }
        }
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

export async function updateSettings(data: Partial<Omit<import('../types').AppSettings, 'id' | 'isSeeded'>>) {
  await db.settings.update('app', data)
}

// Notification reads
export async function getNotificationReadIds(): Promise<Set<string>> {
  const all = await db.notificationReads.toArray()
  return new Set(all.map((r) => r.id))
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.notificationReads.put({ id })
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  await db.notificationReads.bulkPut(ids.map((id) => ({ id })))
}

export async function clearNotificationReads(): Promise<void> {
  await db.notificationReads.clear()
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

// Task History
export async function getAllTaskHistory(clientId?: string): Promise<TaskHistory[]> {
  const all = clientId
    ? await db.taskHistory.where('clientId').equals(clientId).toArray()
    : await db.taskHistory.toArray()
  return all.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())
}

export async function saveTaskHistory(entry: TaskHistory): Promise<void> {
  await db.taskHistory.put(entry)
}

export async function completeManualTask(
  task: Task,
  templateName: string,
  nextDeadline?: string,
  nextLeadTimeDays?: number
): Promise<void> {
  await db.transaction('rw', [db.tasks, db.assignments, db.taskHistory], async () => {
    // Mark complete
    await db.tasks.update(task.id, { status: 'completed', completedAt: new Date() })

    // Record history
    await db.taskHistory.put({
      id: nanoid(),
      clientId: task.clientId,
      templateId: task.templateId,
      templateName,
      completedDate: new Date(),
      completedDeadline: new Date(task.deadline),
      nextDeadline,
      createdAt: new Date(),
    })

    if (nextDeadline) {
      const leadTime = nextLeadTimeDays ?? 180
      const assignmentId = `${task.clientId}-${task.templateId}`
      await db.assignments.update(assignmentId, { manualDeadline: nextDeadline, leadTimeDays: leadTime })

      const deadline = new Date(nextDeadline + 'T00:00:00')
      const hiddenUntil = computeHiddenUntil(deadline, leadTime)
      await db.tasks.put({
        id: `${task.clientId}-${task.templateId}-${nextDeadline}`,
        clientId: task.clientId,
        templateId: task.templateId,
        periodLabel: nextDeadline,
        deadline,
        isManualMode: true,
        hiddenUntil,
        status: 'pending',
        createdAt: new Date(),
      })
    }
  })
}

// Personal Tasks
export async function getAllPersonalTasks(): Promise<PersonalTask[]> {
  return db.personalTasks.toArray()
}

export async function savePersonalTask(task: PersonalTask): Promise<void> {
  await db.personalTasks.put(task)
}

export async function deletePersonalTask(id: string): Promise<void> {
  await db.transaction('rw', [db.personalTasks, db.recurringInstances], async () => {
    await db.recurringInstances.where('recurringTaskId').equals(id).delete()
    await db.personalTasks.delete(id)
  })
}

export async function updatePersonalTaskStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
  const update: Partial<PersonalTask> = { status }
  if (status === 'completed') update.completedAt = new Date()
  else update.completedAt = undefined
  await db.personalTasks.update(id, update)
}

// Recurring Instances
export async function getAllRecurringInstances(): Promise<RecurringWeeklyInstance[]> {
  return db.recurringInstances.toArray()
}

export async function updateRecurringInstanceStatus(id: string, status: 'pending' | 'completed'): Promise<void> {
  const update: Partial<RecurringWeeklyInstance> = { status }
  if (status === 'completed') update.completedAt = new Date()
  else update.completedAt = undefined
  await db.recurringInstances.update(id, update)
}

export async function deletePendingInstancesForTask(taskId: string): Promise<void> {
  const instances = await db.recurringInstances.where('recurringTaskId').equals(taskId).toArray()
  const pendingIds = instances.filter((i) => i.status === 'pending').map((i) => i.id)
  await db.recurringInstances.bulkDelete(pendingIds)
}

export async function ensureRecurringInstancesGenerated(): Promise<void> {
  const now = new Date()
  const weeks = [
    weekStartToString(getWeekStart(now)),
    weekStartToString(getWeekStart(addDays(now, 7))),
  ]
  await ensureRecurringInstancesForWeeks(weeks)
}

export async function ensureRecurringInstancesForWeek(weekStartStr: string): Promise<void> {
  await ensureRecurringInstancesForWeeks([weekStartStr])
}

async function ensureRecurringInstancesForWeeks(weekStarts: string[]): Promise<void> {
  const recurringTasks = (await db.personalTasks.toArray()).filter(
    (t) => t.type === 'recurring-weekly'
  )
  for (const task of recurringTasks) {
    const weekdays = task.recurringWeekdays ?? []
    for (const ws of weekStarts) {
      for (const wd of weekdays) {
        const id = `${task.id}-${ws}-${wd}`
        const existing = await db.recurringInstances.get(id)
        if (!existing) {
          await db.recurringInstances.put({
            id,
            recurringTaskId: task.id,
            weekStart: ws,
            weekday: wd,
            status: 'pending',
          })
        }
      }
    }
  }
}

// Export / Import
export async function exportData() {
  const [clients, taskTemplates, tasks, assignments, settings, taskHistory, personalTasks, recurringInstances] = await Promise.all([
    db.clients.toArray(),
    db.taskTemplates.toArray(),
    db.tasks.toArray(),
    db.assignments.toArray(),
    db.settings.toArray(),
    db.taskHistory.toArray(),
    db.personalTasks.toArray(),
    db.recurringInstances.toArray(),
  ])
  return { clients, taskTemplates, tasks, assignments, settings, taskHistory, personalTasks, recurringInstances, exportedAt: new Date().toISOString() }
}

export async function importData(
  data: {
    clients: Client[]
    taskTemplates: TaskTemplate[]
    tasks: Task[]
    assignments: ClientTemplateAssignment[]
    taskHistory?: TaskHistory[]
    personalTasks?: PersonalTask[]
    recurringInstances?: RecurringWeeklyInstance[]
  },
  replace: boolean
) {
  const allTables = [db.clients, db.taskTemplates, db.tasks, db.assignments, db.settings, db.taskHistory, db.personalTasks, db.recurringInstances]
  if (replace) {
    await db.transaction('rw', allTables, async () => {
      await db.clients.clear()
      await db.taskTemplates.clear()
      await db.tasks.clear()
      await db.assignments.clear()
      await db.taskHistory.clear()
      await db.personalTasks.clear()
      await db.recurringInstances.clear()
      await db.clients.bulkPut(data.clients)
      await db.taskTemplates.bulkPut(data.taskTemplates)
      await db.tasks.bulkPut(data.tasks)
      await db.assignments.bulkPut(data.assignments)
      if (data.taskHistory?.length) await db.taskHistory.bulkPut(data.taskHistory)
      if (data.personalTasks?.length) await db.personalTasks.bulkPut(data.personalTasks)
      if (data.recurringInstances?.length) await db.recurringInstances.bulkPut(data.recurringInstances)
    })
  } else {
    await db.transaction('rw', allTables, async () => {
      await db.clients.bulkPut(data.clients)
      await db.taskTemplates.bulkPut(data.taskTemplates)
      await db.tasks.bulkPut(data.tasks)
      await db.assignments.bulkPut(data.assignments)
      if (data.taskHistory?.length) await db.taskHistory.bulkPut(data.taskHistory)
      if (data.personalTasks?.length) await db.personalTasks.bulkPut(data.personalTasks)
      if (data.recurringInstances?.length) await db.recurringInstances.bulkPut(data.recurringInstances)
    })
  }
}
