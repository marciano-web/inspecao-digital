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

  // Create auth user with org metadata
  const { error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { organization_id: org.id, role: 'admin' },
  })

  if (userError) {
    // Cleanup org on failure
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Erro ao criar usuário: ' + userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
