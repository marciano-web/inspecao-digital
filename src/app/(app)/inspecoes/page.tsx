'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, ClipboardCheck, Filter, X } from 'lucide-react'
import type { Inspection, Customer, ServiceOrder, InspectionTemplate } from '@/lib/types/database'

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluída', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
}

export default function InspecoesPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [orderFilter, setOrderFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  // Load filter options
  useEffect(() => {
    const load = async () => {
      const [c, o, t] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('service_orders').select('id, order_number, customer_id').order('created_at', { ascending: false }),
        supabase.from('inspection_templates').select('id, title').order('title'),
      ])
      if (c.data) setCustomers(c.data as Customer[])
      if (o.data) setOrders(o.data as ServiceOrder[])
      if (t.data) setTemplates(t.data as InspectionTemplate[])
    }
    load()
  }, [supabase])

  useEffect(() => {
    const fetch = async () => {
      try {
        let query = supabase
          .from('inspections')
          .select('*, template:inspection_templates(title), inspector:profiles(full_name), customer:customers(name), service_order:service_orders(order_number)')
          .order('created_at', { ascending: false })
          .limit(100)

        if (statusFilter !== 'all') query = query.eq('status', statusFilter)
        if (customerFilter !== 'all') query = query.eq('customer_id', customerFilter)
        if (orderFilter !== 'all') query = query.eq('service_order_id', orderFilter)
        if (templateFilter !== 'all') query = query.eq('template_id', templateFilter)

        const { data, error } = await query
        if (error) console.error(error)
        if (data) setInspections(data as unknown as Inspection[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [statusFilter, customerFilter, orderFilter, templateFilter, supabase])

  const filtered = search
    ? inspections.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.location?.toLowerCase().includes(search.toLowerCase())
      )
    : inspections

  const filteredOrders = customerFilter !== 'all'
    ? orders.filter(o => o.customer_id === customerFilter)
    : orders

  const activeFilterCount = [statusFilter, customerFilter, orderFilter, templateFilter].filter(f => f !== 'all').length

  const clearFilters = () => {
    setStatusFilter('all')
    setCustomerFilter('all')
    setOrderFilter('all')
    setTemplateFilter('all')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">Inspeções</h1>
        <Link
          href="/inspecoes/nova"
          className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${activeFilterCount > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && <span className="rounded-full bg-blue-700 px-1.5 text-xs text-white">{activeFilterCount}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="all">Todos</option>
                <option value="draft">Rascunho</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Empresa</label>
              <select value={customerFilter} onChange={(e) => { setCustomerFilter(e.target.value); setOrderFilter('all') }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="all">Todas</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ordem de Serviço</label>
              <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="all">Todas</option>
                {filteredOrders.map(o => <option key={o.id} value={o.id}>OS {o.order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Template</label>
              <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="all">Todos</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="md:col-span-4 flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhuma inspeção encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((insp) => {
            const s = statusLabels[insp.status] ?? statusLabels.draft
            const tmpl = (insp as unknown as { template: { title: string } | null }).template
            const cust = (insp as unknown as { customer: { name: string } | null }).customer
            const ord = (insp as unknown as { service_order: { order_number: string } | null }).service_order
            return (
              <Link
                key={insp.id}
                href={
                  insp.status === 'draft' || insp.status === 'in_progress'
                    ? `/inspecoes/${insp.id}/executar`
                    : `/inspecoes/${insp.id}`
                }
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tmpl?.title ?? insp.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {cust && <span>🏢 {cust.name}</span>}
                    {ord && <span>📋 OS {ord.order_number}</span>}
                    {insp.location && <span>📍 {insp.location}</span>}
                    <span>{new Date(insp.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {insp.score_percentage !== null && (
                    <p className="mt-1 text-xs font-medium text-blue-600">
                      Nota: {insp.score_percentage}%
                      {insp.passed !== null && (insp.passed ? ' (Aprovado)' : ' (Reprovado)')}
                    </p>
                  )}
                </div>
                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                  {s.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
