'use client'

import { useAuth } from '@/contexts/auth-context'
import { LogOut, ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function Header() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Desconectado')
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:h-16 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <ClipboardList className="h-6 w-6 text-blue-700" />
        <span className="text-base font-bold text-slate-900">Inspeção Digital</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {profile && (
          <span className="hidden text-sm text-slate-600 md:block">
            {profile.full_name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
