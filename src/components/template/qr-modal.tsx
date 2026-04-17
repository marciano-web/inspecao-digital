'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Download, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface QrModalProps {
  templateId: string
  templateTitle: string
  onClose: () => void
}

export function QrModal({ templateId, templateTitle, onClose }: QrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${baseUrl}/iniciar/${templateId}`
    setUrl(fullUrl)

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, fullUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
    }
  }, [templateId])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qrcode-${templateTitle.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-bold">QR Code do Template</h3>
            <p className="text-xs text-slate-500">Escaneie para iniciar uma inspeção</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
          <canvas ref={canvasRef} />
        </div>

        <p className="mb-3 text-center text-sm font-semibold text-slate-700">{templateTitle}</p>

        <div className="mb-3 break-all rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-500">
          {url}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar Link'}
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-700 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Download className="h-4 w-4" />
            Baixar QR
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Imprima e cole no equipamento ou local. Ao escanear, o usuário faz login (se necessário) e inicia a inspeção.
        </p>
      </div>
    </div>
  )
}
