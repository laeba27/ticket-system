'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RoleBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard, Ticket, PlusCircle, CheckSquare, Users,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin','support','developer','agent'] },
  { href: '/tickets',     icon: Ticket,          label: 'Tickets',    roles: ['admin','support','developer','agent'] },
  { href: '/tickets/new', icon: PlusCircle,      label: 'New Ticket', roles: ['admin','agent'], isNew: true },
  { href: '/todos',       icon: CheckSquare,     label: 'My Tasks',   roles: ['admin','support','developer'] },
  { href: '/users',       icon: Users,           label: 'Users',      roles: ['admin','support'] },
]

export function Sidebar({ profile }) {
  const pathname            = usePathname()
  const router              = useRouter()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? '?').toUpperCase()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visible = NAV.filter(n => n.roles.includes(profile?.role))

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        'h-screen shrink-0 flex flex-col border-r border-border bg-sidebar overflow-y-auto overflow-x-hidden transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          'flex items-center py-5 shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div
                className="size-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                E
              </div>
              <span className="font-bold text-[15px] text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Ethata
              </span>
            </div>
          )}

          {collapsed && (
            <div
              className="size-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              E
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          )}
        </div>

        <Separator className="mb-3 shrink-0" />

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          {visible.map(item => {
            const Icon   = item.icon
            const active = item.href === '/tickets'
              ? pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/new')
              : pathname === item.href

            const linkContent = (
              <span className={cn(
                'flex items-center rounded-lg text-sm transition-colors cursor-pointer w-full',
                collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}>
                <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                {!collapsed && (
                  <>
                    {item.label}
                    {item.isNew && (
                      <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </>
                )}
              </span>
            )

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>{linkContent}</Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.href} href={item.href}>{linkContent}</Link>
            )
          })}
        </nav>

        {/* ⌘K hint */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
                className="mx-2 mb-2 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex justify-center cursor-pointer shrink-0"
              >
                <Search className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Search ⌘K</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs cursor-pointer shrink-0"
          >
            <Search className="size-3.5 shrink-0" />
            <span className="flex-1 text-left">Quick search…</span>
            <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>
        )}

        {/* User footer */}
        <div className={cn(
          'pb-4 pt-3 border-t border-border mt-auto shrink-0',
          collapsed ? 'px-2' : 'px-3'
        )}>
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mb-1 cursor-pointer"
                  >
                    <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Toggle theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mb-1 cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed(false)}
                    className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Expand sidebar</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
                <Avatar className="size-8 rounded-xl shrink-0">
                  <AvatarFallback className="rounded-xl bg-primary/20 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <RoleBadge role={profile?.role} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title="Toggle theme"
                >
                  <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs"
                onClick={signOut}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
