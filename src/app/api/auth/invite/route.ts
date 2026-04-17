import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, fullName, role, organizationId } = await request.json()

  if (!email || !fullName || !role || !organizationId) {
    return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const tempPass = Math.random().toString(36).slice(-10) + 'A1!'

  const { data: userData, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPass,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error || !userData.user) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  // Create profile directly
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userData.user.id,
      organization_id: organizationId,
      full_name: fullName,
      role,
    })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, tempPassword: tempPass })
}
