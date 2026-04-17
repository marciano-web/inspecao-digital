'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MapPin, Calendar, User, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import type { Inspection, TemplateSection, TemplateField } from '@/lib/types/database'
import { fieldTypeLabels } from '@/lib/utils/field-defaults'
import Link from 'next/link'

export default function VisualizarInspecaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [sections, setSections] = useState<(TemplateSection & { fields: TemplateField[] })[]>([])
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: insp } = await supabase
        .from('inspections')
        .select('*, template:inspection_templates(title, scoring_method), inspector:profiles(full_name)')
        .eq('id', id)
        .single()

      if (!insp) { router.push('/inspecoes'); return }
      setInspection(insp as unknown as Inspection)

      const { data: secs } = await supabase
        .from('template_sections')
        .select('*, fields:template_fields(*)')
        .eq('template_id', insp.template_id)
        .order('position')

      if (secs) {
        setSections(secs.map((s: TemplateSection & { fields: TemplateField[] }) => ({
          ...s,
          fields: [...(s.fields || [])].sort((a, b) => a.position - b.position),
        })))
      }

      const { data: resps } = await supabase
        .from('inspection_responses')
        .select('*')
        .eq('inspection_id', id)

      if (resps) {
        const map: Record<string, unknown> = {}
        resps.forEach((r: { field_id: string; value: unknown }) => { map[r.field_id] = r.value })
        setResponses(map)
      }

      setLoading(false)
    }
    load()
  }, [id, router, supabase])

  if (loading || !inspection) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  const tmpl = (inspection as unknown as { template: { title: string; scoring_method: string } | null }).template
  const inspector = (inspection as unknown as { inspector: { full_name: string } | null }).inspector

  const formatValue = (field: TemplateField, val: unknown): string => {
    if (val === null || val === undefined) return '—'
    if (field.field_type === 'yes_no_na') {
      const labels = (field.config as { labels?: Record<string, string> }).labels
      return labels?.[val as string] ?? String(val)
    }
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }

  const getIcon = (field: TemplateField, val: unknown) => {
    if (field.field_type !== 'yes_no_na') return null
    if (val === 'yes') return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (val === 'no') return <XCircle className="h-5 w-5 text-red-600" />
    return <MinusCircle className="h-5 w-5 text-slate-400" />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-bold">{inspection.title}</h1>
        <p className="text-sm text-slate-500">{tmpl?.title}</p>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          {inspector && (
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {inspector.full_name}</span>
          )}
          {inspection.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {inspection.location}</span>
          )}
          {inspection.completed_at && (
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(inspection.completed_at).toLocaleDateString('pt-BR')}</span>
          )}
        </div>

        {inspection.score_percentage !== null && (
          <div className="mt-4 flex items-center gap-3">
            <div className={`rounded-full px-3 py-1 text-sm font-bold ${inspection.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {inspection.passed ? 'APROVADO' : 'REPROVADO'}
            </div>
            <span className="text-lg font-bold text-slate-700">{inspection.score_percentage}%</span>
          </div>
        )}
      </div>

      {/* Responses by section */}
      {sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">{section.title}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {section.fields.map((field) => {
              const val = responses[field.id]
              return (
                <div key={field.id} className="flex items-start gap-3 px-4 py-3">
                  {getIcon(field, val)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700">{field.label}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{formatValue(field, val)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
