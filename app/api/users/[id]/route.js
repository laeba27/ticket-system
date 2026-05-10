import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/users/[id] — update user role (admin only)
export async function PATCH(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change user roles' }, { status: 403 })
  }

  const body = await request.json()
  const validRoles = ['admin', 'support', 'developer', 'agent']

  if (body.role && !validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Prevent admin from removing their own admin role
  if (id === profile.id && body.role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updates = {}
  if (body.role) updates.role = body.role
  if (body.full_name) updates.full_name = body.full_name.trim()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
