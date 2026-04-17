'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Mail, Lock, User, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegistroPage() {
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)

    // First create the organization via server action
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, orgName, email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erro ao criar conta')
      setLoading(false)
      return
    }

    // Sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Conta criada! Faça login.')
      router.push('/login')
    } else {
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Criar Conta</h1>
        <p className="mt-1 text-sm text-slate-500">Comece suas inspeções digitais</p>
      </div>

      <form onSubmit={handleRegistro} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              required
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Empresa / Organização</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nome da empresa"
              required
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <UserPlus className="h-5 w-5" />
          )}
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  )
}
