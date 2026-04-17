'use client'

import { useAuth } from '@/contexts/auth-context'
import { User, Building2, Mail, Phone } from 'lucide-react'

export default function ConfiguracoesPage() {
  const { profile, user } = useAuth()

  if (!profile) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    inspector: 'Inspetor',
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Meu Perfil</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold">{profile.full_name}</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {roleLabels[profile.role]}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-5 w-5 text-slate-400" />
            <span className="text-slate-600">{user?.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-5 w-5 text-slate-400" />
              <span className="text-slate-600">{profile.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
