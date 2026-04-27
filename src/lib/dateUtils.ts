import { format, isToday, isTomorrow, differenceInDays, startOfDay } from 'date-fns'

export function formatDeadline(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'd MMM yyyy')
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return differenceInDays(startOfDay(d), startOfDay(new Date()))
}

export function isOverdue(date: Date | string): boolean {
  return daysUntil(date) < 0
}

export function isDueThisWeek(date: Date | string): boolean {
  const days = daysUntil(date)
  return days >= 0 && days <= 7
}

export function isDueThisMonth(date: Date | string): boolean {
  const days = daysUntil(date)
  return days >= 0 && days <= 31
}

export function formatPeriodLabel(label: string): string {
  // "2026-04" -> "Apr 2026"
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-')
    return format(new Date(Number(year), Number(month) - 1, 1), 'MMM yyyy')
  }
  // "2026-01/02" -> "Jan–Feb 2026"
  if (/^\d{4}-\d{2}\/\d{2}$/.test(label)) {
    const [year, range] = label.split('-')
    const [m1, m2] = range.split('/').map(Number)
    const s = format(new Date(Number(year), m1 - 1, 1), 'MMM')
    const e = format(new Date(Number(year), m2 - 1, 1), 'MMM')
    return `${s}–${e} ${year}`
  }
  // "2026-H1" -> "H1 2026"
  if (/^\d{4}-H[12]$/.test(label)) {
    const [year, half] = label.split('-')
    return `${half} ${year}`
  }
  // "2026-04-27" (weekly task date) -> "Mon 27 Apr 2026"
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const [y, m, d] = label.split('-').map(Number)
    return format(new Date(y, m - 1, d), 'EEE d MMM yyyy')
  }
  return label
}
