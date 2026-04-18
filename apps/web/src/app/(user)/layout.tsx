'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'
import { api } from '@/lib/api'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'USER') {
      router.replace('/auth/login')
    }
  }, [])

  const { data: counts } = useQuery({
    queryKey: ['user-counts'],
    queryFn: () => api.get('/inbox/counts').then(r => r.data),
    refetchInterval: 10000,
    enabled: !!user,
  })

  const unread = counts?.unread || 0

  const tabs = [
    { href: '/dashboard', label: 'Requests', icon: '📋' },
    { href: '/ask', label: 'New', icon: '＋' },
    { href: '/account', label: 'Account', icon: '👤' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-brand font-bold text-lg">
          PopStack
        </Link>
        <button
          onClick={() => { clearAuth(); router.push('/') }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          Log out
        </button>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pt-6 pb-24">
        {children}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => {
            const isActive = pathname === tab.href
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                  isActive ? 'text-brand' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <span className="text-xl leading-none relative">
                  {tab.icon}
                  {tab.href === '/dashboard' && unread > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className={`text-xs font-medium ${isActive ? 'text-brand' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
