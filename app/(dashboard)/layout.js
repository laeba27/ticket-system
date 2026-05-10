import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { NotificationBell } from '@/components/layout/NotificationBell'

export default async function DashboardLayout({ children }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={profile} />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-end px-6 gap-2 bg-background/80 backdrop-blur-sm relative z-[9999]">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-7 animate-fade-up">
          {children}
        </main>
      </div>
      <CommandPalette profile={profile} />
    </div>
  )
}
