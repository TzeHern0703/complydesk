export function updateTabTitle(overdueCount: number) {
  document.title = overdueCount > 0 ? `(${overdueCount}) ComplyDesk` : 'ComplyDesk'
}

export function updateFavicon(hasOverdue: boolean) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (!hasOverdue) {
    link.href = '/favicon.ico'
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.src = '/favicon.ico'
  const draw = () => {
    ctx.drawImage(img, 0, 0, 32, 32)
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(26, 6, 7, 0, 2 * Math.PI)
    ctx.fill()
    link!.href = canvas.toDataURL()
  }
  img.onload = draw
  img.onerror = () => {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, 32, 32)
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(26, 6, 7, 0, 2 * Math.PI)
    ctx.fill()
    link!.href = canvas.toDataURL()
  }
}

export function supportsNotifications(): boolean {
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!supportsNotifications()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied'
  return Notification.requestPermission()
}

export async function sendBrowserNotification(title: string, body: string): Promise<{ sent: boolean; error?: string }> {
  if (!supportsNotifications()) {
    return { sent: false, error: 'Notifications API not supported in this browser' }
  }
  if (Notification.permission !== 'granted') {
    return { sent: false, error: `Permission is "${Notification.permission}" — not granted` }
  }

  // Try service worker showNotification (required for Chrome PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, { body, icon: '/favicon.ico' })
        return { sent: true }
      }
    } catch (e: any) {
      // SW failed — fall through to direct API
    }
  }

  // Direct Notification fallback
  try {
    const n = new Notification(title, { body, icon: '/favicon.ico' })
    n.onclick = () => { window.focus(); n.close() }
    return { sent: true }
  } catch (e: any) {
    return { sent: false, error: e?.message ?? 'Unknown error' }
  }
}

export function formatTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}
