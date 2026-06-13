'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⊞', label: 'Overview' },
  { href: '/students', icon: '👥', label: 'Roster' },
  { href: '/groups', icon: '🎯', label: 'Capstone Groups' },
  { href: '/program-days', icon: '📅', label: 'Program Days' },
  { href: '/attendance', icon: '✅', label: 'Attendance' },
  { href: '/exit-tickets', icon: '📋', label: 'Exit Tickets' },
  { href: '/forms', icon: '📄', label: 'Forms' },
  { href: '/cohorts', icon: '🎓', label: 'Cohorts' },
  { href: '/messages', icon: '💬', label: 'Messages' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#0D2137' }}>
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <div className="text-yellow-400 text-xs font-bold tracking-widest mb-1">
            GENERATION OF PROMISE
          </div>
          <div className="text-white font-black text-lg leading-tight">Admin Dashboard</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'text-yellow-400 bg-white/10'
                    : 'text-white/50 hover:text-white hover:bg-white/6'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-6">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <span>↩</span>
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
