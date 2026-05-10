'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/Card'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

const STATUS_FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

const TODO_STATUS_META = {
  pending:     { label: 'Pending',     dot: 'bg-blue-400',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-400',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  done:        { label: 'Done',        dot: 'bg-emerald-400', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
}

function TodoStatusBadge({ status }) {
  const meta = TODO_STATUS_META[status]
  if (!meta) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border', meta.color)}>
      <span className={cn('size-1.5 rounded-full shrink-0', meta.dot)} />
      {meta.label}
    </span>
  )
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
        active
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
      )}
    >
      {label}
    </button>
  )
}

export default function TodosPage() {
  const router = useRouter()
  const [todos, setTodos]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [updating, setUpdating]   = useState(null)
  const [profile, setProfile]     = useState(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      createClient().from('profiles').select('role').eq('user_id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter !== 'all') p.set('status', filter)
    const res  = await fetch(`/api/todos?${p}`)
    const json = await res.json()
    setTodos(json.data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  async function updateTodo(id, status, e) {
    e?.stopPropagation()
    setUpdating(id)
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchTodos()
    setUpdating(null)
  }

  const canUpdateStatus = ['admin', 'developer'].includes(profile?.role)

  const filtered = debouncedSearch
    ? todos.filter(t => t.title.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : todos

  return (
    <div>
      <PageHeader
        title="My Tasks"
        description="Developer tasks assigned from support tickets"
      />

      {/* Filters bar */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground shrink-0">Status:</span>
            {STATUS_FILTERS.map(({ key, label }) => (
              <FilterChip key={key} active={filter === key} label={label} onClick={() => setFilter(key)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4 w-[40%]">Task</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Linked Ticket</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Assignee</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="py-3 pl-4">
                    <Skeleton className="h-4 w-2/3 mb-1.5" />
                    <Skeleton className="h-3 w-1/3" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right pr-4"><Skeleton className="h-3 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState
                    icon="✓"
                    title="No tasks found"
                    description={debouncedSearch || filter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'No tasks assigned to you yet'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(todo => (
                <TableRow
                  key={todo.id}
                  onClick={() => router.push(`/todos/${todo.id}`)}
                  className={cn('cursor-pointer', todo.status === 'done' && 'opacity-60')}
                >
                  {/* Task title */}
                  <TableCell className="py-3 pl-4">
                    <p className={cn('text-sm font-medium', todo.status === 'done' && 'line-through text-muted-foreground')}>
                      {todo.title}
                    </p>
                    {todo.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{todo.notes}</p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canUpdateStatus ? (
                      <Select
                        value={todo.status}
                        onValueChange={v => updateTodo(todo.id, v)}
                        disabled={updating === todo.id}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:ml-1">
                          <TodoStatusBadge status={todo.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <TodoStatusBadge status={todo.status} />
                    )}
                  </TableCell>

                  {/* Linked ticket */}
                  <TableCell>
                    {todo.ticket ? (
                      <Link
                        href={`/tickets/${todo.ticket.id}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 group max-w-[180px]"
                      >
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors truncate">
                          {todo.ticket.title}
                        </span>
                        {todo.ticket.priority && <PriorityBadge priority={todo.ticket.priority} />}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Assignee */}
                  <TableCell>
                    {todo.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-5 rounded-md shrink-0">
                          <AvatarFallback className="rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                            {(todo.assignee.full_name || todo.assignee.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground truncate max-w-[100px]">
                          {todo.assignee.full_name || todo.assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-right pr-4">
                    <span className="text-xs text-muted-foreground">{timeAgo(todo.created_at)}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
