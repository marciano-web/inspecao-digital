'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MapPin, Calendar, User, CheckCircle2, XCircle, MinusCircle, Download, Building2, FileCheck } from 'lucide-react'
import type { Inspection, TemplateSection, TemplateField, Organization, Customer, ServiceOrder, Profile, InspectionTemplate, InspectionPhoto } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { generateInspectionPdf } from '@/lib/utils/pdf-generator'

export default function VisualizarInspecaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [template, setTemplate] = useState<InspectionTemplate | null>(null)
  const [sections, setSections] = useState<(TemplateSection & { fields: TemplateField[] })[]>([])
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [photos, setPhotos] = useState<InspectionPhoto[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null)
  const [inspector, setInspector] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: insp } = await supabase
        .from('inspections')
        .select('*, template:inspection_templates(*), inspector:profiles(*), customer:customers(*), service_order:service_orders(*)')
        .eq('id', id)
        .single()

      if (!insp) { router.push('/inspecoes'); return }
      setInspection(insp as unknown as Inspection)
      setTemplate((insp as unknown as { template: InspectionTemplate }).template)
      setInspector((insp as unknown as { inspector: Profile | null }).inspector)
      setCustomer((insp as unknown as { customer: Customer | null }).customer)
      setServiceOrder((insp as unknown as { service_order: ServiceOrder | null }).service_order)

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

      const { data: ph } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', id)
      if (ph) setPhotos(ph as InspectionPhoto[])

      setLoading(false)
    }
    load()
  }, [id, router, supabase])

  const handleDownloadPdf = async () => {
    if (!inspection || !template || !profile) return
    setDownloadingPdf(true)
    try {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
      if (!org) throw new Error('Organização não encontrada')

      // Parse notes (saved as JSON in inspection.notes)
      let notes: Record<string, string> = {}
      if (inspection.notes) {
        try { notes = JSON.parse(inspection.notes) } catch { /* not JSON, ignore */ }
      }

      const pdfBlob = await generateInspectionPdf({
        org: org as Organization,
        inspection,
        template,
        sections,
        responses,
        notes,
        inspector,
        customer,
        serviceOrder,
        photos,
      })

      // Download
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      const fileName = `inspecao-${customer?.name?.replace(/\s+/g, '-') ?? ''}-${inspection.id.slice(0, 8)}.pdf`.toLowerCase()
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF baixado')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao gerar PDF: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading || !inspection) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  const formatValue = (field: TemplateField, val: unknown): string => {
    if (val === null || val === undefined || val === '') return '—'
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {inspection.status === 'completed' && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {downloadingPdf ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloadingPdf ? 'Gerando...' : 'Baixar PDF'}
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-bold">{inspection.title}</h1>
        <p className="text-sm text-slate-500">{template?.title}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          {inspector && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {inspector.full_name}</span>}
          {customer && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {customer.name}</span>}
          {serviceOrder && <span className="flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> OS {serviceOrder.order_number}</span>}
          {inspection.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {inspection.location}</span>}
          {inspection.completed_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(inspection.completed_at).toLocaleDateString('pt-BR')}</span>}
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
              const fieldPhotos = photos.filter(p => p.field_id === field.id)
              return (
                <div key={field.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {getIcon(field, val)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700">{field.label}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{formatValue(field, val)}</p>
                      {fieldPhotos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {fieldPhotos.map(p => {
                            const url = supabase.storage.from('inspection-photos').getPublicUrl(p.storage_path).data.publicUrl
                            return (
                              <a key={p.id} href={url} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
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
