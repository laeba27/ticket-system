'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Ticket, ListTodo, Users, LayoutDashboard, Plus, Settings, Search, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLOR_DOT = {
  open:        'bg-blue-400',
  in_progress: 'bg-amber-400',
  resolved:    'bg-emerald-400',
  closed:      'bg-zinc-400',
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',   href: '/dashboard', icon: LayoutDashboard, roles: ['admin','support','developer','agent'] },
  { id: 'tickets',   label: 'All Tickets', href: '/tickets',   icon: Ticket,          roles: ['admin','support','developer','agent'] },
  { id: 'new',       label: 'New Ticket',  href: '/tickets/new', icon: Plus,           roles: ['admin','support','agent'] },
  { id: 'todos',     label: 'My Tasks',    href: '/todos',     icon: ListTodo,        roles: ['admin','support','developer'] },
  { id: 'users',     label: 'Users',       href: '/users',     icon: Users,           roles: ['admin','support'] },
]

export function CommandPalette({ profile }) {
  const router   = useRouter()
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  // ⌘K / Ctrl+K listener
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fetch tickets when palette opens or query changes
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    const p = new URLSearchParams()
    if (query.trim()) p.set('search', query.trim())
    const res  = await fetch(`/api/tickets?${p}`)
    const json = await res.json()
    setTickets((json.data ?? []).slice(0, 6))
    setLoadingTickets(false)
  }, [query])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(fetchTickets, 200)
    return () => clearTimeout(t)
  }, [open, fetchTickets])

  function navigate(href) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const navItems = NAV_ITEMS.filter(n => n.roles.includes(profile?.role))

  return (
    <>
      {/* Trigger hint in sidebar bottom area — rendered externally, just listen for the keyboard */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setQuery('') }}>
        <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden" aria-describedby={undefined}>
          <Command shouldFilter={false}>
            <div className="flex items-center border-b border-border px-3">
              <Search className="size-4 text-muted-foreground shrink-0 mr-2" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search tickets, navigate…"
                className="border-0 focus:ring-0 h-12 text-sm bg-transparent"
              />
              <kbd className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
            </div>
            <CommandList className="max-h-[380px]">
              <CommandEmpty>
                {loadingTickets ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">Searching…</p>
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">No results found</p>
                )}
              </CommandEmpty>

              {/* Navigation */}
              {!query && (
                <CommandGroup heading="Navigate">
                  {navItems.map(item => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <item.icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{item.label}</span>
                      <ArrowRight className="size-3 text-muted-foreground ml-auto" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Tickets */}
              {tickets.length > 0 && (
                <>
                  {!query && <CommandSeparator />}
                  <CommandGroup heading={query ? 'Tickets' : 'Recent Tickets'}>
                    {tickets.map(ticket => (
                      <CommandItem
                        key={ticket.id}
                        value={ticket.id}
                        onSelect={() => navigate(`/tickets/${ticket.id}`)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className={cn('size-2 rounded-full shrink-0', COLOR_DOT[ticket.status] ?? 'bg-muted')} />
                        <span className="text-sm flex-1 truncate">{ticket.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                          {ticket.priority}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Quick actions */}
              {query && navItems.some(n => n.label.toLowerCase().includes(query.toLowerCase())) && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Pages">
                    {navItems
                      .filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
                      .map(item => (
                        <CommandItem
                          key={item.id}
                          value={`nav-${item.id}`}
                          onSelect={() => navigate(item.href)}
                          className="flex items-center gap-2.5 cursor-pointer"
                        >
                          <item.icon className="size-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{item.label}</span>
                          <ArrowRight className="size-3 text-muted-foreground ml-auto" />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span><kbd className="font-mono bg-muted border border-border rounded px-1">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono bg-muted border border-border rounded px-1">↵</kbd> open</span>
              <span><kbd className="font-mono bg-muted border border-border rounded px-1">esc</kbd> close</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
