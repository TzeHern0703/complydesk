import { create } from 'zustand'
import type { Client, Task, TaskTemplate, ClientTemplateAssignment, AppSettings, EmailMessage, EmailFilter, ClientEmailRule } from '../types'
import * as q from '../db/queries'

interface AppState {
  clients: Client[]
  templates: TaskTemplate[]
  tasks: Task[]
  assignments: ClientTemplateAssignment[]
  settings: AppSettings | undefined
  emailMessages: EmailMessage[]
  isLocked: boolean
  isLoading: boolean

  loadAll: () => Promise<void>
  loadClients: () => Promise<void>
  loadTemplates: () => Promise<void>
  loadTasks: () => Promise<void>
  loadSettings: () => Promise<void>
  loadEmails: () => Promise<void>

  saveClient: (client: Client) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  saveTemplate: (template: TaskTemplate) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  setClientAssignments: (
    clientId: string,
    templateIds: string[],
    clientNote?: string,
    anniversaryDates?: Record<string, string>
  ) => Promise<void>

  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  updateTaskNotes: (id: string, notes: string) => Promise<void>
  updateTaskDeadline: (id: string, deadline: Date) => Promise<void>

  updateSettings: (data: Partial<{
    passwordHash: string
    passwordEnabled: boolean
    gmailClientId: string
    gmailAccessToken: string
    gmailTokenExpiry: number
    emailFilters: EmailFilter[]
    clientEmailRules: ClientEmailRule[]
  }>) => Promise<void>
  setLocked: (locked: boolean) => void

  saveEmailMessages: (msgs: EmailMessage[]) => Promise<void>
  updateEmailProcessed: (id: string, isProcessed: boolean) => Promise<void>
  updateEmailClient: (id: string, clientId: string | undefined) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  clients: [],
  templates: [],
  tasks: [],
  assignments: [],
  settings: undefined,
  emailMessages: [],
  isLocked: false,
  isLoading: true,

  loadAll: async () => {
    set({ isLoading: true })
    await q.initializeDB()
    await q.ensureTasksGenerated()
    const [clients, templates, tasks, settings, emailMessages] = await Promise.all([
      q.getAllClients(),
      q.getAllTemplates(),
      q.getAllTasks(),
      q.getSettings(),
      q.getAllEmailMessages(),
    ])
    set({ clients, templates, tasks, settings, emailMessages, isLoading: false })
  },

  loadClients: async () => {
    const clients = await q.getAllClients()
    set({ clients })
  },

  loadTemplates: async () => {
    const templates = await q.getAllTemplates()
    set({ templates })
  },

  loadTasks: async () => {
    await q.ensureTasksGenerated()
    const tasks = await q.getAllTasks()
    set({ tasks })
  },

  loadSettings: async () => {
    const settings = await q.getSettings()
    set({ settings })
  },

  loadEmails: async () => {
    const emailMessages = await q.getAllEmailMessages()
    set({ emailMessages })
  },

  saveClient: async (client) => {
    await q.saveClient(client)
    await get().loadClients()
  },

  deleteClient: async (id) => {
    await q.deleteClient(id)
    const [clients, tasks] = await Promise.all([q.getAllClients(), q.getAllTasks()])
    set({ clients, tasks })
  },

  saveTemplate: async (template) => {
    await q.saveTemplate(template)
    await get().loadTemplates()
  },

  deleteTemplate: async (id) => {
    await q.deleteTemplate(id)
    await get().loadTemplates()
  },

  setClientAssignments: async (clientId, templateIds, clientNote, anniversaryDates) => {
    await q.setClientAssignments(clientId, templateIds, clientNote, anniversaryDates)
    const tasks = await q.getAllTasks()
    set({ tasks })
  },

  updateTaskStatus: async (id, status) => {
    await q.updateTaskStatus(id, status)
    const tasks = await q.getAllTasks()
    set({ tasks })
  },

  updateTaskNotes: async (id, notes) => {
    await q.updateTaskNotes(id, notes)
    const tasks = await q.getAllTasks()
    set({ tasks })
  },

  updateTaskDeadline: async (id, deadline) => {
    await q.updateTaskDeadline(id, deadline)
    const tasks = await q.getAllTasks()
    set({ tasks })
  },

  updateSettings: async (data) => {
    await q.updateSettings(data)
    await get().loadSettings()
  },

  setLocked: (locked) => set({ isLocked: locked }),

  saveEmailMessages: async (msgs) => {
    await q.bulkSaveEmailMessages(msgs)
    await get().loadEmails()
  },

  updateEmailProcessed: async (id, isProcessed) => {
    await q.updateEmailProcessed(id, isProcessed)
    await get().loadEmails()
  },

  updateEmailClient: async (id, clientId) => {
    await q.updateEmailClient(id, clientId)
    await get().loadEmails()
  },
}))
