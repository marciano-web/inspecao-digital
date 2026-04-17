'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { FileText, ArrowRight } from 'lucide-react'
import type { InspectionTemplate } from '@/lib/types/database'
import toast from 'react-hot-toast'

export default function NovaInspecaoPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('inspection_templates')
        .select('*')
        .eq('status', 'published')
        .order('title')
      if (data) setTemplates(data)
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const handleSelect = async (template: InspectionTemplate) => {
    if (!profile || creating) return
    setCreating(template.id)

    const { data, error } = await supabase
      .from('inspections')
      .insert({
        organization_id: profile.organization_id,
        template_id: template.id,
        template_version: template.version,
        inspector_id: profile.id,
        title: `${template.title} - ${new Date().toLocaleDateString('pt-BR')}`,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) {
      toast.error('Erro ao criar inspeção')
      setCreating(null)
      return
    }

    router.push(`/inspecoes/${data.id}/executar`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Nova Inspeção</h1>
      <p className="text-sm text-slate-500">Selecione um template para iniciar:</p>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum template publicado disponível.</p>
          <p className="text-xs text-slate-400">Peça a um administrador para criar e publicar templates.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              disabled={creating !== null}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p>
                )}
                {t.category && (
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {t.category}
                  </span>
                )}
              </div>
              {creating === t.id ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
              ) : (
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
