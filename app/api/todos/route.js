import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/todos
export async function GET(request) {
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('todos')
    .select(`
      *,
      ticket:tickets(id, title, status, priority),
      assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role),
      creator:profiles!todos_created_by_fkey(id, full_name, email, role)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/todos — support/admin only
export async function POST(request) {
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only support or admin can assign tickets' }, { status: 403 })
  }

  const body = await request.json()
  const { ticket_id, assigned_to, title, notes } = body

  if (!ticket_id || !assigned_to || !title?.trim()) {
    return NextResponse.json({ error: 'ticket_id, assigned_to, and title are required' }, { status: 400 })
  }

  const { data: assignee } = await supabase
    .from('profiles').select('role, full_name, email').eq('id', assigned_to).single()

  if (!assignee || assignee.role !== 'developer') {
    return NextResponse.json({ error: 'Can only assign todos to developers' }, { status: 400 })
  }

  // Get current ticket status before updating
  const { data: prevTicket } = await supabase
    .from('tickets').select('status').eq('id', ticket_id).single()

  await supabase.from('tickets')
    .update({ assigned_to, status: 'in_progress' })
    .eq('id', ticket_id)

  const { data, error } = await supabase
    .from('todos')
    .insert({
      ticket_id,
      assigned_to,
      created_by: profile.id,
      title:      title.trim(),
      notes:      notes?.trim() ?? '',
    })
    .select(`
      *,
      ticket:tickets(id, title, status, priority),
      assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role),
      creator:profiles!todos_created_by_fkey(id, full_name, email, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Emit timeline events
  const events = []

  if (prevTicket?.status !== 'in_progress') {
    events.push({
      ticket_id, created_by: profile.id,
      type: 'status_changed', is_internal: false,
      old_value: prevTicket?.status ?? 'open', new_value: 'in_progress',
    })
  }
  events.push({
    ticket_id, todo_id: data.id, created_by: profile.id,
    type: 'todo_created', is_internal: true,
    body: data.title,
    new_value: assignee.full_name || assignee.email,
  })
  events.push({
    ticket_id, created_by: profile.id,
    type: 'assigned', is_internal: false,
    new_value: assigned_to,
    body: assignee.full_name || assignee.email,
  })

  await supabase.from('ticket_events').insert(events)

  return NextResponse.json({ data }, { status: 201 })
}
