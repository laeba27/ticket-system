import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/todos/[id]
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('todos')
    .select(`
      *,
      ticket:tickets(id, title, status, priority, created_at),
      assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role),
      creator:profiles!todos_created_by_fkey(id, full_name, email, role)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/todos/[id]
export async function PATCH(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body    = await request.json()
  const allowed = ['status', 'notes', 'title']
  const updates = {}
  allowed.forEach(k => { if (k in body) updates[k] = body[k] })

  // Only admin and developer can change task status
  if ('status' in updates && !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only developers and admins can change task status' }, { status: 403 })
  }

  // Fetch current status before updating (needed for event diff)
  const { data: prevTodo } = await supabase
    .from('todos').select('status, ticket_id').eq('id', id).single()

  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      ticket:tickets(id, title, status, priority),
      assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = []

  if (prevTodo && 'status' in updates && updates.status !== prevTodo.status) {
    events.push({
      ticket_id: data.ticket_id, todo_id: id, created_by: profile.id,
      type: 'todo_status_changed', is_internal: true,
      old_value: prevTodo.status, new_value: updates.status,
      body: data.title ?? null,
    })
  }

  // Auto-resolve ticket when all todos are done
  if (body.status === 'done' && data) {
    const { data: pending } = await supabase
      .from('todos').select('id').eq('ticket_id', data.ticket_id).neq('status', 'done')

    if (pending?.length === 0) {
      // Fetch current ticket status before resolving
      const { data: prevTicket } = await supabase
        .from('tickets').select('status').eq('id', data.ticket_id).single()

      await supabase.from('tickets')
        .update({ status: 'resolved' }).eq('id', data.ticket_id)

      events.push({
        ticket_id: data.ticket_id, created_by: profile.id,
        type: 'status_changed', is_internal: false,
        old_value: prevTicket?.status ?? 'in_progress', new_value: 'resolved',
      })
    }
  }

  if (events.length) await supabase.from('ticket_events').insert(events)

  return NextResponse.json({ data })
}

// DELETE /api/todos/[id]
export async function DELETE(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
