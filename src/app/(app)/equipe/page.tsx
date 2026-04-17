'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Users, UserPlus, Shield, Eye, HardHat } from 'lucide-react'
import type { Profile } from '@/lib/types/database'
import toast from 'react-hot-toast'

const roleLabels: Record<string, { label: string; icon: typeof Shield; cls: string }> = {
  admin: { label: 'Administrador', icon: Shield, cls: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Gerente', icon: Eye, cls: 'bg-blue-100 text-blue-700' },
  inspector: { label: 'Inspetor', icon: HardHat, cls: 'bg-green-100 text-green-700' },
}

export default function EquipePage() {
  const { profile } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('inspector')
  const [inviting, setInviting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('role')
        .order('full_name')
      if (data) setMembers(data)
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setInviting(true)

    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteName,
        role: inviteRole,
        organizationId: profile.organization_id,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erro ao convidar')
    } else {
      toast.success('Membro adicionado!')
      setShowInvite(false)
      setInviteEmail('')
      setInviteName('')
      // Refresh
      const { data: updated } = await supabase.from('profiles').select('*').order('role').order('full_name')
      if (updated) setMembers(updated)
    }
    setInviting(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">Equipe</h1>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <UserPlus className="h-4 w-4" />
          Convidar
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h3 className="font-semibold text-blue-900">Adicionar membro</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Nome completo"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="inspector">Inspetor</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {inviting ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {members.map((m) => {
            const r = roleLabels[m.role] ?? roleLabels.inspector
            const Icon = r.icon
            return (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.full_name}</p>
                  <p className="text-xs text-slate-500">{m.phone || 'Sem telefone'}</p>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${r.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {r.label}
                </span>
                {!m.is_active && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Inativo</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
