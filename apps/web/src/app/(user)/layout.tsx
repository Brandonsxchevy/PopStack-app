'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useEffect } from 'react'

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
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-brand font-bold text-lg shrink-0">PopStack</span>
          <span className="text-xs text-gray-400 italic hidden sm:block">Pop problems. Fix fast.</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard"
            className={`text-sm transition-colors ${pathname.startsWith('/dashboard') ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
            My requests
          </Link>
          <Link href="/ask"
            className={`text-sm transition-colors ${pathname.startsWith('/ask') ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
            + New
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
