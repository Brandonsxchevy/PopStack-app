'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'

const NAV = [
  { href: '/dashboard', label: 'My requests' },
  { href: '/ask',       label: '+ New request' },
]

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'USER') {
      router.replace('/auth/login')
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6">
        <span className="text-brand font-bold text-lg">PopStack</span>
        <span className="text-xs text-gray-400 italic">Pop problems. Fix fast.</span>
        <div className="flex gap-4 ml-auto items-center">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`text-sm transition-colors ${pathname.startsWith(n.href) ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
              {n.label}
            </Link>
          ))}
          <button onClick={() => { clearAuth(); router.push('/') }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Log out
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pt-6">{children}</main>
    </div>
  )
}
