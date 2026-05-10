'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { TodoCommentSection } from '@/components/todos/TodoCommentSection'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ExternalLink, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TODO_STATUS = [
  { value: 'pending',     label: 'Pending',     dot: 'bg-blue-400',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-amber-400',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'done',        label: 'Done',        dot: 'bg-emerald-400', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
]

export default function TodoDetailPage() {
  const { id }  = useParams()
  const router  = useRouter()
  const [todo, setTodo]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      createClient().from('profiles').select('*').eq('user_id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  const fetchTodo = useCallback(async () => {
    const res = await fetch(`/api/todos/${id}`)
    if (res.ok) setTodo((await res.json()).data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTodo() }, [fetchTodo])

  async function updateStatus(status) {
    setUpdating(true)
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchTodo()
    setUpdating(false)
  }

  const canSeeInternal = ['admin', 'support', 'developer'].includes(profile?.role)
  const canUpdateStatus = ['admin', 'developer'].includes(profile?.role)

  const currentStatus = TODO_STATUS.find(s => s.value === todo?.status)

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

  if (!todo) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm mb-3">Task not found</p>
        <Link href="/todos"><button className="text-xs text-primary hover:underline">← Back to tasks</button></Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={todo.title}
        breadcrumb={
          <Link href="/todos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-3" /> Tasks
          </Link>
        }
      />

      <div className="grid md:grid-cols-[1fr_260px] gap-4 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Notes / description */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {todo.notes || <span className="italic text-muted-foreground">No notes provided.</span>}
              </p>
            </CardContent>
          </Card>

          {/* Status pills */}
          {canUpdateStatus && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {TODO_STATUS.map(s => (
                    <button
                      key={s.value}
                      disabled={todo.status === s.value || updating}
                      onClick={() => updateStatus(s.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:cursor-not-allowed',
                        todo.status === s.value
                          ? s.color + ' ring-1'
                          : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                        updating && todo.status !== s.value && 'opacity-50',
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full shrink-0', s.dot)} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal comments */}
          {canSeeInternal && (
            <Card>
              <CardContent className="p-5">
                <TodoCommentSection todoId={id} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — metadata */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
              <Separator />
              {[
                {
                  label: 'Status',
                  value: currentStatus ? (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border', currentStatus.color)}>
                      <span className={cn('size-1.5 rounded-full', currentStatus.dot)} />
                      {currentStatus.label}
                    </span>
                  ) : null,
                },
                {
                  label: 'Assigned to',
                  value: todo.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {(todo.assignee.full_name || todo.assignee.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{todo.assignee.full_name || todo.assignee.email}</span>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Unassigned</span>,
                },
                {
                  label: 'Created by',
                  value: todo.creator ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-primary/20 text-primary text-[10px] font-bold">
                          {(todo.creator.full_name || todo.creator.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{todo.creator.full_name || todo.creator.email}</span>
                    </div>
                  ) : null,
                },
                { label: 'Created',  value: <span className="text-xs text-muted-foreground">{fmt(todo.created_at)}</span> },
                { label: 'Updated',  value: <span className="text-xs text-muted-foreground">{fmt(todo.updated_at)}</span> },
              ].map(({ label, value }) => value && (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <div className="text-right">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Parent ticket */}
          {todo.ticket && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Ticket</p>
                <Separator />
                <Link
                  href={`/tickets/${todo.ticket.id}`}
                  className="flex items-start gap-2 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-relaxed line-clamp-2">
                      {todo.ticket.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={todo.ticket.status} />
                      <PriorityBadge priority={todo.ticket.priority} />
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Task ID</p>
              <p className="text-[11px] text-muted-foreground font-mono break-all">{todo.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
