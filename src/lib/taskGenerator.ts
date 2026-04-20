import type { ClientTemplateAssignment, Task, TaskTemplate } from '../types'
import {
  getCurrentPeriodLabel,
  getNextPeriodLabel,
  getDeadlineForPeriod,
} from './deadlines'

export function generateTasksForAssignment(
  assignment: ClientTemplateAssignment,
  template: TaskTemplate,
  referenceDate?: Date
): Task[] {
  const now = referenceDate ?? new Date()
  const tasks: Task[] = []

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
    const taskId = `${assignment.clientId}-${template.id}-${label}`
    const deadline = getDeadlineForPeriod(template, label, now)
    tasks.push({
      id: taskId,
      clientId: assignment.clientId,
      templateId: template.id,
      periodLabel: label,
      deadline,
      status: 'pending',
      createdAt: now,
    })
  }

  return tasks
}
