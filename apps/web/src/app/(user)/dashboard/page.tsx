'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: string }> = {
  OPEN:            { label: 'Waiting for response',  style: 'bg-blue-50 text-blue-700',     icon: '👀' },
  LOCKED:          { label: 'Response received',     style: 'bg-amber-50 text-amber-700',   icon: '🔒' },
  AWAITING_ACCEPT: { label: 'Payment received',      style: 'bg-purple-50 text-purple-700', icon: '⏳' },
  ACTIVE:          { label: 'Session in progress',   style: 'bg-green-50 text-green-700',   icon: '⚡' },
  ENDED:           { label: 'Awaiting your approval',style: 'bg-orange-50 text-orange-700', icon: '✅' },
  CLOSED:          { label: 'Completed',             style: 'bg-gray-50 text-gray-500',     icon: '✓' },
  EXPIRED:         { label: 'Expired',               style: 'bg-red-50 text-red-500',       icon: '⚠️' },
}

const PopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className="w-4 h-4">
    <path d="M7 17L17 7M17 7H7M17 7v10" />
  </svg>
)

export default function DashboardPage() {
  const router = useRouter()

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['my-questions'],
    queryFn: () => api.get('/questions/my').then(r => r.data),
    refetchInterval: 15000,
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading your requests...</div>
  )

  if (questions.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🧩</div>
      <h2 className="text-xl font-semibold mb-2 text-gray-800">No requests yet</h2>
      <p className="text-gray-500 mb-6">Got a tech problem? Pop it and a Stacker will help.</p>
      <Link href="/ask" className="btn-primary px-8 py-3 text-base">Submit your first request</Link>
    </div>
  )

  const activeQuestions = questions.filter((q: any) =>
    ['OPEN', 'LOCKED', 'AWAITING_ACCEPT', 'ACTIVE', 'ENDED'].includes(q.status))
  const completedQuestions = questions.filter((q: any) =>
    ['CLOSED', 'EXPIRED'].includes(q.status))

  const renderQuestion = (q: any) => {
    const config = STATUS_CONFIG[q.status] || STATUS_CONFIG.OPEN
    const isActionRequired = ['AWAITING_ACCEPT', 'ACTIVE', 'ENDED'].includes(q.status)
    const isActive = q.status === 'ACTIVE'
    const isEnded = q.status === 'ENDED'

    return (
      <div
        key={q.id}
        onClick={() => router.push(`/question/${q.id}`)}
        className={`card cursor-pointer group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ${
          isActive ? 'border-green-300 border-2' :
          isEnded ? 'border-orange-300 border-2' : ''
        }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isActive && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />}
              <span className="font-medium text-gray-900 truncate block group-hover:text-brand transition-colors">
                {q.title}
              </span>
            </div>
            {q.url && <div className="text-xs text-gray-400 truncate mt-0.5">{q.url}</div>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {q.fingerprint?.platform && q.fingerprint.platform !== 'UNKNOWN' && (
                <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                  {q.fingerprint.platform}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.style}`}>
                {config.icon} {config.label}
              </span>
              {q.responses?.length > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  {q.responses.length} response{q.responses.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {isEnded && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs bg-orange-500 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors">
                  ✅ Approve & release payment
                </Link>
              )}
              {isActive && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs bg-green-500 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">
                  💬 Open chat
                </Link>
              )}
              {q.status === 'AWAITING_ACCEPT' && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs bg-purple-500 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors">
                  💬 View chat
                </Link>
              )}
              {!isActionRequired && q.thread?.id && (
                <Link
                  href={`/threads/${q.thread.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-brand font-medium hover:underline">
                  💬 Chat
                </Link>
              )}
            </div>
          </div>

          {/* Pop icon + date */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-gray-300 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200">
              <PopIcon />
            </div>
            <div className="text-xs text-gray-400">
              {new Date(q.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My requests</h1>
        <Link href="/ask" className="btn-primary px-4 py-2 text-sm">+ New request</Link>
      </div>

      {activeQuestions.length > 0 && (
        <div className="mb-6">
          {activeQuestions.some((q: any) => q.status === 'ACTIVE') && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-3">
              ⚡ Active sessions
            </h2>
          )}
          <div className="space-y-3">
            {activeQuestions.filter((q: any) => q.status === 'ACTIVE').map(renderQuestion)}
          </div>

          {activeQuestions.some((q: any) => q.status === 'ENDED') && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-3 mt-5">
              ✅ Awaiting your approval
            </h2>
          )}
          <div className="space-y-3">
            {activeQuestions.filter((q: any) => q.status === 'ENDED').map(renderQuestion)}
          </div>

          {activeQuestions.some((q: any) => ['OPEN', 'LOCKED', 'AWAITING_ACCEPT'].includes(q.status)) && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 mt-5">
              In progress
            </h2>
          )}
          <div className="space-y-3">
            {activeQuestions.filter((q: any) => ['OPEN', 'LOCKED', 'AWAITING_ACCEPT'].includes(q.status)).map(renderQuestion)}
          </div>
        </div>
      )}

      {completedQuestions.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completedQuestions.map(renderQuestion)}
          </div>
        </div>
      )}
    </div>
  )
}
