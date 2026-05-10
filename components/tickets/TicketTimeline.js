'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MentionTextarea, CommentBody } from '@/components/ui/MentionTextarea'
import { Loader2, Send, Lock, GitBranch, UserCheck, Tag, PlusCircle, CheckCircle2, MessageSquare, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmt(v) {
  return (v ?? '').replace('_', ' ')
}

const EVENT_META = {
  ticket_created:      { icon: Ticket,       color: 'text-primary',        label: 'Ticket created' },
  status_changed:      { icon: GitBranch,    color: 'text-blue-400',       label: 'Status changed' },
  priority_changed:    { icon: Tag,          color: 'text-amber-400',      label: 'Priority changed' },
  assigned:            { icon: UserCheck,    color: 'text-emerald-400',    label: 'Assigned' },
  todo_created:        { icon: PlusCircle,   color: 'text-purple-400',     label: 'Task created' },
  todo_status_changed: { icon: CheckCircle2, color: 'text-purple-400',     label: 'Task updated' },
  comment:             { icon: MessageSquare,color: 'text-foreground',      label: 'Comment' },
}

function EventIcon({ type }) {
  const meta = EVENT_META[type] ?? EVENT_META.comment
  const Icon = meta.icon
  return (
    <div className={cn(
      'size-7 rounded-full border border-border bg-background flex items-center justify-center shrink-0 z-10',
      type === 'comment' ? 'bg-card' : 'bg-muted'
    )}>
      <Icon className={cn('size-3.5', meta.color)} />
    </div>
  )
}

function SystemEvent({ event }) {
  const actorName = event.author?.full_name || event.author?.email || 'System'

  const description = (() => {
    switch (event.type) {
      case 'ticket_created':
        return <><strong>{actorName}</strong> created this ticket</>
      case 'status_changed':
        return <><strong>{actorName}</strong> changed status from{' '}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.old_value)}</Badge>
          to <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.new_value)}</Badge></>
      case 'priority_changed':
        return <><strong>{actorName}</strong> changed priority from{' '}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.old_value)}</Badge>
          to <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.new_value)}</Badge></>
      case 'assigned':
        return <><strong>{actorName}</strong> assigned ticket to <strong>{event.body || 'a developer'}</strong></>
      case 'todo_created':
        return <><strong>{actorName}</strong> created task <em>"{event.body}"</em> for <strong>{event.new_value}</strong></>
      case 'todo_status_changed':
        return <><strong>{actorName}</strong> updated task <em>"{event.body}"</em> from{' '}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.old_value)}</Badge>
          to <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mx-0.5">{fmt(event.new_value)}</Badge></>
      default:
        return <><strong>{actorName}</strong> made a change</>
    }
  })()

  return (
    <div className="flex items-start gap-3">
      <EventIcon type={event.type} />
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground leading-5">{description}</p>
          {event.is_internal && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/8 text-amber-400 border-amber-500/25 gap-1 py-0">
              <Lock className="size-2.5" /> Internal
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  )
}

function CommentEvent({ event }) {
  const author   = event.author
  const initials = author?.full_name
    ? author.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (author?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-7 rounded-lg shrink-0 z-10">
        <AvatarFallback className={cn(
          'rounded-lg text-[10px] font-bold',
          event.is_internal ? 'bg-amber-500/15 text-amber-400' : 'bg-primary/15 text-primary'
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'rounded-xl rounded-tl-sm border p-3',
          event.is_internal
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-card border-border'
        )}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-foreground">
              {author?.full_name || author?.email || 'Unknown'}
            </span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(event.created_at)}</span>
            {event.is_internal && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/8 text-amber-400 border-amber-500/25 gap-1 py-0 ml-auto">
                <Lock className="size-2.5" /> Internal
              </Badge>
            )}
            {event.todo_id && (
              <Badge variant="outline" className="text-[10px] bg-purple-500/8 text-purple-400 border-purple-500/20 py-0">
                from task
              </Badge>
            )}
          </div>
          <CommentBody text={event.body ?? ''} className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" />
        </div>
      </div>
    </div>
  )
}

export function TicketTimeline({ ticketId, profile }) {
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [comment, setComment]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const bottomRef = useRef(null)

  const loadEvents = useCallback(async () => {
    const res  = await fetch(`/api/tickets/${ticketId}/events`)
    const json = await res.json()
    setEvents(json.data ?? [])
    setLoading(false)
  }, [ticketId])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function submitComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true); setError('')

    const res  = await fetch(`/api/tickets/${ticketId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: comment.trim() }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(json.error || 'Failed to post comment') }
    else {
      setEvents(prev => [...prev, json.data])
      setComment('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Timeline</h3>
        {!loading && <Badge variant="secondary" className="text-xs">{events.length}</Badge>}
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="size-3.5 animate-spin" /> Loading timeline…
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No activity yet.</p>
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[13px] top-4 bottom-4 w-px bg-border" />
            <div className="space-y-5">
              {events.map(event => (
                <div key={event.id}>
                  {event.type === 'comment'
                    ? <CommentEvent event={event} />
                    : <SystemEvent event={event} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment form */}
        <div ref={bottomRef} className="mt-5 pt-4 border-t border-border">
          <form onSubmit={submitComment} className="space-y-2">
            <MentionTextarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={profile?.role === 'agent'
                ? 'Add a comment…'
                : 'Add a comment… (type @ to mention)'}
              rows={3}
              className="text-sm"
              canMention={profile?.role !== 'agent'}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(e)
              }}
            />
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">⌘ + Enter to submit</p>
              <Button type="submit" size="sm" disabled={submitting || !comment.trim()} className="gap-1.5">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Comment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
