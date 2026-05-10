import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/tickets
export async function GET(request) {
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  const search   = searchParams.get('search')

  let query = supabase
    .from('tickets')
    .select(`
      *,
      creator:profiles!tickets_created_by_fkey(id, full_name, email, role),
      assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role),
      ticket_tags(tag_id, tags(id, name, color))
    `)
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (search)   query = query.ilike('title', `%${search}%`)

  let { data, error } = await query

  // ticket_tags table may not exist yet — fall back to query without it
  if (error && error.message?.includes('ticket_tags')) {
    const fallback = supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, full_name, email, role),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false })

    if (status)   fallback.eq('status', status)
    if (priority) fallback.eq('priority', priority)
    if (search)   fallback.ilike('title', `%${search}%`)

    const result = await fallback
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    data = result.data
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

const SLA_HOURS = { critical: 4, high: 24, medium: 72, low: 168 }

function calcDueAt(priority, base = new Date()) {
  const hours = SLA_HOURS[priority] ?? 72
  return new Date(base.getTime() + hours * 3600_000).toISOString()
}

// POST /api/tickets
export async function POST(request) {
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'agent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only agents and admins can create tickets' }, { status: 403 })
  }

  const body = await request.json()
  const { title, description, priority, due_at } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const resolvedPriority = priority ?? 'medium'
  const resolvedDueAt    = due_at ? new Date(due_at).toISOString() : calcDueAt(resolvedPriority)

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title:       title.trim(),
      description: description?.trim() ?? '',
      priority:    resolvedPriority,
      created_by:  profile.id,
      due_at:      resolvedDueAt,
    })
    .select(`*, creator:profiles!tickets_created_by_fkey(id, full_name, email, role)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Emit timeline event
  await supabase.from('ticket_events').insert({
    ticket_id:   data.id,
    created_by:  profile.id,
    type:        'ticket_created',
    is_internal: false,
    new_value:   data.title,
  })

  return NextResponse.json({ data }, { status: 201 })
}
