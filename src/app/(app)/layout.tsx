'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Header } from '@/components/layout/header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex flex-1 flex-col pb-16 md:pb-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
        <MobileNav />
      </div>
    </AuthProvider>
  )
}
