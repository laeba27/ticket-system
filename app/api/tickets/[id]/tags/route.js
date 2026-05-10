import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/tickets/[id]/tags — attach a tag
export async function POST(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tag_id } = await request.json()
  if (!tag_id) return NextResponse.json({ error: 'tag_id required' }, { status: 400 })

  const { error } = await supabase
    .from('ticket_tags')
    .insert({ ticket_id: id, tag_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}

// DELETE /api/tickets/[id]/tags — detach a tag
export async function DELETE(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile  = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tag_id } = await request.json()
  if (!tag_id) return NextResponse.json({ error: 'tag_id required' }, { status: 400 })

  const { error } = await supabase
    .from('ticket_tags')
    .delete()
    .eq('ticket_id', id)
    .eq('tag_id', tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
