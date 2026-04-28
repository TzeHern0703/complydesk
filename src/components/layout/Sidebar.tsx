import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, Library, Settings, X, Inbox, ListTodo } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { isBefore } from 'date-fns'

interface SidebarProps {
  overdueCount?: number
  onClose?: () => void
}

export function Sidebar({ overdueCount = 0, onClose }: SidebarProps) {
  const { personalTasks } = useStore()
  const now = new Date()
  const overdueToDoCount = personalTasks.filter(
    (t) => t.type === 'todo' && t.deadline && t.status === 'pending' && isBefore(new Date(t.deadline + 'T23:59:59'), now)
  ).length

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
        <NavItem to="/" label="Dashboard" icon={LayoutDashboard} end badge={overdueCount} onClose={onClose} />
        <NavItem to="/my-week" label="My Week" icon={ListTodo} badge={overdueToDoCount} onClose={onClose} />
        <NavItem to="/clients" label="Clients" icon={Users} onClose={onClose} />
        <NavItem to="/inbox" label="Inbox" icon={Inbox} onClose={onClose} />
        <NavItem to="/calendar" label="Calendar" icon={CalendarDays} onClose={onClose} />
        <NavItem to="/templates" label="Templates" icon={Library} onClose={onClose} />
        <NavItem to="/settings" label="Settings" icon={Settings} onClose={onClose} />
      </nav>
    </aside>
  )
}

interface NavItemProps {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  badge?: number
  onClose?: () => void
}

function NavItem({ to, label, icon: Icon, end, badge, onClose }: NavItemProps) {
  return (
    <NavLink
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
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[18px] h-[18px] rounded-full bg-neutral-900 text-white text-xs font-medium flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}
