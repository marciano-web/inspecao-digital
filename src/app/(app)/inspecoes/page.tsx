'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, ClipboardCheck } from 'lucide-react'
import type { Inspection } from '@/lib/types/database'

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluída', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
}

export default function InspecoesPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('inspections')
        .select('*, template:inspection_templates(title), inspector:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      if (data) setInspections(data as unknown as Inspection[])
      setLoading(false)
    }
    fetch()
  }, [statusFilter, supabase])

  const filtered = search
    ? inspections.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.location?.toLowerCase().includes(search.toLowerCase())
      )
    : inspections

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">Inspeções</h1>
        <Link
          href="/inspecoes/nova"
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar inspeções..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="in_progress">Em andamento</option>
          <option value="completed">Concluída</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhuma inspeção encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((insp) => {
            const s = statusLabels[insp.status] ?? statusLabels.draft
            const tmpl = (insp as unknown as { template: { title: string } | null }).template
            return (
              <Link
                key={insp.id}
                href={
                  insp.status === 'draft' || insp.status === 'in_progress'
                    ? `/inspecoes/${insp.id}/executar`
                    : `/inspecoes/${insp.id}`
                }
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{insp.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    {tmpl && <span>{tmpl.title}</span>}
                    {insp.location && <span>- {insp.location}</span>}
                    <span>- {new Date(insp.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {insp.score_percentage !== null && (
                    <p className="mt-1 text-xs font-medium text-blue-600">
                      Nota: {insp.score_percentage}%
                      {insp.passed !== null && (insp.passed ? ' (Aprovado)' : ' (Reprovado)')}
                    </p>
                  )}
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
  )
}
