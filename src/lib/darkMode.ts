export function initDarkMode() {
  const saved = localStorage.getItem('darkMode')
  if (saved === 'true') document.documentElement.classList.add('dark')
}

export function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('darkMode', String(isDark))
  return isDark
}

export function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}
