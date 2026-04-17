'use client'

import { Plus, Trash2, Zap, GitBranch, Repeat } from 'lucide-react'
import type { FieldType, FieldAction, ActionType } from '@/lib/types/database'

interface ConfigCampoProps {
  fieldType: FieldType
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  actions: FieldAction[]
  onActionsChange: (actions: FieldAction[]) => void
  isRepeatable: boolean
  onRepeatableChange: (repeatable: boolean) => void
  maxRepeats: number
  onMaxRepeatsChange: (max: number) => void
  // For building condition references
  siblingFields?: Array<{ id: string; label: string; field_type: FieldType; config: Record<string, unknown> }>
  conditions: { field_id: string; operator: string; value: string | number | boolean } | null
  onConditionsChange: (cond: { field_id: string; operator: string; value: string | number | boolean } | null) => void
}

const actionTypeLabels: Record<ActionType, string> = {
  require_photo: 'Exigir foto',
  require_video: 'Exigir vídeo',
  require_media: 'Exigir mídia (foto/vídeo)',
  require_annotation: 'Exigir anotação',
  require_note: 'Exigir observação',
  show_field: 'Mostrar campo adicional',
  flag: 'Sinalizar como não conforme',
}

export function ConfigCampo({
  fieldType, config, onChange,
  actions, onActionsChange,
  isRepeatable, onRepeatableChange,
  maxRepeats, onMaxRepeatsChange,
  siblingFields, conditions, onConditionsChange,
}: ConfigCampoProps) {
  const update = (key: string, value: unknown) => onChange({ ...config, [key]: value })

  const getValueOptions = (): Array<{ value: string; label: string }> => {
    if (fieldType === 'yes_no_na') {
      const labels = (config.labels as Record<string, string>) ?? {}
      return [
        { value: 'yes', label: labels.yes || 'Sim' },
        { value: 'no', label: labels.no || 'Não' },
        { value: 'na', label: labels.na || 'N/A' },
      ]
    }
    if (['single_select', 'multiple_choice', 'checkbox_list'].includes(fieldType)) {
      return ((config.options as Array<{ value: string; label: string }>) ?? [])
    }
    return []
  }

  const addAction = () => {
    const valueOpts = getValueOptions()
    onActionsChange([
      ...actions,
      {
        when: { operator: 'equals', value: valueOpts[0]?.value ?? '' },
        then: [{ type: 'require_photo' }],
      },
    ])
  }

  const removeAction = (idx: number) => {
    onActionsChange(actions.filter((_, i) => i !== idx))
  }

  const updateActionWhen = (idx: number, value: string) => {
    const updated = [...actions]
    updated[idx] = { ...updated[idx], when: { ...updated[idx].when, value } }
    onActionsChange(updated)
  }

  const updateActionThen = (actionIdx: number, thenIdx: number, type: ActionType) => {
    const updated = [...actions]
    const thenList = [...updated[actionIdx].then]
    thenList[thenIdx] = { ...thenList[thenIdx], type }
    updated[actionIdx] = { ...updated[actionIdx], then: thenList }
    onActionsChange(updated)
  }

  const addActionThen = (actionIdx: number) => {
    const updated = [...actions]
    updated[actionIdx] = {
      ...updated[actionIdx],
      then: [...updated[actionIdx].then, { type: 'require_note' }],
    }
    onActionsChange(updated)
  }

  const removeActionThen = (actionIdx: number, thenIdx: number) => {
    const updated = [...actions]
    updated[actionIdx] = {
      ...updated[actionIdx],
      then: updated[actionIdx].then.filter((_, i) => i !== thenIdx),
    }
    onActionsChange(updated)
  }

  return (
    <div className="space-y-3">
      {/* Field-type specific config */}
      <FieldTypeConfig fieldType={fieldType} config={config} update={update} />

      {/* Conditional visibility */}
      {siblingFields && siblingFields.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">Lógica condicional (mostrar/ocultar)</span>
            {!conditions ? (
              <button
                onClick={() => onConditionsChange({
                  field_id: siblingFields[0].id,
                  operator: 'equals',
                  value: '',
                })}
                className="ml-auto text-xs text-purple-600 hover:text-purple-700"
              >
                + Adicionar condição
              </button>
            ) : (
              <button
                onClick={() => onConditionsChange(null)}
                className="ml-auto text-xs text-red-500 hover:text-red-600"
              >
                Remover
              </button>
            )}
          </div>

          {conditions && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-purple-600">Mostrar se</span>
              <select
                value={conditions.field_id}
                onChange={(e) => onConditionsChange({ ...conditions, field_id: e.target.value })}
                className="rounded border border-purple-300 bg-white px-2 py-1 text-xs"
              >
                {siblingFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label || '(sem nome)'}</option>
                ))}
              </select>
              <select
                value={conditions.operator}
                onChange={(e) => onConditionsChange({ ...conditions, operator: e.target.value })}
                className="rounded border border-purple-300 bg-white px-2 py-1 text-xs"
              >
                <option value="equals">é igual a</option>
                <option value="not_equals">é diferente de</option>
                <option value="contains">contém</option>
                <option value="is_not_empty">não está vazio</option>
              </select>
              {conditions.operator !== 'is_empty' && conditions.operator !== 'is_not_empty' && (
                <ConditionValueInput
                  field={siblingFields.find((f) => f.id === conditions.field_id)}
                  value={conditions.value}
                  onChange={(v) => onConditionsChange({ ...conditions, value: v })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions / Rules */}
      {['yes_no_na', 'single_select', 'multiple_choice', 'checkbox_list'].includes(fieldType) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Ações condicionais</span>
            <button
              onClick={addAction}
              className="ml-auto text-xs text-amber-600 hover:text-amber-700"
            >
              + Adicionar regra
            </button>
          </div>

          {actions.map((action, aIdx) => (
            <div key={aIdx} className="rounded border border-amber-200 bg-white p-2 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-amber-700">Se resposta é</span>
                <select
                  value={String(action.when.value)}
                  onChange={(e) => updateActionWhen(aIdx, e.target.value)}
                  className="rounded border border-amber-300 px-2 py-1 text-xs"
                >
                  {getValueOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="font-medium text-amber-700">então:</span>
                <button
                  onClick={() => removeAction(aIdx)}
                  className="ml-auto rounded p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {action.then.map((t, tIdx) => (
                <div key={tIdx} className="flex items-center gap-2 pl-4 text-xs">
                  <span className="text-amber-500">→</span>
                  <select
                    value={t.type}
                    onChange={(e) => updateActionThen(aIdx, tIdx, e.target.value as ActionType)}
                    className="rounded border border-amber-200 px-2 py-1 text-xs"
                  >
                    {Object.entries(actionTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {action.then.length > 1 && (
                    <button
                      onClick={() => removeActionThen(aIdx, tIdx)}
                      className="rounded p-0.5 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => addActionThen(aIdx)}
                className="ml-4 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
              >
                <Plus className="h-3 w-3" /> Mais ação
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Repeatable field */}
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isRepeatable}
            onChange={(e) => onRepeatableChange(e.target.checked)}
            className="rounded border-slate-300"
          />
          <Repeat className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-600">Permitir adicionar mais (repetível)</span>
        </label>
        {isRepeatable && (
          <label className="flex items-center gap-1">
            <span className="text-slate-500">Máx:</span>
            <input
              type="number"
              value={maxRepeats}
              onChange={(e) => onMaxRepeatsChange(Number(e.target.value) || 10)}
              min={2}
              max={50}
              className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-xs"
            />
          </label>
        )}
      </div>
    </div>
  )
}

function ConditionValueInput({
  field,
  value,
  onChange,
}: {
  field?: { field_type: FieldType; config: Record<string, unknown> }
  value: string | number | boolean
  onChange: (v: string | number | boolean) => void
}) {
  if (!field) return <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className="w-24 rounded border border-purple-300 bg-white px-2 py-1 text-xs" />

  if (field.field_type === 'yes_no_na') {
    const labels = (field.config.labels as Record<string, string>) ?? {}
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className="rounded border border-purple-300 bg-white px-2 py-1 text-xs">
        <option value="yes">{labels.yes || 'Sim'}</option>
        <option value="no">{labels.no || 'Não'}</option>
        <option value="na">{labels.na || 'N/A'}</option>
      </select>
    )
  }

  if (['single_select', 'multiple_choice', 'checkbox_list'].includes(field.field_type)) {
    const opts = (field.config.options as Array<{ value: string; label: string }>) ?? []
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className="rounded border border-purple-300 bg-white px-2 py-1 text-xs">
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  return <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className="w-24 rounded border border-purple-300 bg-white px-2 py-1 text-xs" />
}

function FieldTypeConfig({ fieldType, config, update }: { fieldType: FieldType; config: Record<string, unknown>; update: (key: string, value: unknown) => void }) {
  switch (fieldType) {
    case 'text':
    case 'textarea':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Max chars:</span>
            <input type="number" value={(config.max_length as number) ?? 200} onChange={(e) => update('max_length', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm" />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Placeholder:</span>
            <input type="text" value={(config.placeholder as string) ?? ''} onChange={(e) => update('placeholder', e.target.value)} className="w-40 rounded border border-slate-300 px-2 py-1 text-sm" />
          </label>
        </div>
      )
    case 'yes_no_na': {
      const labels = (config.labels as Record<string, string>) ?? { yes: 'Conforme', no: 'Não Conforme', na: 'N/A' }
      return (
        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium text-slate-500">Rótulos dos botões:</p>
          <div className="flex gap-2">
            {['yes', 'no', 'na'].map((key) => (
              <label key={key} className="flex items-center gap-1">
                <span className="text-xs text-slate-400">{key === 'yes' ? 'Sim' : key === 'no' ? 'Não' : 'N/A'}:</span>
                <input type="text" value={labels[key] ?? ''} onChange={(e) => update('labels', { ...labels, [key]: e.target.value })} className="w-28 rounded border border-slate-300 px-2 py-1 text-sm" />
              </label>
            ))}
          </div>
        </div>
      )
    }
    case 'multiple_choice':
    case 'single_select':
    case 'checkbox_list': {
      const options = (config.options as Array<{ value: string; label: string }>) ?? []
      return (
        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium text-slate-500">Opções:</p>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input type="text" value={opt.label} onChange={(e) => { const u = [...options]; u[idx] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }; update('options', u) }} placeholder={`Opção ${idx + 1}`} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              <button onClick={() => update('options', options.filter((_, i) => i !== idx))} className="rounded p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => update('options', [...options, { value: `opt${options.length + 1}`, label: '' }])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus className="h-3 w-3" /> Adicionar opção</button>
        </div>
      )
    }
    case 'number':
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Min:</span><input type="number" value={(config.min as number) ?? 0} onChange={(e) => update('min', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Max:</span><input type="number" value={(config.max as number) ?? 100} onChange={(e) => update('max', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Passo:</span><input type="number" value={(config.step as number) ?? 1} onChange={(e) => update('step', Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Unidade:</span><input type="text" value={(config.unit as string) ?? ''} onChange={(e) => update('unit', e.target.value)} placeholder="Ex: °C" className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" /></label>
        </div>
      )
    case 'photo':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Min fotos:</span><input type="number" value={(config.min_photos as number) ?? 0} onChange={(e) => update('min_photos', Number(e.target.value))} min={0} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Max fotos:</span><input type="number" value={(config.max_photos as number) ?? 5} onChange={(e) => update('max_photos', Number(e.target.value))} min={1} max={20} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
        </div>
      )
    case 'slider':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Min:</span><input type="number" value={(config.min as number) ?? 0} onChange={(e) => update('min', Number(e.target.value))} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Max:</span><input type="number" value={(config.max as number) ?? 10} onChange={(e) => update('max', Number(e.target.value))} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
          <label className="flex items-center gap-1.5"><span className="text-slate-500">Passo:</span><input type="number" value={(config.step as number) ?? 1} onChange={(e) => update('step', Number(e.target.value))} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" /></label>
        </div>
      )
    default:
      return null
  }
}
