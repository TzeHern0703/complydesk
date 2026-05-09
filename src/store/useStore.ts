import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Client, Task, TaskTemplate, ClientTemplateAssignment, AppSettings, EmailMessage, PersonalTask, RecurringWeeklyInstance, TaskHistory, ClientCustomTask } from '../types'
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
  clientCustomTasks: ClientCustomTask[]
  notificationReadIds: Set<string>
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
    leadTimeDaysMap?: Record<string, number>,
    loginUsernames?: Record<string, string>,
    loginNotesMap?: Record<string, string>
  ) => Promise<void>

  completeManualTask: (taskId: string, nextDeadline?: string, nextLeadTimeDays?: number) => Promise<void>
  loadTaskHistory: () => Promise<void>

  loadClientCustomTasks: () => Promise<void>
  saveClientCustomTask: (ct: ClientCustomTask) => Promise<void>
  deleteClientCustomTask: (id: string, clientId: string) => Promise<void>

  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>
  updateTaskNotes: (id: string, notes: string) => Promise<void>
  updateTaskDeadline: (id: string, deadline: Date) => Promise<void>

  updateSettings: (data: Partial<Omit<AppSettings, 'id' | 'isSeeded'>>) => Promise<void>
  setLocked: (locked: boolean) => void

  loadNotificationReads: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: (ids: string[]) => Promise<void>

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
  clientCustomTasks: [],
  notificationReadIds: new Set(),
  isLocked: false,
  isLoading: true,

  loadAll: async () => {
    set({ isLoading: true })
    await q.initializeDB()
    await q.ensureTasksGenerated()
    await q.ensureRecurringInstancesGenerated()
    const [clients, templates, tasks, assignments, settings, emailMessages, personalTasks, recurringInstances, taskHistory, notificationReadIds, clientCustomTasks] = await Promise.all([
      q.getAllClients(),
      q.getAllTemplates(),
      q.getAllTasks(),
      q.getAllAssignments(),
      q.getSettings(),
      q.getAllEmailMessages(),
      q.getAllPersonalTasks(),
      q.getAllRecurringInstances(),
      q.getAllTaskHistory(),
      q.getNotificationReadIds(),
      q.getAllClientCustomTasks(),
    ])
    set({ clients, templates, tasks, assignments, settings, emailMessages, personalTasks, recurringInstances, taskHistory, notificationReadIds, clientCustomTasks, isLoading: false })
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
    const [clients, tasks, clientCustomTasks] = await Promise.all([q.getAllClients(), q.getAllTasks(), q.getAllClientCustomTasks()])
    set({ clients, tasks, clientCustomTasks })
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

  setClientAssignments: async (clientId, templateIds, clientNote, anniversaryDates, deadlineModes, manualDeadlines, leadTimeDaysMap, loginUsernames, loginNotesMap) => {
    await q.setClientAssignments(clientId, templateIds, clientNote, anniversaryDates, deadlineModes, manualDeadlines, leadTimeDaysMap, loginUsernames, loginNotesMap)
    const [tasks, assignments] = await Promise.all([q.getAllTasks(), q.getAllAssignments()])
    set({ tasks, assignments })
  },

  updateTaskStatus: async (id, status) => {
    await q.updateTaskStatus(id, status)
    let newEntry: import('../types').TaskHistory | undefined
    if (status === 'completed') {
      const task = get().tasks.find((t) => t.id === id)
      const isCustom = task?.templateId.startsWith('custom:')
      let historyTemplateName: string | undefined
      if (isCustom) {
        const customTaskId = task!.templateId.slice(7)
        historyTemplateName = get().clientCustomTasks.find((ct) => ct.id === customTaskId)?.name
      } else {
        const template = task ? get().templates.find((t) => t.id === task.templateId) : undefined
        historyTemplateName = template?.name
      }
      if (task && historyTemplateName && !task.isManualMode) {
        newEntry = {
          id: nanoid(),
          clientId: task.clientId,
          templateId: task.templateId,
          templateName: historyTemplateName,
          completedDate: new Date(),
          completedDeadline: new Date(task.deadline),
          createdAt: new Date(),
        }
        await q.saveTaskHistory(newEntry)
      }
    }
    const completedAt = status === 'completed' ? new Date() : undefined
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === id ? { ...t, status, completedAt } : t),
      taskHistory: newEntry ? [newEntry, ...state.taskHistory] : state.taskHistory,
    }))
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
    let templateName: string | undefined
    const isCustom = task?.templateId.startsWith('custom:')
    if (isCustom) {
      const customTaskId = task!.templateId.slice(7)
      templateName = get().clientCustomTasks.find((ct) => ct.id === customTaskId)?.name
    } else {
      templateName = get().templates.find((t) => t.id === task?.templateId)?.name
    }
    if (!task || !templateName) return
    await q.completeManualTask(task, templateName, nextDeadline, nextLeadTimeDays)
    const [tasks, assignments, taskHistory, clientCustomTasks] = await Promise.all([
      q.getAllTasks(), q.getAllAssignments(), q.getAllTaskHistory(), q.getAllClientCustomTasks(),
    ])
    set({ tasks, assignments, taskHistory, clientCustomTasks })
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
    const completedAt = status === 'completed' ? new Date() : undefined
    set((state) => ({
      personalTasks: state.personalTasks.map((t) => t.id === id ? { ...t, status, completedAt } : t),
    }))
  },

  updateRecurringInstanceStatus: async (id, status) => {
    await q.updateRecurringInstanceStatus(id, status)
    const completedAt = status === 'completed' ? new Date() : undefined
    set((state) => ({
      recurringInstances: state.recurringInstances.map((inst) =>
        inst.id === id ? { ...inst, status, completedAt } : inst
      ),
    }))
  },

  ensureRecurringInstancesForWeek: async (weekStartStr) => {
    await q.ensureRecurringInstancesForWeek(weekStartStr)
    const fetched = await q.getAllRecurringInstances()
    // Only update if the DB returned data, or if store is already empty.
    // Prevents an empty read-back from wiping good in-memory state.
    set((state) => ({
      recurringInstances: fetched.length > 0 || state.recurringInstances.length === 0
        ? fetched
        : state.recurringInstances,
    }))
  },

  loadClientCustomTasks: async () => {
    const clientCustomTasks = await q.getAllClientCustomTasks()
    set({ clientCustomTasks })
  },

  saveClientCustomTask: async (ct) => {
    await q.saveClientCustomTask(ct)
    const [tasks, clientCustomTasks] = await Promise.all([q.getAllTasks(), q.getAllClientCustomTasks()])
    set({ tasks, clientCustomTasks })
  },

  deleteClientCustomTask: async (id, clientId) => {
    await q.deleteClientCustomTask(id, clientId)
    const [tasks, clientCustomTasks] = await Promise.all([q.getAllTasks(), q.getAllClientCustomTasks()])
    set({ tasks, clientCustomTasks })
  },

  setLocked: (locked) => set({ isLocked: locked }),

  loadNotificationReads: async () => {
    const notificationReadIds = await q.getNotificationReadIds()
    set({ notificationReadIds })
  },

  markNotificationRead: async (id) => {
    await q.markNotificationRead(id)
    set((state) => ({ notificationReadIds: new Set([...state.notificationReadIds, id]) }))
  },

  markAllNotificationsRead: async (ids) => {
    await q.markAllNotificationsRead(ids)
    set((state) => ({ notificationReadIds: new Set([...state.notificationReadIds, ...ids]) }))
  },

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
