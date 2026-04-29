import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { Templates } from './pages/Templates'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { Inbox } from './pages/Inbox'
import { LockScreen } from './pages/LockScreen'
import { MyWeek } from './pages/MyWeek'
import { useStore } from './store/useStore'

export default function App() {
  const { loadAll, isLoading, settings, isLocked, setLocked } = useStore()

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (settings?.passwordEnabled && settings.passwordHash) {
      setLocked(true)
    }
  }, [settings?.passwordEnabled])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-neutral-400">Loading…</div>
      </div>
    )
  }

  if (isLocked && settings?.passwordHash) {
    return <LockScreen passwordHash={settings.passwordHash} onUnlock={() => setLocked(false)} />
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/my-week" element={<MyWeek />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
