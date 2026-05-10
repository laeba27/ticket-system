'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge, PriorityBadge, RoleBadge } from '@/components/ui/Badge'
import { AssignModal } from '@/components/tickets/AssignModal'
import { TagSelect } from '@/components/tickets/TagSelect'
import { TicketTimeline } from '@/components/tickets/TicketTimeline'
import { TodoCommentSection } from '@/components/todos/TodoCommentSection'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, UserPlus, Trash2, CheckCircle2, Circle, ChevronDown, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TicketDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const [ticket, setTicket]         = useState(null)
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [updating, setUpdating]     = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [todoUpdating, setTodoUpdating] = useState(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      createClient().from('profiles').select('*').eq('user_id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`)
    if (res.ok) setTicket((await res.json()).data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  async function updateStatus(status) {
    setUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchTicket()
    setUpdating(false)
  }

  async function updateTodo(todoId, status) {
    setTodoUpdating(todoId)
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchTicket()
    setTodoUpdating(null)
  }

  async function deleteTicket() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/tickets')
    else setDeleting(false)
  }

  const canAssign       = ['admin', 'support'].includes(profile?.role)
  const canDelete       = profile?.role === 'admin'
  const canChangeStatus = ['admin', 'support'].includes(profile?.role) || ticket?.created_by === profile?.id
  const canSeeInternal  = ['admin', 'support', 'developer'].includes(profile?.role)
  const isActive        = ticket && !['resolved', 'closed'].includes(ticket.status)

  if (loading) {
    return (
      <div>
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-6" />
        <div className="grid md:grid-cols-[1fr_260px] gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm mb-3">Ticket not found</p>
        <Link href="/tickets"><Button variant="outline" size="sm">← Back to tickets</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={ticket.title}
        breadcrumb={
          <Link href="/tickets" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-3" /> Tickets
          </Link>
        }
        action={
          <div className="flex gap-2">
            {canAssign && isActive && (
              <Button size="sm" onClick={() => setShowAssign(true)} className="gap-1.5">
                <UserPlus className="size-3.5" /> Assign
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={deleteTicket} disabled={deleting} className="gap-1.5">
                <Trash2 className="size-3.5" /> {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid md:grid-cols-[1fr_260px] gap-4 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Description */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Description</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description || <span className="italic text-muted-foreground">No description provided.</span>}
              </p>
            </CardContent>
          </Card>

          {/* Status controls */}
          {canChangeStatus && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'open',        label: 'Open',        active: 'bg-blue-500/15 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30',        idle: 'border-blue-500/20 text-blue-400/60 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30' },
                    { value: 'in_progress', label: 'In Progress', active: 'bg-amber-500/15 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30',      idle: 'border-amber-500/20 text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30' },
                    { value: 'resolved',    label: 'Resolved',    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30', idle: 'border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30' },
                    { value: 'closed',      label: 'Closed',      active: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/40 ring-1 ring-zinc-500/30',          idle: 'border-zinc-500/20 text-zinc-400/60 hover:bg-zinc-500/10 hover:text-zinc-400 hover:border-zinc-500/30' },
                  ].map(s => (
                    <button
                      key={s.value}
                      disabled={ticket.status === s.value || updating}
                      onClick={() => updateStatus(s.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:cursor-not-allowed',
                        ticket.status === s.value ? s.active : s.idle,
                        updating && ticket.status !== s.value && 'opacity-50',
                      )}
                    >
                      <span className={cn(
                        'size-1.5 rounded-full shrink-0',
                        s.value === 'open'        && 'bg-blue-400',
                        s.value === 'in_progress' && 'bg-amber-400',
                        s.value === 'resolved'    && 'bg-emerald-400',
                        s.value === 'closed'      && 'bg-zinc-400',
                      )} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Developer todos */}
          {ticket.todos?.length > 0 && (
            <Card>
              <CardHeader className="px-5 py-3.5 pb-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Developer Tasks ({ticket.todos.length})
                </p>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                {ticket.todos.map((todo, i) => (
                  <div key={todo.id} className={cn('px-5 py-3', i < ticket.todos.length - 1 && 'border-b border-border')}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateTodo(todo.id, todo.status === 'done' ? 'in_progress' : 'done')}
                        disabled={todoUpdating === todo.id}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {todo.status === 'done'
                          ? <CheckCircle2 className="size-4 text-emerald-400" />
                          : <Circle className="size-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium', todo.status === 'done' && 'line-through text-muted-foreground')}>
                          {todo.title}
                        </p>
                        {todo.notes && <p className="text-xs text-muted-foreground mt-0.5">{todo.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          → {todo.assignee?.full_name || todo.assignee?.email}
                        </p>
                      </div>
                      <Select
                        value={todo.status}
                        onValueChange={v => updateTodo(todo.id, v)}
                        disabled={todoUpdating === todo.id}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Internal comments on this todo — hidden from agents */}
                    {canSeeInternal && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger asChild>
                          <button className="mt-2 ml-7 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-400 transition-colors">
                            <ChevronDown className="size-3" />
                            Internal notes
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-7">
                          <TodoCommentSection todoId={todo.id} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline + Comments */}
          <Card className="overflow-hidden">
            <TicketTimeline ticketId={id} profile={profile} />
          </Card>
        </div>

        {/* Right — metadata */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
              <Separator />
              {[
                { label: 'Status',   value: <StatusBadge status={ticket.status} /> },
                { label: 'Priority', value: <PriorityBadge priority={ticket.priority} /> },
                {
                  label: 'Created by',
                  value: (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-primary/20 text-primary text-[10px] font-bold">
                          {(ticket.creator?.full_name || ticket.creator?.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{ticket.creator?.full_name || ticket.creator?.email}</span>
                    </div>
                  ),
                },
                {
                  label: 'Assigned to',
                  value: ticket.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {(ticket.assignee.full_name || ticket.assignee.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{ticket.assignee.full_name || ticket.assignee.email}</span>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Unassigned</span>,
                },
                {
                  label: 'Due Date',
                  value: ticket.due_at ? (() => {
                    const isActive   = !['resolved', 'closed'].includes(ticket.status)
                    const isOverdue  = isActive && new Date(ticket.due_at) < new Date()
                    const isSoon     = isActive && !isOverdue && (new Date(ticket.due_at) - new Date()) < 4 * 3600_000
                    return (
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        isOverdue ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-muted-foreground'
                      )}>
                        {isOverdue && <AlertTriangle className="size-3" />}
                        {isSoon    && <Clock className="size-3" />}
                        {fmt(ticket.due_at)}
                      </span>
                    )
                  })() : <span className="text-xs text-muted-foreground">—</span>,
                },
                { label: 'Created',  value: <span className="text-xs text-muted-foreground">{fmt(ticket.created_at)}</span> },
                { label: 'Updated',  value: <span className="text-xs text-muted-foreground">{fmt(ticket.updated_at)}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <div className="text-right">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</p>
              <Separator />
              <TagSelect
                ticketId={ticket.id}
                currentTags={ticket.ticket_tags ?? []}
                canEdit={['admin', 'support'].includes(profile?.role)}
                onChanged={fetchTicket}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ticket ID</p>
              <p className="text-[11px] text-muted-foreground font-mono break-all">{ticket.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAssign && (
        <AssignModal
          ticket={ticket}
          onClose={() => setShowAssign(false)}
          onAssigned={() => fetchTicket()}
        />
      )}
    </div>
  )
}
