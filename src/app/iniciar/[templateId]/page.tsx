'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck, LogIn, ArrowRight } from 'lucide-react'
import type { InspectionTemplate, Profile } from '@/lib/types/database'
import toast from 'react-hot-toast'

export default function IniciarInspecaoPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [template, setTemplate] = useState<InspectionTemplate | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Check session first
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (prof) setProfile(prof)
      }

      const { data: tmpl } = await supabase.from('inspection_templates').select('*').eq('id', templateId).single()
      if (tmpl) setTemplate(tmpl)
      setLoading(false)
    }
    load()
  }, [templateId, supabase])

  const handleStart = async () => {
    if (!profile || !template) return
    setCreating(true)
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
      setCreating(false)
      return
    }
    router.push(`/inspecoes/${data.id}/executar`)
  }

  const handleLoginRedirect = () => {
    const next = encodeURIComponent(`/iniciar/${templateId}`)
    router.push(`/login?next=${next}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-800 to-blue-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-white" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-800 to-blue-950 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-2xl">
          <p className="text-slate-700">Template não encontrado ou indisponível.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-800 to-blue-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <ClipboardCheck className="h-8 w-8 text-blue-700" />
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-slate-900">{template.title}</h1>
        {template.description && (
          <p className="mt-2 text-center text-sm text-slate-500">{template.description}</p>
        )}
        {template.category && (
          <div className="mt-3 flex justify-center">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{template.category}</span>
          </div>
        )}

        <div className="my-6 border-t border-slate-200" />

        {profile ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-600">
              Olá, <strong>{profile.full_name}</strong>!<br />
              Pronto para iniciar a inspeção?
            </p>
            <button
              onClick={handleStart}
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {creating ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              {creating ? 'Iniciando...' : 'Iniciar Inspeção'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-600">Faça login para iniciar esta inspeção.</p>
            <button
              onClick={handleLoginRedirect}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-base font-semibold text-white hover:bg-blue-800"
            >
              <LogIn className="h-5 w-5" />
              Fazer login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
