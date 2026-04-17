'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Building2, Save, Upload, FileText, Mail, Phone, Globe, MapPin } from 'lucide-react'
import type { Organization } from '@/lib/types/database'
import toast from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const { profile, user } = useAuth()
  const supabase = createClient()
  const [tab, setTab] = useState<'profile' | 'company'>('profile')
  const [org, setOrg] = useState<Organization | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    report_header: '',
    report_footer: '',
  })

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
      if (data) {
        setOrg(data)
        setForm({
          name: data.name ?? '',
          legal_name: data.legal_name ?? '',
          cnpj: data.cnpj ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          website: data.website ?? '',
          report_header: data.report_header ?? '',
          report_footer: data.report_footer ?? '',
        })
      }
    }
    load()
  }, [profile, supabase])

  const handleSave = async () => {
    if (!profile || !org) return
    setSaving(true)
    const { error } = await supabase.from('organizations').update(form).eq('id', org.id)
    if (error) {
      toast.error('Erro: ' + error.message)
    } else {
      toast.success('Configurações salvas')
      setOrg({ ...org, ...form })
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile || !org) return
    setUploading(true)

    const ext = file.name.split('.').pop() || 'png'
    const path = `${profile.organization_id}/logo-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type, upsert: true })
    if (upErr) {
      toast.error('Erro ao enviar logo: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)

    const { error: updErr } = await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', org.id)
    if (updErr) {
      toast.error('Erro ao salvar URL do logo')
    } else {
      setOrg({ ...org, logo_url: publicUrl })
      toast.success('Logo atualizado')
    }
    setUploading(false)
    e.target.value = ''
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    inspector: 'Inspetor',
  }

  if (!profile) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  const isAdmin = profile.role === 'admin'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Configurações</h1>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab('profile')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'profile' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Meu Perfil
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('company')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'company' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Dados da Empresa
          </button>
        )}
      </div>

      {tab === 'profile' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile.full_name}</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {roleLabels[profile.role]}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-slate-400" /><span className="text-slate-600">{user?.email}</span></div>
            {profile.phone && <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-slate-400" /><span className="text-slate-600">{profile.phone}</span></div>}
          </div>
        </div>
      )}

      {tab === 'company' && isAdmin && (
        <div className="space-y-6">
          {/* Logo */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold">Logo da empresa</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                {org?.logo_url ? (
                  <img src={org.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Enviando...' : 'Enviar logo'}
                </button>
                <p className="mt-1 text-xs text-slate-400">PNG, JPG ou SVG até 5MB</p>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold">Informações cadastrais</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome / Fantasia *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Razão Social</label>
                <input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">CNPJ</label>
                <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Site</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Endereço</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Report customization */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold">Personalização do Relatório PDF</h3>
            </div>
            <p className="text-xs text-slate-500">Esses textos aparecem no cabeçalho e rodapé do PDF de cada inspeção concluída.</p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cabeçalho do relatório</label>
              <textarea
                value={form.report_header}
                onChange={(e) => setForm({ ...form, report_header: e.target.value })}
                placeholder="Ex: Relatório de Inspeção Técnica"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rodapé do relatório</label>
              <textarea
                value={form.report_footer}
                onChange={(e) => setForm({ ...form, report_footer: e.target.value })}
                placeholder="Ex: Documento confidencial. Distribuição restrita."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  )
}
