'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Users,
  Settings,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/contexts/auth-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inspecoes', label: 'Inspeções', icon: ClipboardCheck },
  { href: '/templates', label: 'Templates', icon: FileText, roles: ['admin', 'manager'] },
  { href: '/equipe', label: 'Equipe', icon: Users, roles: ['admin', 'manager'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <ClipboardList className="h-7 w-7 text-blue-700" />
        <span className="text-lg font-bold text-slate-900">Inspeção Digital</span>
      </div>

      <nav className="mt-4 space-y-1 px-3">
        {navItems.map((item) => {
          if (item.roles && profile && !item.roles.includes(profile.role)) return null
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
