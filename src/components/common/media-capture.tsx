'use client'

import { useRef } from 'react'
import { Camera, Upload, Video, X } from 'lucide-react'

interface MediaItem {
  id: string
  url: string
  fieldId?: string
  mime_type?: string
}

interface MediaCaptureProps {
  photos: MediaItem[]
  onAdd: (file: File) => void
  onRemove?: (id: string) => void
  maxItems?: number
  acceptVideo?: boolean
  required?: boolean
  compact?: boolean
}

export function MediaCapture({ photos, onAdd, onRemove, maxItems = 5, acceptVideo = true, required = false, compact = false }: MediaCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const accept = acceptVideo ? 'image/*,video/*' : 'image/*'
  const canAddMore = photos.length < maxItems

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onAdd(file)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((m) => {
            const isVideo = m.mime_type?.startsWith('video/')
            return (
              <div key={m.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 md:h-24 md:w-24">
                {isVideo ? (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
                    <Video className="h-8 w-8" />
                  </div>
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    className="absolute right-1 top-1 rounded-full bg-red-600 p-0.5 text-white opacity-90 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canAddMore && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors ${
              required && photos.length === 0
                ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Camera className="h-4 w-4" />
            {compact ? 'Câmera' : 'Tirar foto'}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
          >
            <Upload className="h-4 w-4" />
            {compact ? 'Arquivo' : 'Escolher arquivo'}
          </button>
          {acceptVideo && (
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              <Video className="h-4 w-4" />
              {compact ? 'Vídeo' : 'Gravar vídeo'}
            </button>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {acceptVideo && (
        <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFile} />
      )}

      <p className="text-xs text-slate-400">
        {photos.length}/{maxItems} {photos.length === 1 ? 'arquivo' : 'arquivos'}
        {required && photos.length === 0 && ' • Obrigatório'}
      </p>
    </div>
  )
}
