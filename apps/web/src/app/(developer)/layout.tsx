'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'

const NAV = [
  { href: '/swipe',    label: 'Feed',     icon: '🔥' },
  { href: '/inbox',    label: 'Inbox',    icon: '📬' },
  { href: '/earnings', label: 'Earnings', icon: '💰' },
  { href: '/profile',  label: 'Profile',  icon: '👤' },
  { href: '/links', label: 'Links', icon: '🔗' },
]

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'DEVELOPER') {
      router.replace('/auth/login')
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="bg-dark text-white px-4 py-3 flex items-center justify-between">
        <Link href="/swipe" className="text-brand font-bold text-lg shrink-0">
          PopStack
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV.map(tab => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand/20 text-brand'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>

        <button onClick={() => { clearAuth(); router.push('/') }}
          className="text-sm text-gray-400 hover:text-white transition-colors">
          Log out
        </button>
      </nav>

      {/* Page content — pb-16 for mobile tab bar */}
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>

      {/* Bottom tab bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark border-t border-gray-800 flex z-50 sm:hidden">
        {NAV.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-brand' : 'text-gray-500 hover:text-gray-300'}`}>
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
