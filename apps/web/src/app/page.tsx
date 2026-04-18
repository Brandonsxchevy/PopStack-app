'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const FALLBACK_QUESTIONS = [
  { id: '1', title: 'Checkout page not loading after update', url: 'mystore.com', fingerprint: { platform: 'SHOPIFY' } },
  { id: '2', title: 'Contact form emails going to spam', url: 'agencysite.co', fingerprint: { platform: 'WORDPRESS' } },
  { id: '3', title: 'Nav menu broken on mobile', url: 'brandsite.io', fingerprint: { platform: 'WEBFLOW' } },
  { id: '4', title: 'SSL cert error on homepage', url: 'portfolio.net', fingerprint: { platform: 'SQUARESPACE' } },
  { id: '5', title: 'Product images not showing', url: 'boutique.store', fingerprint: { platform: 'WIX' } },
  { id: '6', title: 'Site redirecting to old domain', url: 'consultfirm.com', fingerprint: { platform: 'WORDPRESS' } },
  { id: '7', title: 'Blog posts not indexing on Google', url: 'myblog.org', fingerprint: { platform: 'SQUARESPACE' } },
  { id: '8', title: 'Payment gateway throwing 500 error', url: 'ecomshop.co', fingerprint: { platform: 'SHOPIFY' } },
  { id: '9', title: 'Custom font not loading', url: 'designstudio.io', fingerprint: { platform: 'WEBFLOW' } },
  { id: '10', title: 'Login page redirecting in loop', url: 'membersite.com', fingerprint: { platform: 'WORDPRESS' } },
]

type Question = {
  id: string
  title: string
  url: string
  fingerprint?: { platform?: string }
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS)
  const [selected, setSelected] = useState<Question | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated()) {
      if (user?.role === 'DEVELOPER') router.replace('/inbox')
      else if (user?.role === 'USER') router.replace('/dashboard')
      else if (user?.role === 'ADMIN') router.replace('/admin')
    }
  }, [])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/questions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.length) setQuestions(data) })
      .catch(() => {})
  }, [])

  const doubled = [...questions, ...questions]

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-brand font-bold text-xl">PopStack</span>
        <div className="flex gap-2">
          <Link href="/auth/login"
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Log in
          </Link>
          <Link href="/auth/signup"
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center px-6 pt-16 pb-10">
        <h1 className="text-3xl font-medium text-gray-900 mb-3">Real problems, real fixers.</h1>
        <p className="text-gray-500 text-base">Live questions from people who need help with their websites right now.</p>
      </div>

      {/* Marquee */}
      <div className="overflow-hidden py-5 border-t border-b border-gray-100 bg-gray-50">
        <div
          ref={trackRef}
          className="flex gap-4"
          style={{
            width: 'max-content',
            animation: 'marquee 55s linear infinite',
          }}
        >
          {doubled.map((q, i) => (
            <button
              key={`${q.id}-${i}`}
              onClick={() => setSelected(q)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-3 whitespace-nowrap hover:border-brand transition-colors flex-shrink-0"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-800">{q.title}</span>
              {q.fingerprint?.platform && q.fingerprint.platform !== 'UNKNOWN' && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  {q.fingerprint.platform}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Stats */}
      <div className="flex justify-center gap-12 py-8">
        <div className="text-center">
          <div className="text-2xl font-medium text-brand">{questions.length}+</div>
          <div className="text-xs text-gray-400 mt-1">open questions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-medium text-brand">~12 min</div>
          <div className="text-xs text-gray-400 mt-1">avg response</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-medium text-brand">$7.50+</div>
          <div className="text-xs text-gray-400 mt-1">per session</div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3 justify-center pb-16 px-6">
        <Link href="/auth/signup?role=user"
          className="bg-brand text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors">
          I have a problem
        </Link>
        <Link href="/auth/signup?role=developer"
          className="border border-brand text-brand px-8 py-3 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
          I fix problems
        </Link>
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              {selected.fingerprint?.platform && selected.fingerprint.platform !== 'UNKNOWN' && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  {selected.fingerprint.platform}
                </span>
              )}
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 text-xl leading-none ml-auto">×</button>
            </div>
            <h2 className="text-base font-medium text-gray-900 mb-1">{selected.title}</h2>
            <p className="text-sm text-brand mb-5 truncate">{selected.url}</p>
            <p className="text-xs text-gray-400 text-center mb-3">What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <Link href="/auth/signup?role=user"
                className="text-center py-3 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-sm font-medium hover:bg-purple-100 transition-colors">
                I have a similar problem
              </Link>
              <Link href="/auth/signup?role=developer"
                className="text-center py-3 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors">
                I can fix this →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
