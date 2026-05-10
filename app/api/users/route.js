import { createClient, getProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/users — list all users (support/admin)
export async function GET() {
  const supabase = await createClient()
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'support'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
