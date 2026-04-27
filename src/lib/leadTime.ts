export function getDefaultLeadTime(category: string): number {
  switch (category) {
    case 'monthly':   return 0
    case 'weekly':    return 0
    case 'one-time':  return 0
    case 'bi-monthly': return 30
    case 'quarterly':  return 60
    case 'half-yearly': return 90
    case 'yearly':    return 180
    default:          return 180 // manual mode default
  }
}

export function computeHiddenUntil(deadline: Date, leadTimeDays: number): Date | undefined {
  if (leadTimeDays <= 0) return undefined
  return new Date(deadline.getTime() - leadTimeDays * 86400000)
}

export function isTaskVisible(hiddenUntil: Date | undefined, now: Date = new Date()): boolean {
  if (!hiddenUntil) return true
  return new Date(hiddenUntil) <= now
}
