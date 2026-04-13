'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'

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
      {/* Top nav — logo + logout only */}
      <nav className="bg-dark text-white px-4 py-3 flex items-center justify-between">
        <Link href="/swipe" className="text-brand font-bold text-lg">
          PopStack
        </Link>
        <button onClick={() => { clearAuth(); router.push('/') }}
          className="text-sm text-gray-400 hover:text-white transition-colors">
          Log out
        </button>
      </nav>

      {/* Page content — add bottom padding so tab bar doesn't cover it */}
      <main className="flex-1 pb-16">{children}</main>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark border-t border-gray-800 flex z-50">
        {[
          { href: '/swipe',    label: 'Feed',     icon: '🔥' },
          { href: '/inbox',    label: 'Inbox',    icon: '📬' },
          { href: '/earnings', label: 'Earnings', icon: '💰' },
        ].map(tab => {
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
