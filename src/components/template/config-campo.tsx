'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { FieldType } from '@/lib/types/database'

interface ConfigCampoProps {
  fieldType: FieldType
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export function ConfigCampo({ fieldType, config, onChange }: ConfigCampoProps) {
  const update = (key: string, value: unknown) => onChange({ ...config, [key]: value })

  switch (fieldType) {
    case 'text':
    case 'textarea':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Max chars:</span>
            <input
              type="number"
              value={(config.max_length as number) ?? 200}
              onChange={(e) => update('max_length', Number(e.target.value))}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Placeholder:</span>
            <input
              type="text"
              value={(config.placeholder as string) ?? ''}
              onChange={(e) => update('placeholder', e.target.value)}
              className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
            />
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
                <input
                  type="text"
                  value={labels[key] ?? ''}
                  onChange={(e) =>
                    update('labels', { ...labels, [key]: e.target.value })
                  }
                  className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      )
    }

    case 'multiple_choice':
    case 'single_select':
    case 'checkbox_list': {
      const options = (config.options as Array<{ value: string; label: string; score?: number }>) ?? []
      return (
        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium text-slate-500">Opções:</p>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.label}
                onChange={(e) => {
                  const updated = [...options]
                  updated[idx] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                  update('options', updated)
                }}
                placeholder={`Opção ${idx + 1}`}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                onClick={() => update('options', options.filter((_, i) => i !== idx))}
                className="rounded p-1 text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update('options', [...options, { value: `opt${options.length + 1}`, label: '' }])
            }
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3 w-3" /> Adicionar opção
          </button>
        </div>
      )
    }

    case 'number':
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Min:</span>
            <input
              type="number"
              value={(config.min as number) ?? 0}
              onChange={(e) => update('min', Number(e.target.value))}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Max:</span>
            <input
              type="number"
              value={(config.max as number) ?? 100}
              onChange={(e) => update('max', Number(e.target.value))}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Passo:</span>
            <input
              type="number"
              value={(config.step as number) ?? 1}
              onChange={(e) => update('step', Number(e.target.value))}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Unidade:</span>
            <input
              type="text"
              value={(config.unit as string) ?? ''}
              onChange={(e) => update('unit', e.target.value)}
              placeholder="Ex: °C, kg"
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      )

    case 'photo':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Min fotos:</span>
            <input
              type="number"
              value={(config.min_photos as number) ?? 0}
              onChange={(e) => update('min_photos', Number(e.target.value))}
              min={0}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Max fotos:</span>
            <input
              type="number"
              value={(config.max_photos as number) ?? 5}
              onChange={(e) => update('max_photos', Number(e.target.value))}
              min={1}
              max={20}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
        </div>
      )

    case 'slider':
      return (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Min:</span>
            <input
              type="number"
              value={(config.min as number) ?? 0}
              onChange={(e) => update('min', Number(e.target.value))}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Max:</span>
            <input
              type="number"
              value={(config.max as number) ?? 10}
              onChange={(e) => update('max', Number(e.target.value))}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-500">Passo:</span>
            <input
              type="number"
              value={(config.step as number) ?? 1}
              onChange={(e) => update('step', Number(e.target.value))}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
            />
          </label>
        </div>
      )

    default:
      return null
  }
}
