import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, fullName, role, organizationId } = await request.json()

  if (!email || !fullName || !role || !organizationId) {
    return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Generate temp password
  const tempPass = Math.random().toString(36).slice(-10) + 'A1!'

  const { error } = await supabase.auth.admin.createUser({
    email,
    password: tempPass,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { organization_id: organizationId, role },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, tempPassword: tempPass })
}
