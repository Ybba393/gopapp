'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const TABS = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/roadmap', icon: '📅', label: 'Program' },
  { href: '/hours', icon: '⏱️', label: 'Hours' },
  { href: '/messages', icon: '💬', label: 'Messages' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.replace('/')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D2137' }}>
        <div className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F5F7FA' }}>
      <div className="flex-1 pb-20 overflow-y-auto">
        {children}
      </div>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-pb"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex-1 flex flex-col items-center py-2 gap-0.5"
              >
                <span className="text-xl">{tab.icon}</span>
                <span className={`text-xs font-semibold ${active ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {active && <div className="w-1 h-1 rounded-full bg-yellow-500" />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
