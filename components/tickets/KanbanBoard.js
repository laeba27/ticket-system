'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { TagBadge } from '@/components/tickets/TagSelect'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { id: 'open',        label: 'Open',        color: 'border-t-blue-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-amber-400' },
  { id: 'resolved',    label: 'Resolved',    color: 'border-t-emerald-400' },
  { id: 'closed',      label: 'Closed',      color: 'border-t-zinc-400' },
]

function fmtDue(due_at) {
  if (!due_at) return null
  const diff = new Date(due_at) - new Date()
  if (diff < 0) {
    const h = Math.floor(Math.abs(diff) / 3600_000)
    return { label: h < 24 ? `${h}h overdue` : `${Math.floor(h/24)}d overdue`, overdue: true }
  }
  const h = Math.floor(diff / 3600_000)
  if (h < 4)  return { label: `${h}h left`, soon: true }
  if (h < 24) return { label: `${h}h left` }
  return null
}

function KanbanCard({ ticket, isDragging }) {
  const due   = fmtDue(ticket.due_at)
  const active = !['resolved', 'closed'].includes(ticket.status)

  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-3 space-y-2 select-none',
      isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary/30' : 'hover:border-border/80 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing'
    )}>
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium text-foreground leading-snug flex-1 line-clamp-2">
          {ticket.title}
        </p>
      </div>

      {/* Tags */}
      {ticket.ticket_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.ticket_tags.map(tt => tt.tags && <TagBadge key={tt.tag_id} tag={tt.tags} />)}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={ticket.priority} />
        {active && due?.overdue && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-red-400 font-medium">
            <AlertTriangle className="size-2.5" /> {due.label}
          </span>
        )}
        {active && due?.soon && !due?.overdue && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
            <Clock className="size-2.5" /> {due.label}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
          {ticket.creator?.full_name || ticket.creator?.email}
        </span>
        {ticket.assignee && (
          <Avatar className="size-5 rounded-md shrink-0">
            <AvatarFallback className="rounded-md bg-primary/15 text-primary text-[9px] font-bold">
              {(ticket.assignee.full_name || ticket.assignee.email)[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ ticket }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={() => !isDragging && (window.location.href = `/tickets/${ticket.id}`)}
    >
      <KanbanCard ticket={ticket} isDragging={isDragging} />
    </div>
  )
}

function DroppableColumn({ col, tickets }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className={cn(
      'flex flex-col rounded-xl border-t-2 bg-muted/30 min-h-[200px] transition-colors',
      col.color,
      isOver && 'bg-primary/5 ring-1 ring-primary/20'
    )}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground">{col.label}</span>
        <span className="text-[11px] text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
          {tickets.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2">
        {tickets.map(ticket => (
          <DraggableCard key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border border-dashed border-border/50 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ tickets, onStatusChange }) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }))

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tickets.filter(t => t.status === col.id)
    return acc
  }, {})

  const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null

  function onDragStart({ active }) {
    setActiveId(active.id)
  }

  function onDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    // over.id is a column id when dropped on a column
    const newStatus = COLUMNS.find(c => c.id === over.id)?.id
    if (!newStatus) return
    const ticket = tickets.find(t => t.id === active.id)
    if (ticket && ticket.status !== newStatus) {
      onStatusChange(active.id, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map(col => (
          <DroppableColumn key={col.id} col={col} tickets={grouped[col.id] ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && <KanbanCard ticket={activeTicket} />}
      </DragOverlay>
    </DndContext>
  )
}
