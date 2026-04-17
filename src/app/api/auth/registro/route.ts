import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { fullName, orgName, email, password } = await request.json()

  if (!fullName || !orgName || !email || !password) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create organization
  const slug = orgName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (orgError) {
    return NextResponse.json({ error: 'Erro ao criar organização: ' + orgError.message }, { status: 500 })
  }

  // Create auth user (without app_metadata that triggers profile creation)
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (userError || !userData.user) {
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Erro ao criar usuário: ' + (userError?.message ?? 'unknown') }, { status: 500 })
  }

  // Create profile directly (instead of relying on trigger)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userData.user.id,
      organization_id: org.id,
      full_name: fullName,
      role: 'admin',
    })

  if (profileError) {
    // Cleanup on failure
    await supabase.auth.admin.deleteUser(userData.user.id)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
