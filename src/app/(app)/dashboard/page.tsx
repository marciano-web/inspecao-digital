'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck, FileCheck, FileWarning, TrendingUp, AlertTriangle, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import type { DashboardStats, Inspection } from '@/lib/types/database'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    const fetchData = async () => {
      const [statsRes, recentRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats', {
          p_org_id: profile.organization_id,
          p_days: 30,
        }),
        supabase
          .from('inspections')
          .select('*, template:inspection_templates(title), inspector:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (recentRes.data) setRecent(recentRes.data as unknown as Inspection[])
      setLoading(false)
    }

    fetchData()
  }, [profile, supabase])

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      </div>
    )
  }

  const statCards = [
    { label: 'Inspeções', value: stats?.total_inspections ?? 0, icon: ClipboardCheck, color: 'blue' },
    { label: 'Concluídas', value: stats?.completed ?? 0, icon: FileCheck, color: 'green' },
    { label: 'Rascunhos', value: stats?.drafts ?? 0, icon: FileWarning, color: 'amber' },
    { label: 'Nota Média', value: `${stats?.avg_score ?? 0}%`, icon: TrendingUp, color: 'purple' },
    { label: 'Ações Abertas', value: stats?.open_actions ?? 0, icon: AlertTriangle, color: 'red' },
    { label: 'Templates', value: stats?.templates_count ?? 0, icon: FileText, color: 'slate' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  const statusLabels: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-700' },
    in_progress: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Concluída', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">
            Olá, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500">Últimos 30 dias</p>
        </div>
        <Link
          href="/inspecoes/nova"
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Nova Inspeção
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${colorMap[card.color]}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Inspeções Recentes</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma inspeção ainda.{' '}
            <Link href="/inspecoes/nova" className="text-blue-600 hover:underline">
              Criar primeira inspeção
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((insp) => {
              const s = statusLabels[insp.status] ?? statusLabels.draft
              return (
                <Link
                  key={insp.id}
                  href={`/inspecoes/${insp.id}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{insp.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(insp.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                    {s.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
