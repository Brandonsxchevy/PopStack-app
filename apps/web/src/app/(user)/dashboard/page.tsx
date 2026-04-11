'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_STYLES: Record<string, string> = {
  NEW:               'bg-gray-100 text-gray-600',
  AWAITING_PAYMENT:  'bg-blue-50 text-blue-700',
  ACTIVE:            'bg-green-50 text-green-700',
  WAITING_ON_YOU:    'bg-amber-50 text-amber-700',
  BLOCKED:           'bg-amber-50 text-amber-700',
  PARTIAL:           'bg-purple-50 text-purple-700',
  COMPLETED:         'bg-gray-50 text-gray-500',
}

const SECTION_LABELS = [
  { key: 'WAITING_ON_YOU', label: 'Waiting on you', color: 'text-amber-600' },
  { key: 'ACTIVE_WORK',    label: 'Active work',    color: 'text-green-600' },
  { key: 'COMPLETED',      label: 'Completed',      color: 'text-gray-500' },
  { key: 'DRAFT',          label: 'Drafts',          color: 'text-gray-400' },
]

export default function DashboardPage() {
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api.get('/inbox').then(r => r.data),
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading your requests...</div>
  )

  if (threads.length === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🧩</div>
      <h2 className="text-xl font-semibold mb-2 text-gray-800">No requests yet</h2>
      <p className="text-gray-500 mb-6">Got a tech problem? Pop it and a Stacker will help.</p>
      <Link href="/ask" className="btn-primary px-8 py-3 text-base">
        Submit your first request
      </Link>
    </div>
  )

  // Group threads by section
  const grouped = SECTION_LABELS.map(s => ({
    ...s,
    threads: threads.filter((t: any) => t.userSection === s.key),
  })).filter(g => g.threads.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My requests</h1>
        <Link href="/ask" className="btn-primary px-4 py-2 text-sm">+ New request</Link>
      </div>

      {grouped.map(group => (
        <div key={group.key} className="mb-6">
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${group.color}`}>
            {group.label}
          </h2>
          <div className="space-y-2">
            {group.threads.map((thread: any) => (
              <Link key={thread.id} href={`/question/${thread.questionId}`}
                className="card hover:shadow-md transition-shadow block">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {thread.question?.title || 'Untitled request'}
                    </div>
                    {thread.lastMessagePreview && (
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {thread.lastMessagePreview}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {thread.question?.fingerprint?.platform &&
                       thread.question.fingerprint.platform !== 'UNKNOWN' && (
                        <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                          {thread.question.fingerprint.platform}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[thread.status] || STATUS_STYLES.NEW}`}>
                        {thread.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                  </div>
                  {thread.userUnreadCount > 0 && (
                    <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {thread.userUnreadCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
