import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch recent events on tickets I can see (RLS handles that),
  // not created by me, of notification-worthy types
  const { data: events, error } = await supabase
    .from('ticket_events')
    .select(`
      *,
      ticket:tickets(id, title),
      actor:profiles!ticket_events_created_by_fkey(id, full_name, email)
    `)
    .neq('created_by', profile.id)
    .in('type', ['assigned', 'comment', 'status_changed', 'todo_created', 'priority_changed'])
    .eq('is_internal', false)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For 'assigned' events, only include ones where new_value = my profile id
  // (means I was the one assigned). For all other types, include everything.
  const filtered = (events ?? []).filter(e => {
    if (e.type === 'assigned') return e.new_value === profile.id
    return true
  })

  return NextResponse.json({ data: filtered.slice(0, 20) })
}
