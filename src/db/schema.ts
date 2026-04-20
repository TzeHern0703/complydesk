import Dexie, { type EntityTable } from 'dexie'
import type { Client, TaskTemplate, Task, ClientTemplateAssignment, AppSettings, EmailMessage } from '../types'

class ComplyDeskDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  taskTemplates!: EntityTable<TaskTemplate, 'id'>
  tasks!: EntityTable<Task, 'id'>
  assignments!: EntityTable<ClientTemplateAssignment, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  emailMessages!: EntityTable<EmailMessage, 'id'>

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
  }
}

export const db = new ComplyDeskDB()
