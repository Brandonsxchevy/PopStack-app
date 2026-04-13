'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const NAV = [
  { href: '/swipe',    label: 'Feed' },
  { href: '/inbox',    label: 'Inbox' },
  { href: '/earnings', label: 'Earnings' },
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
      <nav className="bg-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-brand font-bold text-lg">PopStack</span>
          <span className="text-xs text-gray-500 font-mono hidden sm:block">pop() problems</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`text-sm transition-colors ${pathname.startsWith(n.href) ? 'text-brand font-medium' : 'text-gray-400 hover:text-white'}`}>
              {n.label}
            </Link>
          ))}
          <button onClick={() => { clearAuth(); router.push('/') }}
            className="text-sm text-gray-500 hover:text-white transition-colors">
            Out
          </button>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  )
}
