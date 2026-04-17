'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardCheck, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const mobileItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/inspecoes', label: 'Inspeções', icon: ClipboardCheck },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/configuracoes', label: 'Perfil', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white md:hidden">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-blue-700' : 'text-slate-500'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
