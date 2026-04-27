import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, Library, Settings, X, Inbox, ListTodo } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/my-week', label: 'My Week', icon: ListTodo },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <span className="text-base font-semibold text-neutral-900">ComplyDesk</span>
          <p className="text-xs text-neutral-400 mt-0.5">MY Compliance Tracker</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-100 text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
