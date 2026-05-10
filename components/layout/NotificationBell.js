'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, GitBranch, MessageSquare, UserCheck, Tag, PlusCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const LS_KEY = 'notifications_last_seen'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

function notificationMeta(event) {
  const actor  = event.actor?.full_name || event.actor?.email || 'Someone'
  const ticket = event.ticket?.title || 'a ticket'
  switch (event.type) {
    case 'assigned':
      return { icon: UserCheck,    color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: `${actor} assigned you to`, ticket }
    case 'comment':
      return { icon: MessageSquare,color: 'text-blue-400',    bg: 'bg-blue-500/10',    text: `${actor} commented on`, ticket }
    case 'status_changed':
      return { icon: GitBranch,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   text: `${actor} changed status to ${(event.new_value || '').replace('_', ' ')} on`, ticket }
    case 'priority_changed':
      return { icon: Tag,          color: 'text-purple-400',  bg: 'bg-purple-500/10',  text: `${actor} changed priority to ${event.new_value} on`, ticket }
    case 'todo_created':
      return { icon: PlusCircle,   color: 'text-primary',     bg: 'bg-primary/10',     text: `${actor} created a task on`, ticket }
    default:
      return { icon: Bell,         color: 'text-muted-foreground', bg: 'bg-muted',     text: `${actor} updated`, ticket }
  }
}

export function NotificationBell() {
  const router  = useRouter()
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(false)
  const [lastSeen, setLastSeen]           = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    setLastSeen(stored ? new Date(stored) : null)
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    const res  = await fetch('/api/notifications')
    const json = await res.json()
    setNotifications(json.data ?? [])
    setLoading(false)
  }

  function markAllRead() {
    const now = new Date().toISOString()
    localStorage.setItem(LS_KEY, now)
    setLastSeen(new Date(now))
  }

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !lastSeen || new Date(n.created_at) > lastSeen).length

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications() }}
        className={cn(
          'relative size-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer',
          open ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full bg-red-500 text-white font-bold text-[9px]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-[9999] w-[340px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-primary hover:underline cursor-pointer">
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 p-3 animate-pulse">
                    <div className="size-8 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const meta    = notificationMeta(n)
                const Icon    = meta.icon
                const isUnread = !lastSeen || new Date(n.created_at) > lastSeen
                return (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); markAllRead(); router.push(`/tickets/${n.ticket?.id}`) }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 cursor-pointer border-b border-border/50 last:border-0',
                      isUnread && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.bg)}>
                      <Icon className={cn('size-3.5', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">
                        {meta.text} <span className="font-semibold">"{meta.ticket}"</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {isUnread && <span className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
