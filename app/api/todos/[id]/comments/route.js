import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/todos/[id]/comments
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Defense in depth — agents must never see todo comments
  if (profile.role === 'agent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('ticket_events')
    .select(`
      *,
      author:profiles!ticket_events_created_by_fkey(id, full_name, email, role)
    `)
    .eq('todo_id', id)
    .eq('type', 'comment')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/todos/[id]/comments — internal comment on a todo
export async function POST(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot post internal comments' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }

  // Get todo to find its parent ticket_id
  const { data: todo } = await supabase
    .from('todos').select('ticket_id').eq('id', id).single()

  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('ticket_events')
    .insert({
      ticket_id:   todo.ticket_id,
      todo_id:     id,
      created_by:  profile.id,
      type:        'comment',
      is_internal: true,
      body:        body.body.trim(),
    })
    .select(`
      *,
      author:profiles!ticket_events_created_by_fkey(id, full_name, email, role)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
