import { createClient, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecentTicketsList } from '@/components/tickets/RecentTicketsList'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ticket, TrendingUp, CheckCircle, Zap, ListTodo, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Dashboard — Ethata' }

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const isAgent = profile.role === 'agent'
  const isAdmin = profile.role === 'admin'
  const isSupport = profile.role === 'support'
  const isDeveloper = profile.role === 'developer'

  let ticketQuery = supabase.from('tickets').select('*')
  if (isAgent) ticketQuery = ticketQuery.eq('created_by', profile.id)
  else if (isDeveloper) ticketQuery = ticketQuery.eq('assigned_to', profile.id)

  const [{ data: tickets = [] }, { data: todos = [] }, { data: recentTickets = [] }] = await Promise.all([
    ticketQuery,
    supabase.from('todos').select('*'),
    supabase.from('tickets').select(`
      id, title, status, priority, created_at,
      creator:profiles!tickets_created_by_fkey(full_name, email),
      assignee:profiles!tickets_assigned_to_fkey(full_name, email)
    `).order('created_at', { ascending: false }).limit(6),
  ])

  const now = new Date()
  const overdueCount = tickets.filter(t =>
    t.due_at && new Date(t.due_at) < now && !['resolved', 'closed'].includes(t.status)
  ).length

  const stats = [
    { label: 'Open Tickets',   value: tickets.filter(t => t.status === 'open').length,        icon: <Ticket className="size-4" />,          colorClass: 'text-blue-400' },
    { label: 'In Progress',    value: tickets.filter(t => t.status === 'in_progress').length,  icon: <TrendingUp className="size-4" />,      colorClass: 'text-amber-400' },
    { label: 'Resolved',       value: tickets.filter(t => t.status === 'resolved').length,     icon: <CheckCircle className="size-4" />,     colorClass: 'text-emerald-400' },
    { label: 'Overdue',        value: overdueCount,                                            icon: <AlertTriangle className="size-4" />,   colorClass: overdueCount > 0 ? 'text-red-400' : 'text-muted-foreground' },
    ...(!isAgent ? [{ label: 'Pending Tasks', value: todos.filter(t => t.status !== 'done').length, icon: <ListTodo className="size-4" />, colorClass: 'text-purple-400' }] : []),
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.full_name?.split(' ')[0] || 'there'

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Here's what's happening in your workspace today."
        action={
          (isAgent || isAdmin || isSupport) && (
            <Link href="/tickets/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" /> New Ticket
              </Button>
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={s.label} className={cn('animate-fade-up', `stagger-${i + 1}`)}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Recent tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-5 py-3.5 pb-0">
          <h2 className="text-sm font-semibold">Recent Tickets</h2>
          <Link href="/tickets">
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
              View all →
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <RecentTicketsList
            tickets={recentTickets}
            canCreate={isAgent || isAdmin || isSupport}
          />
        </CardContent>
      </Card>
    </div>
  )
}
