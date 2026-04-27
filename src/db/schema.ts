import Dexie, { type EntityTable } from 'dexie'
import type { Client, TaskTemplate, Task, ClientTemplateAssignment, AppSettings, EmailMessage, PersonalTask, RecurringWeeklyInstance } from '../types'

class ComplyDeskDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  taskTemplates!: EntityTable<TaskTemplate, 'id'>
  tasks!: EntityTable<Task, 'id'>
  assignments!: EntityTable<ClientTemplateAssignment, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  emailMessages!: EntityTable<EmailMessage, 'id'>
  personalTasks!: EntityTable<PersonalTask, 'id'>
  recurringInstances!: EntityTable<RecurringWeeklyInstance, 'id'>

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
  }
}

export const db = new ComplyDeskDB()
