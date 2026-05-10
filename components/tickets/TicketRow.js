'use client'

import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { TableRow, TableCell } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TagBadge } from '@/components/tickets/TagSelect'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDue(due_at) {
  const d = new Date(due_at)
  const now = new Date()
  const diffMs = d - now
  const diffH  = Math.floor(Math.abs(diffMs) / 3600_000)
  const diffD  = Math.floor(diffH / 24)

  if (diffMs < 0) {
    // overdue
    if (diffH < 24) return { label: `${diffH}h overdue`, overdue: true }
    return { label: `${diffD}d overdue`, overdue: true }
  }
  if (diffH < 1)  return { label: 'Due soon', soon: true }
  if (diffH < 24) return { label: `${diffH}h left`, soon: diffH < 4 }
  if (diffD < 3)  return { label: `${diffD}d left`, soon: diffD < 2 }
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
}

export function TicketRow({ ticket }) {
  const assigneeName    = ticket.assignee?.full_name || ticket.assignee?.email
  const assigneeInitial = assigneeName?.[0]?.toUpperCase()
  const active          = !['resolved', 'closed'].includes(ticket.status)
  const due             = ticket.due_at && active ? fmtDue(ticket.due_at) : null

  return (
    <TableRow
      className="cursor-pointer group hover:bg-accent/40"
      onClick={() => { window.location.href = `/tickets/${ticket.id}` }}
    >
      <TableCell className="py-3 pl-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {ticket.title}
          </p>
          {due?.overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 shrink-0">
              <AlertTriangle className="size-2.5" /> {due.label}
            </span>
          )}
          {due?.soon && !due?.overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
              <Clock className="size-2.5" /> {due.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {ticket.creator?.full_name || ticket.creator?.email}
            {due && !due.overdue && !due.soon && (
              <span className="ml-2 text-muted-foreground/60">· due {due.label}</span>
            )}
          </span>
          {ticket.ticket_tags?.map(tt => tt.tags && (
            <TagBadge key={tt.tag_id} tag={tt.tags} />
          ))}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="py-3">
        <PriorityBadge priority={ticket.priority} />
      </TableCell>
      <TableCell className="py-3">
        {ticket.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-5 rounded-md">
              <AvatarFallback className="rounded-md bg-primary/20 text-primary text-[10px] font-bold">
                {assigneeInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-foreground truncate max-w-[90px]">{assigneeName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="py-3 pr-4 text-right text-xs text-muted-foreground">
        {timeAgo(ticket.created_at)}
      </TableCell>
    </TableRow>
  )
}

// kept for backward compat
export function TicketTableHeader() { return null }
