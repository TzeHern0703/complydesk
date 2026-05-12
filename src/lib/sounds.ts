export function playCompleteSound() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime

    // Two-note ascending chime: G5 → C6
    const notes = [783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      osc.start(t)
      osc.stop(t + 0.3)
    })

    setTimeout(() => ctx.close(), 800)
  } catch {
    // Audio not supported — fail silently
  }
}
