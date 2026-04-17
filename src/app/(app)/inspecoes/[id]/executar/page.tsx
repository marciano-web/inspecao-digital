'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { RenderizadorCampo } from '@/components/inspecao/renderizador-campo'
import { ChevronLeft, ChevronRight, Save, Send, MapPin } from 'lucide-react'
import type { InspectionTemplate, TemplateSection, TemplateField, Inspection } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { v4 as uuid } from 'uuid'

interface PhotoItem {
  id: string
  url: string
  file?: File
  fieldId: string
}

export default function ExecutarInspecaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [template, setTemplate] = useState<InspectionTemplate | null>(null)
  const [sections, setSections] = useState<(TemplateSection & { fields: TemplateField[] })[]>([])
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [currentSection, setCurrentSection] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [location, setLocation] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load inspection, template, sections, fields, and existing responses
  useEffect(() => {
    const load = async () => {
      const { data: insp } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single()

      if (!insp) { router.push('/inspecoes'); return }
      setInspection(insp)
      setLocation(insp.location ?? '')

      const { data: tmpl } = await supabase
        .from('inspection_templates')
        .select('*')
        .eq('id', insp.template_id)
        .single()

      if (tmpl) setTemplate(tmpl)

      const { data: secs } = await supabase
        .from('template_sections')
        .select('*, fields:template_fields(*)')
        .eq('template_id', insp.template_id)
        .order('position')

      if (secs) {
        const sorted = secs.map((s: TemplateSection & { fields: TemplateField[] }) => ({
          ...s,
          fields: [...(s.fields || [])].sort((a, b) => a.position - b.position),
        }))
        setSections(sorted)
      }

      // Load existing responses
      const { data: resps } = await supabase
        .from('inspection_responses')
        .select('*')
        .eq('inspection_id', id)

      if (resps) {
        const map: Record<string, unknown> = {}
        resps.forEach((r: { field_id: string; value: unknown }) => {
          map[r.field_id] = r.value
        })
        setResponses(map)
      }

      // Load existing photos
      const { data: existingPhotos } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', id)

      if (existingPhotos) {
        const photoItems: PhotoItem[] = existingPhotos.map((p: { id: string; storage_path: string; field_id: string | null }) => ({
          id: p.id,
          url: supabase.storage.from('inspection-photos').getPublicUrl(p.storage_path).data.publicUrl,
          fieldId: p.field_id ?? '',
        }))
        setPhotos(photoItems)
      }

      setLoading(false)
    }
    load()
  }, [id, router, supabase])

  // Autosave debounced
  const saveResponses = useCallback(async (data: Record<string, unknown>) => {
    if (!inspection || !sections.length) return

    const upserts = Object.entries(data).map(([fieldId, value]) => {
      const section = sections.find(s => s.fields.some(f => f.id === fieldId))
      return {
        inspection_id: inspection.id,
        field_id: fieldId,
        section_id: section?.id ?? sections[0].id,
        value: value ?? null,
        repeat_index: 0,
      }
    })

    if (upserts.length > 0) {
      await supabase
        .from('inspection_responses')
        .upsert(upserts, { onConflict: 'inspection_id,field_id,repeat_index' })
    }
  }, [inspection, sections, supabase])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    const updated = { ...responses, [fieldId]: value }
    setResponses(updated)

    // Debounced autosave
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveResponses(updated), 2000)
  }

  const handleAddPhoto = async (fieldId: string, file: File) => {
    if (!inspection || !profile) return

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${profile.organization_id}/${inspection.id}/${fieldId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('inspection-photos')
      .upload(path, file, { contentType: file.type })

    if (error) {
      toast.error('Erro ao enviar foto')
      return
    }

    const { data: photoRow } = await supabase
      .from('inspection_photos')
      .insert({
        inspection_id: inspection.id,
        field_id: fieldId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'uploaded',
      })
      .select('id')
      .single()

    if (photoRow) {
      const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(path)
      setPhotos(prev => [...prev, { id: photoRow.id, url: publicUrl, fieldId }])
      toast.success('Foto adicionada')
    }
  }

  const handleRemovePhoto = async (photoId: string) => {
    await supabase.from('inspection_photos').delete().eq('id', photoId)
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const handleSaveDraft = async () => {
    await saveResponses(responses)
    if (location) {
      await supabase.from('inspections').update({ location }).eq('id', id)
    }
    toast.success('Rascunho salvo')
    router.push('/inspecoes')
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    // Save all responses first
    await saveResponses(responses)

    // Update inspection
    await supabase
      .from('inspections')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        location: location || null,
      })
      .eq('id', id)

    // Calculate score
    await supabase.rpc('calculate_inspection_score', { p_inspection_id: id })

    toast.success('Inspeção concluída!')
    router.push('/inspecoes')
  }

  if (loading || !template) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      </div>
    )
  }

  const section = sections[currentSection]
  const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0)
  const answeredFields = Object.values(responses).filter(v => v !== null && v !== '' && v !== undefined).length
  const progress = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold">{template.title}</h1>
        <p className="text-sm text-slate-500">{inspection?.title}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Seção {currentSection + 1} de {sections.length}</span>
          <span>{progress}% completo</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Location */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Local da inspeção (opcional)"
          className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Current section */}
      {section && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold">{section.title}</h2>
          {section.description && (
            <p className="mb-4 text-xs text-slate-500">{section.description}</p>
          )}

          <div className="space-y-6">
            {section.fields.map((field) => {
              // Check conditional visibility
              if (field.conditions) {
                const cond = field.conditions
                const depValue = responses[cond.field_id]
                let visible = false
                if (cond.operator === 'equals') visible = depValue === cond.value
                else if (cond.operator === 'not_equals') visible = depValue !== cond.value
                else if (cond.operator === 'is_not_empty') visible = depValue !== null && depValue !== '' && depValue !== undefined
                else if (cond.operator === 'contains') visible = String(depValue ?? '').includes(String(cond.value))
                else visible = true
                if (!visible) return null
              }

              // Check triggered actions for this field's current value
              const fieldValue = responses[field.id]
              const triggeredActions = (field.actions ?? []).filter((a) => {
                if (a.when.operator === 'equals') return fieldValue === a.when.value
                if (a.when.operator === 'not_equals') return fieldValue !== a.when.value
                if (a.when.operator === 'any') return fieldValue !== null && fieldValue !== undefined
                return false
              })
              const actionTypes = triggeredActions.flatMap((a) => a.then.map((t) => t.type))
              const needsPhoto = actionTypes.includes('require_photo') || actionTypes.includes('require_media')
              const needsNote = actionTypes.includes('require_note') || actionTypes.includes('require_annotation')
              const isFlagged = actionTypes.includes('flag')

              return (
              <div key={field.id} className={isFlagged ? 'rounded-lg border-l-4 border-l-red-500 bg-red-50 p-3' : ''}>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.is_required && <span className="ml-1 text-red-500">*</span>}
                  {field.is_repeatable && <span className="ml-1 text-xs text-blue-500">(repetível)</span>}
                </label>
                {field.description && (
                  <p className="mb-2 text-xs text-slate-400">{field.description}</p>
                )}
                <RenderizadorCampo
                  field={field}
                  value={responses[field.id] ?? null}
                  onChange={(v) => handleFieldChange(field.id, v)}
                  photos={photos.filter(p => p.fieldId === field.id)}
                  onAddPhoto={(file) => handleAddPhoto(field.id, file)}
                  onRemovePhoto={handleRemovePhoto}
                />

                {/* Conditional actions triggered by response */}
                {needsPhoto && photos.filter(p => p.fieldId === field.id).length === 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span>Foto/evidência obrigatória para esta resposta</span>
                  </div>
                )}
                {needsNote && (
                  <div className="mt-2">
                    <textarea
                      value={(responses[`${field.id}_note`] as string) ?? ''}
                      onChange={(e) => handleFieldChange(`${field.id}_note`, e.target.value)}
                      placeholder="Observação obrigatória..."
                      rows={2}
                      className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
                {isFlagged && (
                  <p className="mt-1 text-xs font-medium text-red-600">Sinalizado como não conforme</p>
                )}
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>

        <button
          onClick={handleSaveDraft}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600"
        >
          <Save className="h-4 w-4" /> Salvar
        </button>

        {currentSection < sections.length - 1 ? (
          <button
            onClick={() => setCurrentSection(currentSection + 1)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Enviando...' : 'Concluir Inspeção'}
          </button>
        )}
      </div>
    </div>
  )
}
