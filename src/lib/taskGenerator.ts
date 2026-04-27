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
        tasks.push({
          id: `${assignment.clientId}-${template.id}-${periodLabel}`,
          clientId: assignment.clientId,
          templateId: template.id,
          periodLabel,
          deadline: date,
          isManualMode: false,
          status: 'pending',
          createdAt: now,
        })
      }
    }
    return tasks
  }

  if (template.category === 'yearly' && template.deadlineRule.type === 'anniversary-based') {
    // Anniversary-based: generate current year task
    const year = now.getFullYear()
    const yearLabel = String(year)
    const taskId = `${assignment.clientId}-${template.id}-${yearLabel}`
    tasks.push({
      id: taskId,
      clientId: assignment.clientId,
      templateId: template.id,
      periodLabel: yearLabel,
      deadline: now, // Will be updated manually by user since it's anniversary-based
      status: 'pending',
      createdAt: now,
    })
    // Also generate next year
    const nextYearLabel = String(year + 1)
    const nextTaskId = `${assignment.clientId}-${template.id}-${nextYearLabel}`
    tasks.push({
      id: nextTaskId,
      clientId: assignment.clientId,
      templateId: template.id,
      periodLabel: nextYearLabel,
      deadline: new Date(year + 1, now.getMonth(), now.getDate()),
      status: 'pending',
      createdAt: now,
    })
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
