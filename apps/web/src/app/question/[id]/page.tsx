'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/store'

const TIER_LABELS = {
  FIVE: '$7.50 — Quick follow-up',
  TWENTY: '$30.00 — 15 min session',
  FIFTY_PLUS: '$75+ — Full solution'
}

interface Signal {
  source: string
  signal: string
  platform: string
  weight: number
}

export default function QuestionPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const { clearAuth } = useAuthStore()
  const [selectedTier, setSelectedTier] = useState('TWENTY')

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.get(`/questions/${id}`).then(r => r.data),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionStatus = params.get('session')
    if (sessionStatus === 'success') {
      toast.success('Payment successful — waiting for developer to accept!')
      window.history.replaceState({}, '', `/question/${id}`)
      // Poll for status change every 2s for up to 30s
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        qc.invalidateQueries({ queryKey: ['question', id] })
        if (attempts >= 15) clearInterval(interval)
      }, 2000)
      return () => clearInterval(interval)
    } else if (sessionStatus === 'cancelled') {
      toast.info('Payment cancelled — you can try again anytime.')
      window.history.replaceState({}, '', `/question/${id}`)
    }
  }, [])

  const startSession = useMutation({
    mutationFn: () => api.post('/sessions/checkout', {
      questionId: id,
      tier: selectedTier,
    }),
    onSuccess: (res) => {
      window.location.href = res.data.checkoutUrl
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to start session'),
  })

  const deleteQuestion = useMutation({
    mutationFn: () => api.delete(`/questions/${id}`),
    onSuccess: () => {
      toast.success('Request deleted')
      qc.invalidateQueries({ queryKey: ['my-questions'] })
      router.push('/dashboard')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot delete this request'),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (!question) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Question not found</div>
    </div>
  )

  const response = question.responses?.[0]
  const isLocked = question.status === 'LOCKED'
  const isPendingAccept = question.status === 'AWAITING_ACCEPT'
  const isActive = question.status === 'ACTIVE'
  const isSessionActive = isPendingAccept || isActive
  const signals: Signal[] = question.fingerprint?.signals ?? []
  const dnsProvider = signals.find(s => s.signal?.startsWith('dns_provider:'))?.signal?.replace('dns_provider: ', '')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-brand font-bold text-lg">PopStack</Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            My requests
          </Link>
          <Link href="/ask" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            + New
          </Link>
          <button onClick={() => { clearAuth(); router.push('/') }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Out
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pt-6">
        {/* Back */}
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          ← My requests
        </button>

        {/* Header card */}
        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              question.status === 'OPEN' ? 'bg-blue-50 text-blue-700' :
              question.status === 'LOCKED' ? 'bg-amber-50 text-amber-700' :
              question.status === 'AWAITING_ACCEPT' ? 'bg-purple-50 text-purple-700' :
              question.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
              'bg-gray-100 text-gray-600'}`}>
              {question.status.replace(/_/g, ' ')}
            </span>
            {question.fingerprint?.platform && question.fingerprint.platform !== 'UNKNOWN' && (
              <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                {question.fingerprint.platform}
              </span>
            )}
            {dnsProvider && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                DNS: {dnsProvider}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{question.title}</h1>
          {question.description && (
            <p className="text-sm text-gray-600 mt-2">{question.description}</p>
          )}
          {question.url && (
            <a href={question.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand underline mt-2 block truncate">
              {question.url}
            </a>
          )}
          {question.screenshotKeys?.length > 0 && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 h-40">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${question.screenshotKeys[0]}`}
                alt="Your screenshot"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Free response */}
        {response && (
          <div className="card border-green-200 bg-green-50 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                🆓 Free initial diagnosis
              </span>
              <span className="text-xs text-gray-500">{response.developer.name}</span>
              {response.developer.avgRating && (
                <span className="text-xs text-amber-600">★ {response.developer.avgRating.toFixed(1)}</span>
              )}
            </div>
            {Array.isArray(response.blocks) && response.blocks.map((block: any, i: number) => (
              <div key={i}>
                {block.type === 'text' && (
                  <p className="text-sm text-gray-800 mb-2">{
                    typeof block.content === 'string' ? block.content :
                    block.content?.content?.[0]?.content?.[0]?.text || ''
                  }</p>
                )}
                {block.type === 'code' && (
                  <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg mt-2 overflow-x-auto">
                    {block.content}
                  </pre>
                )}
              </div>
            ))}
            {response.offerPriceCents && (
              <div className="mt-3 pt-3 border-t border-green-200 text-xs text-gray-600">
                Offer: <strong>${(response.offerPriceCents / 100).toFixed(2)}</strong>
                {response.offerTimeMinutes && ` · ${response.offerTimeMinutes} minutes`}
                {response.effortEstimate && ` · ${response.effortEstimate}`}
              </div>
            )}
          </div>
        )}

        {/* Credentials warning */}
        {response && question.fingerprint && (question.fingerprint.platform !== 'UNKNOWN' || dnsProvider) && (
          <div className="card border-amber-200 bg-amber-50 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg shrink-0">🔑</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  You may need to share access credentials
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  To fix this issue, your developer will likely need login access to:
                </p>
                <ul className="text-xs text-amber-700 space-y-1">
                  {question.fingerprint.platform && question.fingerprint.platform !== 'UNKNOWN' && (
                    <li>• <strong>{question.fingerprint.platform}</strong> admin panel</li>
                  )}
                  {dnsProvider && (
                    <li>• <strong>{dnsProvider}</strong> DNS settings</li>
                  )}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  Have your credentials ready before starting a session.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Paywall — only show if not yet in session */}
        {isLocked && !isSessionActive && response && (
          <div className="card border-brand/30">
            <h3 className="font-semibold text-gray-900 mb-3">Continue with {response.developer.name}</h3>
            <div className="space-y-2 mb-4">
              {Object.entries(TIER_LABELS).map(([tier, label]) => (
                <button key={tier} type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
                    selectedTier === tier
                      ? 'border-brand bg-brand-light text-brand font-medium'
                      : 'border-gray-200 text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => startSession.mutate()}
              disabled={startSession.isPending}
              className="btn-primary w-full py-3 disabled:opacity-50">
              {startSession.isPending ? 'Redirecting to payment...' : 'Start session →'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              You'll be taken to Stripe's secure checkout. Payment is only captured when your developer accepts.
            </p>
          </div>
        )}

        {/* Awaiting accept */}
        {isPendingAccept && (
          <div className="card bg-amber-50 border-amber-200 text-center py-6">
            <div className="text-2xl mb-2">⏳</div>
            <h3 className="font-semibold text-amber-800">Payment received!</h3>
            <p className="text-sm text-amber-600 mt-1">
              Waiting for {response?.developer?.name || 'your developer'} to accept the session.
            </p>
            <p className="text-xs text-amber-500 mt-2">
              You'll be able to chat once they accept. Payment is not charged until then.
            </p>
            {question.thread?.id && (
              <Link href={`/threads/${question.thread.id}`}
                className="btn-primary inline-block px-6 py-2 mt-4 text-sm">
                💬 Open chat
              </Link>
            )}
          </div>
        )}

        {/* Active session */}
        {isActive && (
          <div className="card bg-green-50 border-green-200 text-center py-6">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-green-800">Session in progress</h3>
            <p className="text-sm text-green-600 mt-1">Your developer is working on it</p>
            {question.thread?.id && (
              <Link href={`/threads/${question.thread.id}`}
                className="btn-primary inline-block px-6 py-2 mt-4 text-sm">
                💬 Message your developer
              </Link>
            )}
          </div>
        )}

        {/* Waiting for response */}
        {question.status === 'OPEN' && !response && (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">👀</div>
            <h3 className="font-semibold text-gray-800">Waiting for a Stacker</h3>
            <p className="text-sm text-gray-500 mt-2">
              A developer is reviewing your request and will send a free diagnosis soon.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Most requests get a response within minutes.
            </p>
          </div>
        )}

        {/* Delete button */}
        {['OPEN', 'LOCKED'].includes(question.status) && (
          <button
            onClick={() => {
              if (confirm('Delete this request? This cannot be undone.')) {
                deleteQuestion.mutate()
              }
            }}
            disabled={deleteQuestion.isPending}
            className="mt-6 text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 block mx-auto">
            {deleteQuestion.isPending ? 'Deleting...' : 'Delete this request'}
          </button>
        )}
      </main>
    </div>
  )
}
