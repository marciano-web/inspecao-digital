'use client'

import type { TemplateField, FieldConfig, Profile } from '@/lib/types/database'
import { Camera, X, QrCode, User, Calculator, Thermometer, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface RenderizadorCampoProps {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  photos?: Array<{ url: string; id: string }>
  onAddPhoto?: (file: File) => void
  onRemovePhoto?: (id: string) => void
  // For person field: list of org members
  orgMembers?: Profile[]
  // For calculation field: all responses to compute formula
  allResponses?: Record<string, unknown>
  allFields?: TemplateField[]
}

export function RenderizadorCampo({ field, value, onChange, photos, onAddPhoto, onRemovePhoto, orgMembers, allResponses, allFields }: RenderizadorCampoProps) {
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

    case 'temperature': {
      const numVal = (value as number) ?? null
      const tMin = config.tolerance_min
      const tMax = config.tolerance_max
      const hasTolerance = tMin !== undefined || tMax !== undefined
      let status: 'ok' | 'fail' | 'none' = 'none'
      if (hasTolerance && numVal !== null) {
        const aboveMin = tMin === undefined || numVal >= tMin
        const belowMax = tMax === undefined || numVal <= tMax
        status = aboveMin && belowMax ? 'ok' : 'fail'
      }
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-slate-400" />
            <input
              type="number"
              step={config.step ?? 0.1}
              value={numVal ?? ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 ${
                status === 'fail' ? 'border-red-500 focus:ring-red-500/20' :
                status === 'ok' ? 'border-green-500 focus:ring-green-500/20' :
                'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            <span className="shrink-0 text-base font-medium text-slate-600">{config.unit ?? '°C'}</span>
          </div>
          {hasTolerance && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">
                Faixa: {tMin ?? '−∞'} a {tMax ?? '+∞'} {config.unit}
              </span>
              {status === 'ok' && <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Dentro da faixa</span>}
              {status === 'fail' && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Fora da faixa</span>}
            </div>
          )}
        </div>
      )
    }

    case 'barcode':
      return <BarcodeScanner value={value as string} onChange={onChange} format={config.scan_format ?? 'any'} />

    case 'person': {
      const filter = config.filter_role ?? 'all'
      const members = (orgMembers ?? []).filter(m =>
        m.is_active && (filter === 'all' || m.role === filter)
      )
      return (
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full appearance-none rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Selecione uma pessoa...</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
            ))}
          </select>
        </div>
      )
    }

    case 'calculation': {
      const op = config.formula_operation ?? 'sum'
      const decimals = config.decimal_places ?? 2
      // Find numeric/temperature siblings to compute
      const numericFields = (allFields ?? []).filter(f =>
        (f.field_type === 'number' || f.field_type === 'temperature' || f.field_type === 'slider') && f.id !== field.id
      )
      const values = numericFields
        .map(f => allResponses?.[f.id])
        .filter((v): v is number => typeof v === 'number')

      let result: number | null = null
      if (values.length > 0) {
        if (op === 'sum') result = values.reduce((a, b) => a + b, 0)
        else if (op === 'average') result = values.reduce((a, b) => a + b, 0) / values.length
        else if (op === 'min') result = Math.min(...values)
        else if (op === 'max') result = Math.max(...values)
        else if (op === 'multiply') result = values.reduce((a, b) => a * b, 1)
        else if (op === 'subtract') result = values.slice(1).reduce((a, b) => a - b, values[0])
      }

      // Auto-update value when computed
      const computedStr = result !== null ? result.toFixed(decimals) : ''
      const currentStr = value !== null && value !== undefined ? String(value) : ''
      if (computedStr !== currentStr) {
        setTimeout(() => onChange(result), 0)
      }

      return (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <Calculator className="h-5 w-5 text-slate-400" />
          <span className="flex-1 text-base font-bold text-slate-700">
            {result !== null ? result.toFixed(decimals) : '—'}
          </span>
          {config.unit && <span className="text-sm text-slate-500">{config.unit}</span>}
          <span className="ml-2 text-xs text-slate-400">
            ({op === 'sum' ? 'soma' : op === 'average' ? 'média' : op === 'min' ? 'mínimo' : op === 'max' ? 'máximo' : op === 'multiply' ? 'multiplicação' : 'subtração'} de {values.length} campo{values.length !== 1 ? 's' : ''})
          </span>
        </div>
      )
    }

    case 'signature':
      return <SignaturePad value={value as string} onChange={onChange} />

    default:
      return (
        <p className="text-sm text-slate-400">
          Tipo de campo &quot;{field.field_type}&quot; não suportado ainda
        </p>
      )
  }
}

function BarcodeScanner({ value, onChange, format }: { value?: string; onChange: (v: string) => void; format: string }) {
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    if (!scanning) return
    let detector: { detect: (s: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        // @ts-expect-error - BarcodeDetector is a browser API not in TS lib
        if (typeof window.BarcodeDetector !== 'undefined') {
          // @ts-expect-error
          detector = new window.BarcodeDetector({ formats: format === 'any' ? ['qr_code', 'code_128', 'ean_13'] : [format] })
          interval = setInterval(async () => {
            if (cancelled || !videoRef.current || !detector) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes.length > 0) {
                onChange(codes[0].rawValue)
                stopCamera()
              }
            } catch { /* ignore */ }
          }, 400)
        }
      } catch {
        setScanning(false)
      }
    }
    start()
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      stopCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  if (scanning) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-32 w-48 border-2 border-blue-400 rounded-lg" />
          </div>
        </div>
        <button
          type="button"
          onClick={stopCamera}
          className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite ou escaneie o código"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <QrCode className="h-5 w-5" />
          Escanear
        </button>
      </div>
    </div>
  )
}

function SignaturePad({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = value
  }, [value])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    lastPos.current = getPos(e)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stop = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  const clear = () => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-white touch-none"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
      />
      <button
        type="button"
        onClick={clear}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        Limpar assinatura
      </button>
    </div>
  )
}
