'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { EditorTemplate } from '@/components/template/editor-template'
import type { TemplateSection, TemplateField, ScoringMethod } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { v4 as uuid } from 'uuid'

export default function NovoTemplatePage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: {
    title: string
    description: string
    category: string
    scoring_method: ScoringMethod
    pass_threshold: number | null
    sections: (TemplateSection & { fields: TemplateField[] })[]
    publish: boolean
  }) => {
    if (!profile) return
    setSaving(true)

    // Create template
    const { data: template, error: tErr } = await supabase
      .from('inspection_templates')
      .insert({
        organization_id: profile.organization_id,
        created_by: profile.id,
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        scoring_method: data.scoring_method,
        pass_threshold: data.pass_threshold,
        status: data.publish ? 'published' : 'draft',
      })
      .select('id')
      .single()

    if (tErr || !template) {
      toast.error('Erro ao criar template')
      setSaving(false)
      return
    }

    // Create sections
    for (let si = 0; si < data.sections.length; si++) {
      const sec = data.sections[si]
      const { data: section, error: sErr } = await supabase
        .from('template_sections')
        .insert({
          template_id: template.id,
          title: sec.title,
          description: sec.description || null,
          position: si,
          is_repeatable: sec.is_repeatable,
        })
        .select('id')
        .single()

      if (sErr || !section) continue

      // Create fields for this section
      if (sec.fields && sec.fields.length > 0) {
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

    toast.success(data.publish ? 'Template publicado!' : 'Template salvo como rascunho')
    router.push('/templates')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Novo Template</h1>
      <EditorTemplate onSave={handleSave} saving={saving} />
    </div>
  )
}
