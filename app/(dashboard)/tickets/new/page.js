'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, ChevronLeft, Info, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_INFO = [
  { value: 'critical', label: 'Critical', desc: 'System outage, data loss, security breach', color: 'bg-red-500/10 text-red-400 border-red-500/20',    sla: '4 hours' },
  { value: 'high',     label: 'High',     desc: 'Core feature broken, major user impact',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', sla: '24 hours' },
  { value: 'medium',   label: 'Medium',   desc: 'Feature degraded, moderate impact',        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    sla: '3 days' },
  { value: 'low',      label: 'Low',      desc: 'Minor bugs, cosmetic issues, enhancements', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', sla: '7 days' },
]

export default function NewTicketPage() {
  const router = useRouter()
  const [form, setForm]   = useState({ title: '', description: '', priority: 'medium', due_at: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    else if (form.title.trim().length < 5) e.title = 'At least 5 characters'
    if (!form.description.trim()) e.description = 'Description is required'
    else if (form.description.trim().length < 10) e.description = 'At least 10 characters'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setServerError('')

    const payload = { ...form }
    if (!payload.due_at) delete payload.due_at   // let API auto-calc

    const res  = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) setServerError(json.error || 'Failed to create ticket')
    else router.push(`/tickets/${json.data.id}`)
  }

  const set = k => v => {
    // handle both event.target.value (Input/Textarea) and direct value (Select)
    const val = typeof v === 'string' ? v : v.target.value
    setForm(p => ({ ...p, [k]: val }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  const selectedPriority = PRIORITY_INFO.find(p => p.value === form.priority)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Create New Ticket"
        breadcrumb={
          <Link href="/tickets" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-3" /> Tickets
          </Link>
        }
        description="Submit a support ticket for the team to review"
      />

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Title <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={set('title')}
                  placeholder="e.g. Login page crashes on mobile"
                  className={cn('h-10', errors.title && 'border-destructive')}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">Description <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Steps to reproduce, expected vs actual behavior, environment details…"
                  rows={7}
                  className={cn(errors.description && 'border-destructive')}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={set('priority')}>
                  <SelectTrigger className={cn('h-10 w-full', selectedPriority && selectedPriority.color)}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] font-bold uppercase shrink-0 pointer-events-none', selectedPriority?.color)}>
                        {selectedPriority?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{selectedPriority?.desc}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_INFO.map(p => (
                      <SelectItem key={p.value} value={p.value} className="py-2.5">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn('text-[10px] font-bold uppercase shrink-0', p.color)}>{p.label}</Badge>
                          <span className="text-xs text-muted-foreground">{p.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  Due Date
                  <span className="text-muted-foreground font-normal">(optional — auto-set from priority)</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.due_at}
                  onChange={set('due_at')}
                  min={new Date().toISOString().slice(0, 16)}
                  className="h-10 text-sm"
                />
                {!form.due_at && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Auto SLA: {PRIORITY_INFO.find(p => p.value === form.priority)?.sla} from submission
                  </p>
                )}
              </div>

              {serverError && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="size-3.5" />
                  <AlertDescription className="text-xs">{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? 'Submitting…' : 'Submit Ticket'}
                </Button>
                <Link href="/tickets">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Priority guide */}
        <Card className="h-fit">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <Info className="size-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority Guide</p>
            </div>
            <div className="space-y-3">
              {PRIORITY_INFO.map(p => (
                <div key={p.value} className={cn(
                  'rounded-lg border p-3 transition-colors',
                  form.priority === p.value ? p.color : 'border-border',
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', p.color)}>{p.label}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-2.5" />{p.sla}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
