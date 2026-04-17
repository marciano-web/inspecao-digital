'use client'

import type { TemplateField, FieldConfig } from '@/lib/types/database'
import { Camera, Plus, X, ImageIcon } from 'lucide-react'
import { useState, useRef } from 'react'

interface RenderizadorCampoProps {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  photos?: Array<{ url: string; id: string }>
  onAddPhoto?: (file: File) => void
  onRemovePhoto?: (id: string) => void
}

export function RenderizadorCampo({ field, value, onChange, photos, onAddPhoto, onRemovePhoto }: RenderizadorCampoProps) {
  const config = field.config as FieldConfig

  switch (field.field_type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder || 'Digite aqui...'}
          maxLength={config.max_length}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      )

    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder || 'Digite aqui...'}
          maxLength={config.max_length}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      )

    case 'yes_no_na': {
      const labels = config.labels ?? { yes: 'Conforme', no: 'Não Conforme', na: 'N/A' }
      const btnClass = (key: string) => {
        const selected = value === key
        if (key === 'yes') return selected ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 text-slate-600 hover:bg-green-50'
        if (key === 'no') return selected ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 text-slate-600 hover:bg-red-50'
        return selected ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
      }
      return (
        <div className="flex gap-2">
          {(['yes', 'no', 'na'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(value === key ? null : key)}
              className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-all touch-target ${btnClass(key)}`}
            >
              {labels[key] ?? key}
            </button>
          ))}
        </div>
      )
    }

    case 'single_select': {
      const options = config.options ?? []
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(value === opt.value ? null : opt.value)}
              className={`flex w-full items-center rounded-lg border-2 px-4 py-3 text-left text-sm transition-all touch-target ${
                value === opt.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`mr-3 h-5 w-5 shrink-0 rounded-full border-2 ${
                value === opt.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
              }`}>
                {value === opt.value && (
                  <div className="mx-auto mt-0.5 h-3 w-3 rounded-full bg-white" />
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    case 'multiple_choice':
    case 'checkbox_list': {
      const options = config.options ?? []
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = isChecked
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value]
                  onChange(next)
                }}
                className={`flex w-full items-center rounded-lg border-2 px-4 py-3 text-left text-sm transition-all touch-target ${
                  isChecked ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`mr-3 h-5 w-5 shrink-0 rounded border-2 ${
                  isChecked ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}>
                  {isChecked && (
                    <svg className="h-full w-full text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {opt.label}
              </button>
            )
          })}
        </div>
      )
    }

    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            min={config.min}
            max={config.max}
            step={config.step}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {config.unit && (
            <span className="shrink-0 text-sm font-medium text-slate-500">{config.unit}</span>
          )}
        </div>
      )

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      )

    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      )

    case 'slider': {
      const min = config.min ?? 0
      const max = config.max ?? 10
      const step = config.step ?? 1
      const currentVal = (value as number) ?? min
      return (
        <div className="space-y-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentVal}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{min}</span>
            <span className="text-lg font-bold text-blue-700">{currentVal}</span>
            <span>{max}</span>
          </div>
        </div>
      )
    }

    case 'photo': {
      const maxPhotos = config.max_photos ?? 5
      const currentPhotos = photos ?? []
      const fileRef = useRef<HTMLInputElement>(null)

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {currentPhotos.map((photo) => (
              <div key={photo.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                {onRemovePhoto && (
                  <button
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {currentPhotos.length < maxPhotos && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Foto</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && onAddPhoto) {
                onAddPhoto(file)
                e.target.value = ''
              }
            }}
          />
          <p className="text-xs text-slate-400">
            {currentPhotos.length}/{maxPhotos} fotos
          </p>
        </div>
      )
    }

    default:
      return (
        <p className="text-sm text-slate-400">
          Tipo de campo &quot;{field.field_type}&quot; não suportado ainda
        </p>
      )
  }
}
