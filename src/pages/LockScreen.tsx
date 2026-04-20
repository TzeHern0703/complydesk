import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface LockScreenProps {
  passwordHash: string
  onUnlock: () => void
}

export function LockScreen({ passwordHash, onUnlock }: LockScreenProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  async function handleUnlock() {
    const hash = await sha256(input)
    if (hash === passwordHash) {
      onUnlock()
    } else {
      setError('Incorrect password')
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded p-8 w-full max-w-sm text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
            <Lock size={20} className="text-neutral-900" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-medium text-neutral-900">ComplyDesk</h1>
          <p className="text-sm text-neutral-400 mt-1">Enter your password to unlock</p>
        </div>
        <div className="text-left space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            autoFocus
          />
          {error && <p className="text-xs text-neutral-900 font-medium">{error}</p>}
          <Button variant="primary" className="w-full justify-center" onClick={handleUnlock}>
            Unlock
          </Button>
        </div>
      </div>
    </div>
  )
}
