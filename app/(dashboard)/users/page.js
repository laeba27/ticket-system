'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Card'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { Search, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLES = ['admin', 'support', 'developer', 'agent']
const ROLE_COLORS = {
  admin:     { avatar: 'bg-purple-500/20 text-purple-400', count: 'text-purple-400' },
  support:   { avatar: 'bg-sky-500/20 text-sky-400',       count: 'text-sky-400' },
  developer: { avatar: 'bg-emerald-500/20 text-emerald-400', count: 'text-emerald-400' },
  agent:     { avatar: 'bg-orange-500/20 text-orange-400', count: 'text-orange-400' },
}

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState(null)
  const [updating, setUpdating]   = useState(null)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('user_id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
    fetch('/api/users').then(r => r.json()).then(json => {
      if (json.data) setUsers(json.data)
      setLoading(false)
    })
  }, [])

  async function updateRole(userId, role) {
    setUpdating(userId); setError('')
    const res  = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const json = await res.json()
    if (res.ok) setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u))
    else setError(json.error || 'Failed to update role')
    setUpdating(null)
  }

  const isAdmin  = profile?.role === 'admin'
  const filtered = users.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (!search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <PageHeader
        title="Users"
        description={isAdmin ? 'Manage user roles and permissions' : 'View all users in the system'}
      />

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {ROLES.map(role => {
            const count = users.filter(u => u.role === role).length
            const c     = ROLE_COLORS[role]
            return (
              <Card key={role}>
                <CardContent className="p-4">
                  <p className={cn('text-xl font-bold tracking-tight', c.count)} style={{ fontFamily: 'var(--font-display)' }}>
                    {count}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{role}s</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['all', ...ROLES].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer capitalize',
                  roleFilter === r
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4 py-2.5">
          <AlertCircle className="size-3.5" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4">User</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              {isAdmin && <TableHead className="text-xs font-semibold uppercase tracking-wider">Change Role</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 rounded-xl shrink-0" />
                      <div><Skeleton className="h-3.5 w-28 mb-1.5" /><Skeleton className="h-3 w-40" /></div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                  {isAdmin && <TableCell><Skeleton className="h-8 w-28 rounded-md" /></TableCell>}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isAdmin ? 4 : 3}>
                  <EmptyState icon="👤" title="No users found" description="Try adjusting your search or filter" />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(user => {
                const isSelf = user.id === profile?.id
                const c      = ROLE_COLORS[user.role] ?? ROLE_COLORS.agent
                const initials = user.full_name
                  ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : user.email[0].toUpperCase()

                return (
                  <TableRow key={user.id} className={cn(isSelf && 'bg-primary/3')}>
                    <TableCell className="py-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 rounded-xl shrink-0">
                          <AvatarFallback className={cn('rounded-xl text-xs font-bold', c.avatar)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{user.full_name || '—'}</p>
                            {isSelf && <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-primary border-primary/30 bg-primary/10">you</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3"><RoleBadge role={user.role} /></TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">{fmt(user.created_at)}</TableCell>
                    {isAdmin && (
                      <TableCell className="py-3">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : updating === user.id ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> Updating…
                          </div>
                        ) : (
                          <Select value={user.role} onValueChange={v => updateRole(user.id, v)}>
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => (
                                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
