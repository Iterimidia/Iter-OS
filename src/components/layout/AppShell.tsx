import { useState } from 'react'
import type { ReactNode } from 'react'
import type { BaseId } from '@/types'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'

interface AppShellProps {
  base: BaseId
  children: ReactNode
}

export function AppShell({ base, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-iter-bg">
      <Sidebar base={base} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar base={base} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
      <MobileNav base={base} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </div>
  )
}
