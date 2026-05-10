'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AssignModal({ ticket, onClose, onAssigned }) {
  const [developers, setDevelopers] = useState([])
  const [assignedTo, setAssignedTo] = useState('')
  const [title, setTitle]           = useState(`Fix: ${ticket.title}`)
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    createClient()
      .from('profiles').select('*').eq('role', 'developer')
      .then(({ data }) => {
        setDevelopers(data ?? [])
        if (data?.length) setAssignedTo(data[0].id)
      })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!assignedTo) return setError('Select a developer')
    if (!title.trim()) return setError('Task title is required')

    setLoading(true)
    const res  = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket.id, assigned_to: assignedTo, title, notes }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) setError(json.error || 'Failed to assign')
    else { onAssigned?.(json.data); onClose() }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
          <DialogDescription className="line-clamp-1">
            Assign "{ticket.title}" to a developer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Developer</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={developers.length === 0}>
              <SelectTrigger className="h-9">
                {(() => {
                  const dev = developers.find(d => d.id === assignedTo)
                  if (!dev) return <span className="text-muted-foreground text-sm">{developers.length === 0 ? 'No developers available' : 'Select developer'}</span>
                  return (
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {(dev.full_name || dev.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{dev.full_name || dev.email}</span>
                    </div>
                  )
                })()}
              </SelectTrigger>
              <SelectContent>
                {developers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 rounded-md">
                        <AvatarFallback className="rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {(d.full_name || d.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {d.full_name || d.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Task title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional context or instructions…"
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="size-3.5" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || developers.length === 0}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Assign to Developer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
