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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-brand font-bold text-lg shrink-0">
          PopStack
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard"
            className={`relative text-sm transition-colors ${pathname === '/dashboard' ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
            My requests
            {unread > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <Link href="/ask"
            className={`text-sm transition-colors ${pathname === '/ask' ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
            + New Question
          </Link>
          <Link href="/account"
            className={`text-sm transition-colors ${pathname === '/account' ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
            Account
          </Link>
          <button onClick={() => { clearAuth(); router.push('/') }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Out
          </button>
        </div>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pt-6">{children}</main>
    </div>
  )
}
