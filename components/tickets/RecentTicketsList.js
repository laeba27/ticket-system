'use client'

import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentTicketsList({ tickets, canCreate }) {
  if (!tickets?.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No tickets yet.{' '}
        {canCreate && (
          <Link href="/tickets/new" className="text-primary hover:underline">Create one →</Link>
        )}
      </div>
    )
  }

  return (
    <div>
      {tickets.map((ticket, i) => (
        <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
          <div className={cn(
            'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50 cursor-pointer',
            i < tickets.length - 1 && 'border-b border-border'
          )}>
            <div className={cn(
              'size-2 rounded-full shrink-0',
              ticket.status === 'open'        ? 'bg-blue-400' :
              ticket.status === 'in_progress' ? 'bg-amber-400' :
              ticket.status === 'resolved'    ? 'bg-emerald-400' : 'bg-zinc-500'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ticket.creator?.full_name || ticket.creator?.email}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="text-xs text-muted-foreground hidden sm:block w-14 text-right">
                {timeAgo(ticket.created_at)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
