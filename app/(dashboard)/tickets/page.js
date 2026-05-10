'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/Card'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketRow } from '@/components/tickets/TicketRow'
import { KanbanBoard } from '@/components/tickets/KanbanBoard'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS  = ['all', 'open', 'in_progress', 'resolved', 'closed']
const PRIORITY_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high',     label: 'High' },
  { key: 'medium',   label: 'Medium' },
  { key: 'low',      label: 'Low' },
]

function FilterChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer capitalize',
        active
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
      )}
    >
      {label.replace('_', ' ')}
    </button>
  )
}

export default function TicketsPage() {
  const [tickets, setTickets]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [statusFilter, setStatusFilter]     = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch]                 = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [view, setView]                     = useState('table')   // 'table' | 'board'

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusFilter !== 'all')   p.set('status', statusFilter)
    if (priorityFilter !== 'all') p.set('priority', priorityFilter)
    if (debouncedSearch)          p.set('search', debouncedSearch)
    const res  = await fetch(`/api/tickets?${p}`)
    const json = await res.json()
    setTickets(json.data ?? [])
    setLoading(false)
  }, [statusFilter, priorityFilter, debouncedSearch])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  async function updateStatus(ticketId, status) {
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchTickets()
  }

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Track, manage and resolve support tickets"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView('table')}
                className={cn('p-1.5 transition-colors', view === 'table' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                title="Table view"
              >
                <List className="size-3.5" />
              </button>
              <button
                onClick={() => setView('board')}
                className={cn('p-1.5 transition-colors', view === 'board' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                title="Board view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
            <Link href="/tickets/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" /> New Ticket
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters bar */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground shrink-0">Status:</span>
            {STATUS_FILTERS.map(s => (
              <FilterChip key={s} active={statusFilter === s} label={s} onClick={() => setStatusFilter(s)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground shrink-0">Priority:</span>
            {PRIORITY_FILTERS.map(({ key, label }) => (
              <FilterChip key={key} active={priorityFilter === key} label={label} onClick={() => setPriorityFilter(key)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Board view */}
      {view === 'board' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border-t-2 border-t-border bg-muted/30 p-2 space-y-2 min-h-[200px]">
                  <Skeleton className="h-4 w-1/2 m-2" />
                  {Array.from({ length: 2 }).map((_, j) => <Skeleton key={j} className="h-20 rounded-xl" />)}
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard tickets={tickets} onStatusChange={updateStatus} />
          )}
        </div>
      )}

      {/* Table */}
      {view === 'table' && <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4">Title</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Priority</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Assigned</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-2/3 mb-1.5" />
                    <Skeleton className="h-3 w-1/3" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-3 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState
                    icon="🎫"
                    title="No tickets found"
                    description={debouncedSearch || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first ticket to get started'}
                    action={
                      <Link href="/tickets/new">
                        <Button size="sm" className="gap-1.5">
                          <Plus className="size-3.5" /> Create Ticket
                        </Button>
                      </Link>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              tickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} />)
            )}
          </TableBody>
        </Table>
        {!loading && tickets.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </Card>}
    </div>
  )
}
