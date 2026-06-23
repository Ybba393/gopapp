import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { name, email } = await req.json()
    if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

    // 1. Create auth user with default password
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: 'GOPAdmin!',
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id

    // 2. Create admin profile
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'admin',
    })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    // 3. Add to roster
    await adminClient.from('roster').upsert({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      is_admin: true,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
