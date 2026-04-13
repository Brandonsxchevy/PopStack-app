'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_STYLES: Record<string, string> = {
  NEW:               'bg-gray-100 text-gray-600',
  AWAITING_PAYMENT:  'bg-blue-50 text-blue-700',
  ACTIVE:            'bg-green-50 text-green-700',
  BLOCKED:           'bg-amber-50 text-amber-700',
  PARTIAL:           'bg-purple-50 text-purple-700',
  COMPLETED:         'bg-gray-50 text-gray-500',
}

const SECTION_LABELS = [
  { key: 'NEW_REQUESTS',    label: 'New requests',  color: 'text-blue-600' },
  { key: 'AWAITING_PAYMENT', label: 'Awaiting payment', color: 'text-amber-600' },
  { key: 'ACTIVE_WORK',     label: 'Active work',   color: 'text-green-600' },
  { key: 'BLOCKED',         label: 'Blocked',       color: 'text-red-500' },
  { key: 'COMPLETED',       label: 'Completed',     color: 'text-gray-400' },
]

export default function InboxPage() {
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dev-inbox'],
    queryFn: () => api.get('/inbox').then(r => r.data),
  })

  const { data: counts } = useQuery({
    queryKey: ['inbox-counts'],
    queryFn: () => api.get('/inbox/counts').then(r => r.data),
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading inbox...</div>
  )

  if (threads.length === 0) return (
    <div className="text-center py-20 max-w-sm mx-auto">
      <div className="text-5xl mb-4">📭</div>
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Inbox is empty</h2>
      <p className="text-gray-500 mb-6">Accept questions from the feed to start helping.</p>
      <Link href="/swipe" className="btn-primary px-8 py-3 text-base">Browse feed</Link>
    </div>
  )

  const grouped = SECTION_LABELS.map(s => ({
    ...s,
    threads: threads.filter((t: any) => t.devSection === s.key),
  })).filter(g => g.threads.length > 0)

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
          {counts?.total > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{counts.unread} unread</p>
          )}
        </div>
        <Link href="/swipe" className="btn-secondary px-4 py-2 text-sm">+ Find work</Link>
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
                      {thread.user?.name && (
                        <span className="text-xs text-gray-400">
                          {thread.user.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {thread.devUnreadCount > 0 && (
                    <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {thread.devUnreadCount}
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
