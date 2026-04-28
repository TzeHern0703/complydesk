import Dexie, { type EntityTable } from 'dexie'
import type { Client, TaskTemplate, Task, ClientTemplateAssignment, AppSettings, EmailMessage, PersonalTask, RecurringWeeklyInstance, TaskHistory } from '../types'
import { getDefaultLeadTime } from '../lib/leadTime'

class ComplyDeskDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  taskTemplates!: EntityTable<TaskTemplate, 'id'>
  tasks!: EntityTable<Task, 'id'>
  assignments!: EntityTable<ClientTemplateAssignment, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  emailMessages!: EntityTable<EmailMessage, 'id'>
  personalTasks!: EntityTable<PersonalTask, 'id'>
  recurringInstances!: EntityTable<RecurringWeeklyInstance, 'id'>
  taskHistory!: EntityTable<TaskHistory, 'id'>
  notificationReads!: EntityTable<{ id: string }, 'id'>

  constructor() {
    super('ComplyDeskDB')
    this.version(1).stores({
      clients: 'id, name, isActive, createdAt',
      taskTemplates: 'id, category, isSystemDefault',
      tasks: 'id, clientId, templateId, status, deadline, periodLabel',
      assignments: 'id, clientId, templateId',
      settings: 'id',
    })
    this.version(2).stores({
      clients: 'id, name, isActive, createdAt',
      taskTemplates: 'id, category, isSystemDefault',
      tasks: 'id, clientId, templateId, status, deadline, periodLabel',
      assignments: 'id, clientId, templateId',
      settings: 'id',
      emailMessages: 'id, threadId, fromEmail, date, isProcessed, clientId, fetchedAt',
    })
    this.version(3).stores({
      clients: 'id, name, isActive, createdAt',
      taskTemplates: 'id, category, isSystemDefault',
      tasks: 'id, clientId, templateId, status, deadline, periodLabel',
      assignments: 'id, clientId, templateId',
      settings: 'id',
      emailMessages: 'id, threadId, fromEmail, date, isProcessed, clientId, fetchedAt',
      personalTasks: 'id, type, status, weekStart, createdAt',
      recurringInstances: 'id, recurringTaskId, weekStart, weekday, status',
    })
    this.version(4).stores({
      clients: 'id, name, isActive, createdAt',
      taskTemplates: 'id, category, isSystemDefault',
      tasks: 'id, clientId, templateId, status, deadline, periodLabel',
      assignments: 'id, clientId, templateId',
      settings: 'id',
      emailMessages: 'id, threadId, fromEmail, date, isProcessed, clientId, fetchedAt',
      personalTasks: 'id, type, status, weekStart, createdAt',
      recurringInstances: 'id, recurringTaskId, weekStart, weekday, status',
      taskHistory: 'id, clientId, templateId, completedDate, createdAt',
    }).upgrade(async (tx) => {
      const templates = await tx.table('taskTemplates').toArray()
      const templateMap = new Map(templates.map((t: any) => [t.id, t]))

      await tx.table('assignments').toCollection().modify((a: any) => {
        if (!a.deadlineMode) a.deadlineMode = 'auto'
        if (a.leadTimeDays === undefined || a.leadTimeDays === null) {
          const tmpl = templateMap.get(a.templateId)
          a.leadTimeDays = tmpl ? getDefaultLeadTime(tmpl.category) : 0
        }
      })

      const assignments = await tx.table('assignments').toArray()
      const assignMap = new Map(assignments.map((a: any) => [`${a.clientId}-${a.templateId}`, a]))

      await tx.table('tasks').toCollection().modify((task: any) => {
        if (task.isManualMode === undefined) task.isManualMode = false
        if (task.hiddenUntil === undefined) {
          const a = assignMap.get(`${task.clientId}-${task.templateId}`)
          const ld = a?.leadTimeDays ?? 0
          if (ld > 0) {
            const deadline = new Date(task.deadline)
            task.hiddenUntil = new Date(deadline.getTime() - ld * 86400000)
          }
        }
      })
    })
    this.version(5).stores({
      clients: 'id, name, isActive, createdAt',
      taskTemplates: 'id, category, isSystemDefault',
      tasks: 'id, clientId, templateId, status, deadline, periodLabel',
      assignments: 'id, clientId, templateId',
      settings: 'id',
      emailMessages: 'id, threadId, fromEmail, date, isProcessed, clientId, fetchedAt',
      personalTasks: 'id, type, status, weekStart, createdAt',
      recurringInstances: 'id, recurringTaskId, weekStart, weekday, status',
      taskHistory: 'id, clientId, templateId, completedDate, createdAt',
      notificationReads: 'id',
    })
  }
}

export const db = new ComplyDeskDB()
