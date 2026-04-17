'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { FileText, ArrowRight, Building2, FileCheck, Plus, Search, ChevronLeft } from 'lucide-react'
import type { InspectionTemplate, Customer, ServiceOrder } from '@/lib/types/database'
import toast from 'react-hot-toast'

type Step = 'customer' | 'order' | 'template'

export default function NovaInspecaoPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('customer')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Selected
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)

  // New customer/order forms
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', legal_name: '', cnpj: '', contact_person: '', phone: '', email: '' })
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [newOrder, setNewOrder] = useState({ order_number: '', title: '', scheduled_date: '' })

  useEffect(() => {
    if (!profile) return
    const fetch = async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          supabase.from('customers').select('*').eq('is_active', true).order('name'),
          supabase.from('inspection_templates').select('*').eq('status', 'published').order('title'),
        ])
        if (cRes.data) setCustomers(cRes.data)
        if (tRes.data) setTemplates(tRes.data)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [profile, supabase])

  const fetchOrdersForCustomer = async (customerId: string) => {
    const { data } = await supabase
      .from('service_orders')
      .select('*')
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  const handleSelectCustomer = async (c: Customer) => {
    setSelectedCustomer(c)
    await fetchOrdersForCustomer(c.id)
    setStep('order')
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !newCustomer.name.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...newCustomer, organization_id: profile.organization_id })
      .select()
      .single()
    if (error) {
      toast.error('Erro: ' + error.message)
      setCreating(false)
      return
    }
    setCustomers([data, ...customers])
    setShowNewCustomer(false)
    setNewCustomer({ name: '', legal_name: '', cnpj: '', contact_person: '', phone: '', email: '' })
    setCreating(false)
    handleSelectCustomer(data)
  }

  const handleSelectOrder = (o: ServiceOrder | null) => {
    setSelectedOrder(o)
    setStep('template')
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !selectedCustomer || !newOrder.order_number.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        organization_id: profile.organization_id,
        customer_id: selectedCustomer.id,
        order_number: newOrder.order_number,
        title: newOrder.title || null,
        scheduled_date: newOrder.scheduled_date || null,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erro: ' + error.message)
      setCreating(false)
      return
    }
    setOrders([data, ...orders])
    setShowNewOrder(false)
    setNewOrder({ order_number: '', title: '', scheduled_date: '' })
    setCreating(false)
    handleSelectOrder(data)
  }

  const handleSelectTemplate = async (template: InspectionTemplate) => {
    if (!profile || creating) return
    setCreating(true)

    const titleParts = [template.title]
    if (selectedCustomer) titleParts.push(selectedCustomer.name)
    if (selectedOrder) titleParts.push(`OS ${selectedOrder.order_number}`)

    const { data, error } = await supabase
      .from('inspections')
      .insert({
        organization_id: profile.organization_id,
        template_id: template.id,
        template_version: template.version,
        inspector_id: profile.id,
        customer_id: selectedCustomer?.id ?? null,
        service_order_id: selectedOrder?.id ?? null,
        title: titleParts.join(' - '),
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data) {
      toast.error('Erro ao criar inspeção')
      setCreating(false)
      return
    }
    router.push(`/inspecoes/${data.id}/executar`)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" /></div>
  }

  // STEP 1: Customer selection
  if (step === 'customer') {
    const filtered = search ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.cnpj?.includes(search)) : customers
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold md:text-2xl">Nova Inspeção - Etapa 1: Empresa</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa por nome ou CNPJ..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            <Plus className="h-4 w-4" /> Nova Empresa
          </button>
        </div>

        {showNewCustomer && (
          <form onSubmit={handleCreateCustomer} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <h3 className="font-semibold text-blue-900">Cadastrar nova empresa</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Nome fantasia *" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newCustomer.legal_name} onChange={(e) => setNewCustomer({ ...newCustomer, legal_name: e.target.value })} placeholder="Razão social" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newCustomer.cnpj} onChange={(e) => setNewCustomer({ ...newCustomer, cnpj: e.target.value })} placeholder="CNPJ" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newCustomer.contact_person} onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })} placeholder="Pessoa de contato" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="Telefone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewCustomer(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{creating ? 'Salvando...' : 'Salvar e continuar'}</button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">{customers.length === 0 ? 'Nenhuma empresa cadastrada ainda' : 'Nenhuma empresa encontrada'}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => handleSelectCustomer(c)} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  {c.legal_name && <p className="truncate text-xs text-slate-500">{c.legal_name}</p>}
                  {c.cnpj && <p className="text-xs text-slate-400">CNPJ: {c.cnpj}</p>}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // STEP 2: Service Order selection
  if (step === 'order' && selectedCustomer) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => setStep('customer')} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold md:text-2xl">Etapa 2: Ordem de Serviço</h1>
          </div>
          <p className="text-sm text-slate-500">Cliente: <strong>{selectedCustomer.name}</strong></p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowNewOrder(!showNewOrder)} className="flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            <Plus className="h-4 w-4" /> Nova OS
          </button>
          <button onClick={() => handleSelectOrder(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
            Continuar sem OS
          </button>
        </div>

        {showNewOrder && (
          <form onSubmit={handleCreateOrder} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <h3 className="font-semibold text-blue-900">Nova Ordem de Serviço</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input required value={newOrder.order_number} onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })} placeholder="Número da OS *" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input type="date" value={newOrder.scheduled_date} onChange={(e) => setNewOrder({ ...newOrder, scheduled_date: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <input value={newOrder.title} onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })} placeholder="Título / descrição" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewOrder(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{creating ? 'Salvando...' : 'Salvar e continuar'}</button>
            </div>
          </form>
        )}

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center">
            <p className="text-sm text-slate-500">Nenhuma OS para este cliente. Crie uma nova ou continue sem OS.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <button key={o.id} onClick={() => handleSelectOrder(o)} className="flex items-center gap-3 w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">OS {o.order_number}</p>
                  {o.title && <p className="truncate text-xs text-slate-500">{o.title}</p>}
                  {o.scheduled_date && <p className="text-xs text-slate-400">Agendada: {new Date(o.scheduled_date).toLocaleDateString('pt-BR')}</p>}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // STEP 3: Template selection
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => setStep('order')} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold md:text-2xl">Etapa 3: Template</h1>
        </div>
        <p className="text-sm text-slate-500">
          {selectedCustomer && <>Cliente: <strong>{selectedCustomer.name}</strong></>}
          {selectedOrder && <> • OS <strong>{selectedOrder.order_number}</strong></>}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum template publicado disponível.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <button key={t.id} onClick={() => handleSelectTemplate(t)} disabled={creating} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md disabled:opacity-60">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p>}
                {t.category && <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t.category}</span>}
              </div>
              {creating ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" /> : <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
