'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MentionTextarea, CommentBody } from '@/components/ui/MentionTextarea'
import { Loader2, Send, Lock, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

export function TodoCommentSection({ todoId }) {
  const [comments, setComments]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [body, setBody]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch(`/api/todos/${todoId}/comments`)
      .then(r => r.json())
      .then(json => { setComments(json.data ?? []); setLoading(false) })
  }, [todoId])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true); setError('')

    const res  = await fetch(`/api/todos/${todoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) setError(json.error || 'Failed to post')
    else { setComments(p => [...p, json.data]); setBody('') }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-amber-400" />
        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
          Internal comments
        </span>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/8 text-amber-400 border-amber-500/25 ml-auto">
          Not visible to agents
        </Badge>
      </div>

      {/* Comment list */}
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No internal comments yet.</p>
      ) : (
        <div className="space-y-2">
          {comments.map(c => {
            const author   = c.author
            const initials = author?.full_name
              ? author.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : (author?.email?.[0] ?? '?').toUpperCase()
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="size-5 rounded-md shrink-0 mt-0.5">
                  <AvatarFallback className="rounded-md bg-amber-500/15 text-amber-400 text-[9px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-amber-500/5 border border-amber-500/15 rounded-lg rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      {author?.full_name || author?.email}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <CommentBody text={c.body ?? ''} className="text-xs text-foreground leading-relaxed" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="flex gap-2">
        <MentionTextarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Internal note… (type @ to mention)"
          rows={2}
          containerClassName="flex-1"
          className="text-xs"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e) }}
        />
        <Button
          type="submit" size="icon"
          variant="outline"
          className="size-8 shrink-0 self-end border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          disabled={submitting || !body.trim()}
        >
          {submitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
