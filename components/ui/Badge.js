import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }) {
  const config = {
    open:        { label: 'Open',        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
    resolved:    { label: 'Resolved',    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
    closed:      { label: 'Closed',      className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',   dot: 'bg-zinc-500' },
    pending:     { label: 'Pending',     className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400' },
    done:        { label: 'Done',        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  }
  const c = config[status] ?? config.open
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium text-[11px] px-2 py-0.5', c.className)}>
      <span className={cn('size-1.5 rounded-full shrink-0', c.dot)} />
      {c.label}
    </Badge>
  )
}

export function PriorityBadge({ priority }) {
  const config = {
    low:      { label: 'Low',      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: '↓' },
    medium:   { label: 'Medium',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',         icon: '→' },
    high:     { label: 'High',     className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',      icon: '↑' },
    critical: { label: 'Critical', className: 'bg-red-500/10 text-red-400 border-red-500/20',            icon: '⚡' },
  }
  const c = config[priority] ?? config.medium
  return (
    <Badge variant="outline" className={cn('gap-1 font-semibold text-[11px] px-2 py-0.5', c.className)}>
      <span className="text-[10px]">{c.icon}</span>
      {c.label}
    </Badge>
  )
}

export function RoleBadge({ role }) {
  const config = {
    admin:     { label: 'Admin',     className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    support:   { label: 'Support',   className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    developer: { label: 'Developer', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    agent:     { label: 'Agent',     className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  }
  const c = config[role] ?? { label: role, className: 'bg-muted text-muted-foreground' }
  return (
    <Badge variant="outline" className={cn('font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5', c.className)}>
      {c.label}
    </Badge>
  )
}
