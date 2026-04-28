import { addMonths, endOfMonth, getYear, getMonth } from 'date-fns'
import type { TaskTemplate } from '../types'

export function getDeadlineForPeriod(template: TaskTemplate, periodLabel: string, referenceDate?: Date): Date {
  const rule = template.deadlineRule
  const now = referenceDate ?? new Date()

  if (template.category === 'monthly') {
    // periodLabel: "YYYY-MM"
    const [year, month] = periodLabel.split('-').map(Number)
    const base = new Date(year, month - 1, 1)
    const day = rule.dayOfMonth ?? 15
    if (day > 28) {
      return endOfMonth(base)
    }
    return new Date(year, month - 1, day)
  }

  if (template.category === 'bi-monthly') {
    // periodLabel: "YYYY-MM/MM" e.g. "2026-01/02"
    const [yearStr, monthRange] = periodLabel.split('-')
    const endMonthStr = monthRange.split('/')[1]
    const year = Number(yearStr)
    const endMonth = Number(endMonthStr)
    // Due end of the month after the 2-month period
    const dueMonth = endMonth + 1 > 12 ? 1 : endMonth + 1
    const dueYear = endMonth + 1 > 12 ? year + 1 : year
    return endOfMonth(new Date(dueYear, dueMonth - 1, 1))
  }

  if (template.category === 'quarterly') {
    // periodLabel: "YYYY-Q1" | "YYYY-Q2" | "YYYY-Q3" | "YYYY-Q4"
    const [yearStr, quarter] = periodLabel.split('-')
    const year = Number(yearStr)
    // Deadline = end of the month after quarter end (standard Malaysian practice)
    const quarterEndMonth0 = { Q1: 2, Q2: 5, Q3: 8, Q4: 11 }[quarter] ?? 2 // 0-indexed Mar/Jun/Sep/Dec
    const dueMonth0 = quarterEndMonth0 + 1 > 11 ? 0 : quarterEndMonth0 + 1
    const dueYear = quarterEndMonth0 + 1 > 11 ? year + 1 : year
    return endOfMonth(new Date(dueYear, dueMonth0, 1))
  }

  if (template.category === 'half-yearly') {
    // periodLabel: "YYYY-H1" or "YYYY-H2"
    const [yearStr, half] = periodLabel.split('-')
    const year = Number(yearStr)
    if (half === 'H1') {
      return new Date(year, 1, 28)
    } else {
      return new Date(year, 7, 31)
    }
  }

  if (template.category === 'yearly') {
    if (rule.type === 'day-of-year' && rule.dayOfYear) {
      const year = Number(periodLabel)
      const { month, day } = rule.dayOfYear
      if (month === 2 && day >= 28) {
        return endOfMonth(new Date(year, 1, 1))
      }
      return new Date(year, month - 1, day)
    }
    if (rule.type === 'anniversary-based') {
      // periodLabel: "YYYY" - deadline is in that year, set by client's date
      // We store deadline in the task itself during generation, so return now
      return now
    }
  }

  return now
}

export function getCurrentPeriodLabel(template: TaskTemplate, referenceDate?: Date): string {
  const now = referenceDate ?? new Date()
  const year = getYear(now)
  const month = getMonth(now) + 1

  if (template.category === 'monthly') {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  if (template.category === 'bi-monthly') {
    // Periods: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec
    const periodStart = month % 2 === 1 ? month : month - 1
    const periodEnd = periodStart + 1
    return `${year}-${String(periodStart).padStart(2, '0')}/${String(periodEnd).padStart(2, '0')}`
  }

  if (template.category === 'quarterly') {
    const q = Math.ceil(month / 3)
    return `${year}-Q${q}`
  }

  if (template.category === 'half-yearly') {
    return month <= 6 ? `${year}-H1` : `${year}-H2`
  }

  return String(year)
}

export function getNextPeriodLabel(template: TaskTemplate, currentLabel: string): string {
  if (template.category === 'monthly') {
    const [year, month] = currentLabel.split('-').map(Number)
    const next = addMonths(new Date(year, month - 1, 1), 1)
    return `${getYear(next)}-${String(getMonth(next) + 1).padStart(2, '0')}`
  }

  if (template.category === 'bi-monthly') {
    const [yearStr, monthRange] = currentLabel.split('-')
    const endMonth = Number(monthRange.split('/')[1])
    const year = Number(yearStr)
    const nextStart = endMonth + 1 > 12 ? 1 : endMonth + 1
    const nextEnd = nextStart + 1 > 12 ? 1 : nextStart + 1
    const nextYear = endMonth + 1 > 12 ? year + 1 : year
    return `${nextYear}-${String(nextStart).padStart(2, '0')}/${String(nextEnd).padStart(2, '0')}`
  }

  if (template.category === 'quarterly') {
    const [yearStr, q] = currentLabel.split('-')
    const qNum = Number(q.replace('Q', ''))
    if (qNum < 4) return `${yearStr}-Q${qNum + 1}`
    return `${Number(yearStr) + 1}-Q1`
  }

  if (template.category === 'half-yearly') {
    const [yearStr, half] = currentLabel.split('-')
    if (half === 'H1') return `${yearStr}-H2`
    return `${Number(yearStr) + 1}-H1`
  }

  return String(Number(currentLabel) + 1)
}

export function getPrevPeriodLabel(template: TaskTemplate, currentLabel: string): string {
  if (template.category === 'monthly') {
    const [year, month] = currentLabel.split('-').map(Number)
    const prev = addMonths(new Date(year, month - 1, 1), -1)
    return `${getYear(prev)}-${String(getMonth(prev) + 1).padStart(2, '0')}`
  }
  // For others fall back to year-based
  return String(Number(currentLabel) - 1)
}
