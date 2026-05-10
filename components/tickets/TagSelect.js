'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tag, X, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLOR_CLASSES = {
  red:     'bg-red-500/10 text-red-400 border-red-500/25',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/25',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/25',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  orange:  'bg-orange-500/10 text-orange-400 border-orange-500/25',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  zinc:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
}

export function TagBadge({ tag, onRemove }) {
  const cls = COLOR_CLASSES[tag.color] ?? COLOR_CLASSES.zinc
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border',
      cls
    )}>
      {tag.name}
      {onRemove && (
        <button onClick={() => onRemove(tag.id)} className="hover:opacity-70 transition-opacity ml-0.5">
          <X className="size-2.5" />
        </button>
      )}
    </span>
  )
}

export function TagSelect({ ticketId, currentTags = [], canEdit, onChanged }) {
  const [allTags, setAllTags]   = useState([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(j => setAllTags(j.data ?? []))
  }, [])

  const attached = currentTags.map(tt => tt.tags ?? tt).filter(Boolean)
  const attachedIds = new Set(attached.map(t => t.id))

  async function toggle(tag) {
    setLoading(true)
    const has = attachedIds.has(tag.id)
    await fetch(`/api/tickets/${ticketId}/tags`, {
      method:  has ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tag_id: tag.id }),
    })
    onChanged?.()
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {attached.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No labels</span>
        )}
        {attached.map(tag => (
          <TagBadge
            key={tag.id}
            tag={tag}
            onRemove={canEdit ? id => toggle({ id, ...tag }) : null}
          />
        ))}
      </div>

      {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Plus className="size-3" /> Add label
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Labels</p>
            <div className="space-y-0.5">
              {allTags.map(tag => {
                const active = attachedIds.has(tag.id)
                const cls    = COLOR_CLASSES[tag.color] ?? COLOR_CLASSES.zinc
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggle(tag)}
                    disabled={loading}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer',
                      active ? 'bg-accent' : 'hover:bg-accent'
                    )}
                  >
                    <span className={cn('size-2 rounded-full border shrink-0', cls)} />
                    <span className="flex-1 text-left">{tag.name}</span>
                    {active && <Check className="size-3 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
