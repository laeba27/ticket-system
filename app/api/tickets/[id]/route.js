import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/tickets/[id]
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      creator:profiles!tickets_created_by_fkey(id, full_name, email, role),
      assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role),
      todos(
        *,
        assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role),
        creator:profiles!todos_created_by_fkey(id, full_name, email, role)
      ),
      ticket_tags(tag_id, tags(id, name, color))
    `)
    .eq('id', id)
    .single()

  // ticket_tags table may not exist yet — fall back without it
  if (error && error.message?.includes('ticket_tags')) {
    const result = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, full_name, email, role),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role),
        todos(
          *,
          assignee:profiles!todos_assigned_to_fkey(id, full_name, email, role),
          creator:profiles!todos_created_by_fkey(id, full_name, email, role)
        )
      `)
      .eq('id', id)
      .single()
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 404 })
    data = result.data
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/tickets/[id]
export async function PATCH(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body    = await request.json()
  const allowed = ['title', 'description', 'status', 'priority', 'assigned_to']
  const updates = {}
  allowed.forEach(k => { if (k in body) updates[k] = body[k] })

  if ('assigned_to' in updates && !['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only support or admin can assign tickets' }, { status: 403 })
  }

  // Fetch current state so we can emit accurate diff events
  const { data: prev } = await supabase
    .from('tickets')
    .select('status, priority, assigned_to, created_by')
    .eq('id', id)
    .single()

  // Status change: only admin, support, or the ticket's owner (agent who created it)
  if ('status' in updates) {
    const isOwner = prev?.created_by === profile.id
    if (!['admin', 'support'].includes(profile.role) && !isOwner) {
      return NextResponse.json({ error: 'Only admins, support, or the ticket owner can change ticket status' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      creator:profiles!tickets_created_by_fkey(id, full_name, email, role),
      assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build timeline events for each changed field
  const events = []

  if (prev && 'status' in updates && updates.status !== prev.status) {
    events.push({
      ticket_id: id, created_by: profile.id,
      type: 'status_changed', is_internal: false,
      old_value: prev.status, new_value: updates.status,
    })
  }
  if (prev && 'priority' in updates && updates.priority !== prev.priority) {
    events.push({
      ticket_id: id, created_by: profile.id,
      type: 'priority_changed', is_internal: false,
      old_value: prev.priority, new_value: updates.priority,
    })
  }
  if (prev && 'assigned_to' in updates && updates.assigned_to !== prev.assigned_to) {
    // Resolve assignee name for the event body
    let assigneeName = null
    if (updates.assigned_to) {
      const { data: assigneeProfile } = await supabase
        .from('profiles').select('full_name, email').eq('id', updates.assigned_to).single()
      assigneeName = assigneeProfile?.full_name || assigneeProfile?.email
    }
    events.push({
      ticket_id: id, created_by: profile.id,
      type: 'assigned', is_internal: false,
      new_value: updates.assigned_to, body: assigneeName,
    })
  }

  if (events.length) await supabase.from('ticket_events').insert(events)

  return NextResponse.json({ data })
}

// DELETE /api/tickets/[id] — admin only
export async function DELETE(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete tickets' }, { status: 403 })
  }

  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
