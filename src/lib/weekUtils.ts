import { startOfWeek, addDays, format } from 'date-fns'

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
}

// Mon-first display order (Malaysian convention)
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

// Returns [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function weekStartToString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function weekStartFromString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Convert a JS weekday (0=Sun..6=Sat) to a date within the given week
export function weekdayToDate(weekStart: Date, weekday: number): Date {
  const offset = weekday === 0 ? 6 : weekday - 1
  return addDays(weekStart, offset)
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function isCurrentWeek(weekStart: Date): boolean {
  return weekStartToString(weekStart) === weekStartToString(getWeekStart(new Date()))
}

export function isPastWeek(weekStart: Date): boolean {
  return weekStart < getWeekStart(new Date())
}
