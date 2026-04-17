'use client'

import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp, Save, Send } from 'lucide-react'
import { fieldTypeLabels, getDefaultConfig } from '@/lib/utils/field-defaults'
import { ConfigCampo } from '@/components/template/config-campo'
import type { FieldType, ScoringMethod, TemplateSection, TemplateField } from '@/lib/types/database'

interface LocalSection {
  _id: string
  title: string
  description: string
  is_repeatable: boolean
  fields: LocalField[]
  collapsed: boolean
}

interface LocalField {
  _id: string
  label: string
  description: string
  field_type: FieldType
  is_required: boolean
  config: Record<string, unknown>
  weight: number
  conditions: null
}

interface EditorTemplateProps {
  onSave: (data: {
    title: string
    description: string
    category: string
    scoring_method: ScoringMethod
    pass_threshold: number | null
    sections: (TemplateSection & { fields: TemplateField[] })[]
    publish: boolean
  }) => void
  saving: boolean
  initialData?: {
    title: string
    description: string
    category: string
    scoring_method: ScoringMethod
    pass_threshold: number | null
    sections: LocalSection[]
  }
}

export function EditorTemplate({ onSave, saving, initialData }: EditorTemplateProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>(initialData?.scoring_method ?? 'none')
  const [passThreshold, setPassThreshold] = useState<number | null>(initialData?.pass_threshold ?? null)
  const [sections, setSections] = useState<LocalSection[]>(
    initialData?.sections ?? [
      {
        _id: uuid(),
        title: 'Seção 1',
        description: '',
        is_repeatable: false,
        fields: [],
        collapsed: false,
      },
    ]
  )

  const addSection = () => {
    setSections([
      ...sections,
      {
        _id: uuid(),
        title: `Seção ${sections.length + 1}`,
        description: '',
        is_repeatable: false,
        fields: [],
        collapsed: false,
      },
    ])
  }

  const removeSection = (sId: string) => {
    if (sections.length <= 1) return
    setSections(sections.filter((s) => s._id !== sId))
  }

  const updateSection = (sId: string, updates: Partial<LocalSection>) => {
    setSections(sections.map((s) => (s._id === sId ? { ...s, ...updates } : s)))
  }

  const addField = (sId: string, fieldType: FieldType) => {
    setSections(
      sections.map((s) =>
        s._id === sId
          ? {
              ...s,
              fields: [
                ...s.fields,
                {
                  _id: uuid(),
                  label: '',
                  description: '',
                  field_type: fieldType,
                  is_required: false,
                  config: getDefaultConfig(fieldType) as Record<string, unknown>,
                  weight: 1,
                  conditions: null,
                },
              ],
            }
          : s
      )
    )
  }

  const removeField = (sId: string, fId: string) => {
    setSections(
      sections.map((s) =>
        s._id === sId ? { ...s, fields: s.fields.filter((f) => f._id !== fId) } : s
      )
    )
  }

  const updateField = (sId: string, fId: string, updates: Partial<LocalField>) => {
    setSections(
      sections.map((s) =>
        s._id === sId
          ? { ...s, fields: s.fields.map((f) => (f._id === fId ? { ...f, ...updates } : f)) }
          : s
      )
    )
  }

  const moveField = (sId: string, fIdx: number, dir: 'up' | 'down') => {
    setSections(
      sections.map((s) => {
        if (s._id !== sId) return s
        const fields = [...s.fields]
        const newIdx = dir === 'up' ? fIdx - 1 : fIdx + 1
        if (newIdx < 0 || newIdx >= fields.length) return s
        ;[fields[fIdx], fields[newIdx]] = [fields[newIdx], fields[fIdx]]
        return { ...s, fields }
      })
    )
  }

  const handleSubmit = (publish: boolean) => {
    if (!title.trim()) return
    if (sections.some((s) => !s.title.trim())) return

    const mappedSections = sections.map((s, si) => ({
      id: s._id,
      template_id: '',
      title: s.title,
      description: s.description || null,
      position: si,
      is_repeatable: s.is_repeatable,
      settings: {},
      created_at: '',
      updated_at: '',
      fields: s.fields.map((f, fi) => ({
        id: f._id,
        section_id: s._id,
        label: f.label,
        description: f.description || null,
        field_type: f.field_type,
        is_required: f.is_required,
        position: fi,
        config: f.config,
        weight: f.weight,
        conditions: f.conditions,
        created_at: '',
        updated_at: '',
      })),
    }))

    onSave({
      title,
      description,
      category,
      scoring_method: scoringMethod,
      pass_threshold: passThreshold,
      sections: mappedSections as unknown as (TemplateSection & { fields: TemplateField[] })[],
      publish,
    })
  }

  return (
    <div className="space-y-6">
      {/* Template info */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
        <h2 className="mb-4 font-semibold">Informações do Template</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Inspeção de Segurança - Área Industrial"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta inspeção"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Segurança"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pontuação</label>
              <select
                value={scoringMethod}
                onChange={(e) => setScoringMethod(e.target.value as ScoringMethod)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
              >
                <option value="none">Sem pontuação</option>
                <option value="pass_fail">Aprovado / Reprovado</option>
                <option value="percentage">Percentual (%)</option>
                <option value="numeric_0_10">Nota 0-10</option>
              </select>
            </div>
            {scoringMethod !== 'none' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Limite aprovação (%)</label>
                <input
                  type="number"
                  value={passThreshold ?? ''}
                  onChange={(e) => setPassThreshold(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Ex: 70"
                  min={0}
                  max={100}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section._id} className="rounded-xl border border-slate-200 bg-white">
          {/* Section header */}
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-slate-400" />
            <input
              type="text"
              value={section.title}
              onChange={(e) => updateSection(section._id, { title: e.target.value })}
              placeholder="Nome da seção"
              className="flex-1 border-none bg-transparent text-base font-semibold focus:outline-none"
            />
            <button
              onClick={() => updateSection(section._id, { collapsed: !section.collapsed })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              {section.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            {sections.length > 1 && (
              <button
                onClick={() => removeSection(section._id)}
                className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {!section.collapsed && (
            <div className="p-4 space-y-4">
              {/* Section description */}
              <input
                type="text"
                value={section.description}
                onChange={(e) => updateSection(section._id, { description: e.target.value })}
                placeholder="Descrição da seção (opcional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />

              {/* Fields */}
              {section.fields.map((field, fIdx) => (
                <div key={field._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        onClick={() => moveField(section._id, fIdx, 'up')}
                        disabled={fIdx === 0}
                        className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveField(section._id, fIdx, 'down')}
                        disabled={fIdx === section.fields.length - 1}
                        className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(section._id, field._id, { label: e.target.value })}
                          placeholder="Pergunta / campo"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-700">
                          {fieldTypeLabels[field.field_type]}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={field.is_required}
                            onChange={(e) =>
                              updateField(section._id, field._id, { is_required: e.target.checked })
                            }
                            className="rounded border-slate-300"
                          />
                          <span className="text-slate-600">Obrigatório</span>
                        </label>
                        {scoringMethod !== 'none' && (
                          <label className="flex items-center gap-1.5">
                            <span className="text-slate-600">Peso:</span>
                            <input
                              type="number"
                              value={field.weight}
                              onChange={(e) =>
                                updateField(section._id, field._id, { weight: Number(e.target.value) || 1 })
                              }
                              min={0}
                              step={0.5}
                              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                            />
                          </label>
                        )}
                      </div>

                      <ConfigCampo
                        fieldType={field.field_type}
                        config={field.config}
                        onChange={(config) => updateField(section._id, field._id, { config })}
                      />
                    </div>
                    <button
                      onClick={() => removeField(section._id, field._id)}
                      className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add field */}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(fieldTypeLabels) as FieldType[]).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => addField(section._id, ft)}
                    className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  >
                    + {fieldTypeLabels[ft]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add section button */}
      <button
        onClick={addSection}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-700"
      >
        <Plus className="h-4 w-4" />
        Adicionar Seção
      </button>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving || !title.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Salvar Rascunho
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving || !title.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {saving ? 'Salvando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}
