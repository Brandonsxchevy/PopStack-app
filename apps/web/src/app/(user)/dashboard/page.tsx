'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_STYLES: Record<string, string> = {
  OPEN:            'bg-blue-50 text-blue-700',
  LOCKED:          'bg-amber-50 text-amber-700',
  AWAITING_ACCEPT: 'bg-purple-50 text-purple-700',
  CLOSED:          'bg-gray-50 text-gray-500',
  EXPIRED:         'bg-red-50 text-red-500',
}

export default function DashboardPage() {
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['my-questions'],
    queryFn: () => api.get('/questions/my').then(r => r.data),
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading your requests...</div>
  )

  if (questions.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🧩</div>
      <h2 className="text-xl font-semibold mb-2 text-gray-800">No requests yet</h2>
      <p className="text-gray-500 mb-6">Got a tech problem? Pop it and a Stacker will help.</p>
      <Link href="/ask" className="btn-primary px-8 py-3 text-base">
        Submit your first request
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My requests</h1>
        <Link href="/ask" className="btn-primary px-4 py-2 text-sm">+ New request</Link>
      </div>
      <div className="space-y-3">
        {questions.map((q: any) => (
          <div key={q.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link href={`/question/${q.id}`}
                  className="font-medium text-gray-900 truncate block hover:text-brand transition-colors">
                  {q.title}
                </Link>
                {q.url && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">{q.url}</div>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {q.fingerprint?.platform && q.fingerprint.platform !== 'UNKNOWN' && (
                    <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                      {q.fingerprint.platform}
                    </span>
                  )}
                  <Link href={`/question/${q.id}`}
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[q.status] || STATUS_STYLES.OPEN}`}>
                    {q.status.replace(/_/g, ' ').toLowerCase()}
                  </Link>
                  {q.thread?.id && (
                    <Link href={`/threads/${q.thread.id}`}
                      className="text-xs text-brand font-medium hover:underline">
                      💬 Chat
                    </Link>
                  )}
                  {q.responses?.length > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {q.responses.length} response{q.responses.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 shrink-0">
                {new Date(q.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
