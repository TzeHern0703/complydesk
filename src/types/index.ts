export interface Client {
  id: string
  name: string
  ssmNumber?: string
  tinNumber?: string
  tags: string[]
  notes?: string
  createdAt: Date
  isActive: boolean
}

export interface DeadlineRule {
  type: 'day-of-month' | 'day-of-year' | 'anniversary-based' | 'one-time' | 'custom' | 'weekly'
  dayOfMonth?: number
  monthsOfYear?: number[]
  dayOfYear?: { month: number; day: number }
  oneTimeDate?: string // ISO date string for one-time tasks
  weekdays?: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly type)
  reminderDaysBefore: number[]
}

export interface GovernmentWebsite {
  name: string
  url: string
  loginUrl?: string
}

export interface TaskTemplate {
  id: string
  name: string
  nameZh: string
  category: 'monthly' | 'bi-monthly' | 'quarterly' | 'yearly' | 'half-yearly' | 'one-time' | 'weekly'
  deadlineRule: DeadlineRule
  governmentWebsite: GovernmentWebsite
  description: string
  isSystemDefault: boolean
}

export type TaskStatus = 'pending' | 'completed' | 'postponed' | 'skipped'

export interface Task {
  id: string
  clientId: string
  templateId: string
  periodLabel: string
  deadline: Date
  status: TaskStatus
  completedAt?: Date
  notes?: string
  createdAt: Date
}

export interface ClientTemplateAssignment {
  id: string
  clientId: string
  templateId: string
  clientNote?: string
  anniversaryDate?: string // ISO date for anniversary-based tasks
  deadlineOverrideDay?: number // Override the day-of-month for this client
  createdAt: Date
}

export interface AppSettings {
  id: string
  passwordHash?: string
  passwordEnabled: boolean
  isSeeded: boolean
  gmailClientId?: string
  gmailAccessToken?: string
  gmailTokenExpiry?: number
  emailFilters?: EmailFilter[]
  clientEmailRules?: ClientEmailRule[]
}

// Email types
export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  date: Date
  snippet: string
  hasAttachments: boolean
  attachments: EmailAttachment[]
  bodyHtml?: string
  bodyText?: string
  isProcessed: boolean
  clientId?: string
  fetchedAt: Date
  labelIds: string[]
}

export interface EmailAttachment {
  attachmentId: string
  messageId: string
  filename: string
  mimeType: string
  size: number
  data?: string // base64
}

export interface EmailFilter {
  id: string
  type: 'keyword' | 'sender' | 'exclude-sender' | 'exclude-keyword'
  value: string
}

export interface ClientEmailRule {
  id: string
  clientId: string
  emailDomain?: string
  emailAddress?: string
}
