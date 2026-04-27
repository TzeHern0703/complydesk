import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Client, Task, TaskTemplate, ClientTemplateAssignment, AppSettings, EmailMessage, EmailFilter, ClientEmailRule, PersonalTask, RecurringWeeklyInstance, TaskHistory } from '../types'
import * as q from '../db/queries'

interface AppState {
  clients: Client[]
  templates: TaskTemplate[]
  tasks: Task[]
  assignments: ClientTemplateAssignment[]
  settings: AppSettings | undefined
  emailMessages: EmailMessage[]
  personalTasks: PersonalTask[]
  recurringInstances: RecurringWeeklyInstance[]
  taskHistory: TaskHistory[]
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

  loadPersonalTasks: () => Promise<void>
  savePersonalTask: (task: PersonalTask) => Promise<void>
  deletePersonalTask: (id: string) => Promise<void>
  updatePersonalTaskStatus: (id: string, status: 'pending' | 'completed') => Promise<void>
  updateRecurringInstanceStatus: (id: string, status: 'pending' | 'completed') => Promise<void>
  ensureRecurringInstancesForWeek: (weekStartStr: string) => Promise<void>

  setClientAssignments: (
    clientId: string,
    templateIds: string[],
    clientNote?: string,
    anniversaryDates?: Record<string, string>,
    deadlineModes?: Record<string, 'auto' | 'manual'>,
    manualDeadlines?: Record<string, string>,
    leadTimeDaysMap?: Record<string, number>
  ) => Promise<void>

  completeManualTask: (taskId: string, nextDeadline?: string, nextLeadTimeDays?: number) => Promise<void>
  loadTaskHistory: () => Promise<void>

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
  personalTasks: [],
  recurringInstances: [],
  taskHistory: [],
  isLocked: false,
  isLoading: true,

  loadAll: async () => {
    set({ isLoading: true })
    await q.initializeDB()
    await q.ensureTasksGenerated()
    await q.ensureRecurringInstancesGenerated()
    const [clients, templates, tasks, assignments, settings, emailMessages, personalTasks, recurringInstances, taskHistory] = await Promise.all([
      q.getAllClients(),
      q.getAllTemplates(),
      q.getAllTasks(),
      q.getAllAssignments(),
      q.getSettings(),
      q.getAllEmailMessages(),
      q.getAllPersonalTasks(),
      q.getAllRecurringInstances(),
      q.getAllTaskHistory(),
    ])
    set({ clients, templates, tasks, assignments, settings, emailMessages, personalTasks, recurringInstances, taskHistory, isLoading: false })
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
    const [templates, tasks] = await Promise.all([q.getAllTemplates(), q.getAllTasks()])
    set({ templates, tasks })
  },

  setClientAssignments: async (clientId, templateIds, clientNote, anniversaryDates, deadlineModes, manualDeadlines, leadTimeDaysMap) => {
    await q.setClientAssignments(clientId, templateIds, clientNote, anniversaryDates, deadlineModes, manualDeadlines, leadTimeDaysMap)
    const [tasks, assignments] = await Promise.all([q.getAllTasks(), q.getAllAssignments()])
    set({ tasks, assignments })
  },

  updateTaskStatus: async (id, status) => {
    await q.updateTaskStatus(id, status)
    if (status === 'completed') {
      const task = get().tasks.find((t) => t.id === id)
      const template = task ? get().templates.find((t) => t.id === task.templateId) : undefined
      if (task && template && !task.isManualMode) {
        await q.saveTaskHistory({
          id: nanoid(),
          clientId: task.clientId,
          templateId: task.templateId,
          templateName: template.name,
          completedDate: new Date(),
          completedDeadline: new Date(task.deadline),
          createdAt: new Date(),
        })
      }
    }
    const [tasks, taskHistory] = await Promise.all([q.getAllTasks(), q.getAllTaskHistory()])
    set({ tasks, taskHistory })
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

  completeManualTask: async (taskId, nextDeadline, nextLeadTimeDays) => {
    const task = get().tasks.find((t) => t.id === taskId)
    const template = task ? get().templates.find((t) => t.id === task.templateId) : undefined
    if (!task || !template) return
    await q.completeManualTask(task, template.name, nextDeadline, nextLeadTimeDays)
    const [tasks, assignments, taskHistory] = await Promise.all([
      q.getAllTasks(), q.getAllAssignments(), q.getAllTaskHistory(),
    ])
    set({ tasks, assignments, taskHistory })
  },

  loadTaskHistory: async () => {
    const taskHistory = await q.getAllTaskHistory()
    set({ taskHistory })
  },

  loadPersonalTasks: async () => {
    const [personalTasks, recurringInstances] = await Promise.all([
      q.getAllPersonalTasks(),
      q.getAllRecurringInstances(),
    ])
    set({ personalTasks, recurringInstances })
  },

  savePersonalTask: async (task) => {
    await q.savePersonalTask(task)
    if (task.type === 'recurring-weekly') {
      await q.deletePendingInstancesForTask(task.id)
      await q.ensureRecurringInstancesGenerated()
    }
    await get().loadPersonalTasks()
  },

  deletePersonalTask: async (id) => {
    await q.deletePersonalTask(id)
    await get().loadPersonalTasks()
  },

  updatePersonalTaskStatus: async (id, status) => {
    await q.updatePersonalTaskStatus(id, status)
    const personalTasks = await q.getAllPersonalTasks()
    set({ personalTasks })
  },

  updateRecurringInstanceStatus: async (id, status) => {
    await q.updateRecurringInstanceStatus(id, status)
    const recurringInstances = await q.getAllRecurringInstances()
    set({ recurringInstances })
  },

  ensureRecurringInstancesForWeek: async (weekStartStr) => {
    await q.ensureRecurringInstancesForWeek(weekStartStr)
    const recurringInstances = await q.getAllRecurringInstances()
    set({ recurringInstances })
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
