'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, FileText, MoreVertical, Eye, Pencil, Archive } from 'lucide-react'
import type { InspectionTemplate } from '@/lib/types/database'
import toast from 'react-hot-toast'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_templates')
        .select('*, creator:profiles(full_name)')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar templates:', error)
        toast.error('Erro: ' + error.message)
      }
      if (data) setTemplates(data as unknown as InspectionTemplate[])
    } catch (e) {
      console.error('Falha na requisição:', e)
      toast.error('Falha ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleArchive = async (id: string) => {
    await supabase.from('inspection_templates').update({ status: 'archived' }).eq('id', id)
    toast.success('Template arquivado')
    setMenuOpen(null)
    fetchTemplates()
  }

  const handlePublish = async (id: string) => {
    await supabase.from('inspection_templates').update({ status: 'published' }).eq('id', id)
    toast.success('Template publicado')
    setMenuOpen(null)
    fetchTemplates()
  }

  const statusBadge: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Rascunho', cls: 'bg-amber-100 text-amber-700' },
    published: { label: 'Publicado', cls: 'bg-green-100 text-green-700' },
    archived: { label: 'Arquivado', cls: 'bg-slate-100 text-slate-600' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">Templates</h1>
        <Link
          href="/templates/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum template criado ainda.</p>
          <Link href="/templates/novo" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
            Criar primeiro template
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const badge = statusBadge[t.status] ?? statusBadge.draft
            return (
              <div key={t.id} className="relative rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{t.title}</h3>
                    {t.category && (
                      <p className="text-xs text-slate-500">{t.category}</p>
                    )}
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === t.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <Link
                          href={`/templates/${t.id}/editar`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Link>
                        {t.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(t.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                          >
                            <Eye className="h-4 w-4" /> Publicar
                          </button>
                        )}
                        {t.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(t.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                          >
                            <Archive className="h-4 w-4" /> Arquivar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {t.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500">{t.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-slate-400">v{t.version}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
