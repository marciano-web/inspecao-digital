'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EditorTemplate } from '@/components/template/editor-template'
import type { TemplateSection, TemplateField, ScoringMethod } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { v4 as uuid } from 'uuid'

export default function EditarTemplatePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialData, setInitialData] = useState<{
    title: string
    description: string
    category: string
    scoring_method: ScoringMethod
    pass_threshold: number | null
    sections: Array<{
      _id: string
      title: string
      description: string
      is_repeatable: boolean
      fields: Array<{
        _id: string
        label: string
        description: string
        field_type: string
        is_required: boolean
        config: Record<string, unknown>
        weight: number
        conditions: null
      }>
      collapsed: boolean
    }>
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: tmpl } = await supabase
        .from('inspection_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (!tmpl) { router.push('/templates'); return }

      const { data: secs } = await supabase
        .from('template_sections')
        .select('*, fields:template_fields(*)')
        .eq('template_id', id)
        .order('position')

      const mappedSections = (secs || []).map((s: TemplateSection & { fields: TemplateField[] }) => ({
        _id: s.id,
        title: s.title,
        description: s.description || '',
        is_repeatable: s.is_repeatable,
        collapsed: false,
        fields: (s.fields || [])
          .sort((a, b) => a.position - b.position)
          .map((f) => ({
            _id: f.id,
            label: f.label,
            description: f.description || '',
            field_type: f.field_type,
            is_required: f.is_required,
            config: f.config as Record<string, unknown>,
            weight: f.weight,
            conditions: null,
          })),
      }))

      setInitialData({
        title: tmpl.title,
        description: tmpl.description || '',
        category: tmpl.category || '',
        scoring_method: tmpl.scoring_method,
        pass_threshold: tmpl.pass_threshold,
        sections: mappedSections,
      })
      setLoading(false)
    }
    load()
  }, [id, router, supabase])

  const handleSave = async (data: {
    title: string
    description: string
    category: string
    scoring_method: ScoringMethod
    pass_threshold: number | null
    sections: (TemplateSection & { fields: TemplateField[] })[]
    publish: boolean
  }) => {
    setSaving(true)

    // Update template
    await supabase
      .from('inspection_templates')
      .update({
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        scoring_method: data.scoring_method,
        pass_threshold: data.pass_threshold,
        status: data.publish ? 'published' : 'draft',
      })
      .eq('id', id)

    // Delete old sections (cascade deletes fields)
    await supabase.from('template_sections').delete().eq('template_id', id)

    // Re-create sections and fields
    for (let si = 0; si < data.sections.length; si++) {
      const sec = data.sections[si]
      const { data: section } = await supabase
        .from('template_sections')
        .insert({
          template_id: id,
          title: sec.title,
          description: sec.description || null,
          position: si,
          is_repeatable: sec.is_repeatable,
        })
        .select('id')
        .single()

      if (section && sec.fields?.length) {
        const fields = sec.fields.map((f, fi) => ({
          section_id: section.id,
          label: f.label,
          description: f.description || null,
          field_type: f.field_type,
          is_required: f.is_required,
          position: fi,
          config: f.config,
          weight: f.weight,
          conditions: f.conditions || null,
        }))
        await supabase.from('template_fields').insert(fields)
      }
    }

    toast.success(data.publish ? 'Template publicado!' : 'Template atualizado')
    router.push('/templates')
  }

  if (loading || !initialData) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Editar Template</h1>
      <EditorTemplate
        onSave={handleSave}
        saving={saving}
        initialData={initialData as Parameters<typeof EditorTemplate>[0]['initialData']}
      />
    </div>
  )
}
