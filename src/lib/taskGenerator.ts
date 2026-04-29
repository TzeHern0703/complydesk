import { addWeeks, startOfWeek, addDays, format } from 'date-fns'
import type { ClientTemplateAssignment, Task, TaskTemplate } from '../types'
import {
  getCurrentPeriodLabel,
  getNextPeriodLabel,
  getDeadlineForPeriod,
} from './deadlines'
import { computeHiddenUntil } from './leadTime'

export function generateTasksForAssignment(
  assignment: ClientTemplateAssignment,
  template: TaskTemplate,
  referenceDate?: Date
): Task[] {
  const now = referenceDate ?? new Date()
  const tasks: Task[] = []
  const leadTimeDays = assignment.leadTimeDays ?? 0

  // Manual deadline mode: single task with user-set deadline
  if (assignment.deadlineMode === 'manual') {
    if (!assignment.manualDeadline) return tasks
    const deadline = new Date(assignment.manualDeadline + 'T00:00:00')
    const hiddenUntil = computeHiddenUntil(deadline, leadTimeDays)
    tasks.push({
      id: `${assignment.clientId}-${template.id}-${assignment.manualDeadline}`,
      clientId: assignment.clientId,
      templateId: template.id,
      periodLabel: assignment.manualDeadline,
      deadline,
      isManualMode: true,
      hiddenUntil,
      status: 'pending',
      createdAt: now,
    })
    return tasks
  }

  if (template.category === 'weekly') {
    const weekdays = template.deadlineRule.weekdays ?? []
    if (weekdays.length === 0) return tasks
    for (let weekOffset = 0; weekOffset <= 1; weekOffset++) {
      const sunday = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 0 })
      for (const wd of weekdays) {
        const date = addDays(sunday, wd)
        const periodLabel = format(date, 'yyyy-MM-dd')
        const hiddenUntil = computeHiddenUntil(date, leadTimeDays)
        tasks.push({
          id: `${assignment.clientId}-${template.id}-${periodLabel}`,
          clientId: assignment.clientId,
          templateId: template.id,
          periodLabel,
          deadline: date,
          isManualMode: false,
          hiddenUntil,
          status: 'pending',
          createdAt: now,
        })
      }
    }
    return tasks
  }

  if (template.category === 'yearly' && template.deadlineRule.type === 'anniversary-based') {
    // Skip task generation entirely if no anniversary date is set
    if (!assignment.anniversaryDate) return tasks

    const anniversaryDate = new Date(assignment.anniversaryDate + 'T00:00:00')
    const year = now.getFullYear()

    // Generate current and next year tasks based on anniversary date
    for (const y of [year, year + 1]) {
      const deadline = new Date(y, anniversaryDate.getMonth(), anniversaryDate.getDate())
      // Skip if this year's task is already in the past
      if (deadline < now && y === year) continue
      const periodLabel = String(y)
      const hiddenUntil = computeHiddenUntil(deadline, leadTimeDays)
      tasks.push({
        id: `${assignment.clientId}-${template.id}-${periodLabel}`,
        clientId: assignment.clientId,
        templateId: template.id,
        periodLabel,
        deadline,
        isManualMode: false,
        hiddenUntil,
        status: 'pending',
        createdAt: now,
      })
    }
    return tasks
  }

  const currentLabel = getCurrentPeriodLabel(template, now)
  const nextLabel = getNextPeriodLabel(template, currentLabel)

  for (const label of [currentLabel, nextLabel]) {
    const deadline = getDeadlineForPeriod(template, label, now)
    const hiddenUntil = computeHiddenUntil(deadline, leadTimeDays)
    tasks.push({
      id: `${assignment.clientId}-${template.id}-${label}`,
      clientId: assignment.clientId,
      templateId: template.id,
      periodLabel: label,
      deadline,
      isManualMode: false,
      hiddenUntil,
      status: 'pending',
      createdAt: now,
    })
  }

  return tasks
}
