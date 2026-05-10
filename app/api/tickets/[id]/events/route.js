import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/tickets/[id]/events — full timeline for a ticket
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ticket_events')
    .select(`
      *,
      author:profiles!ticket_events_created_by_fkey(id, full_name, email, role)
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/tickets/[id]/events — add a comment to the ticket
export async function POST(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ticket_events')
    .insert({
      ticket_id:   id,
      created_by:  profile.id,
      type:        'comment',
      is_internal: false,
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
