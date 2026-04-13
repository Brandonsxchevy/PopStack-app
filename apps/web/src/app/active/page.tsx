'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'

function TimeElapsed({ startedAt }: { startedAt: string }) {
  const start = new Date(startedAt)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / 1000)
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return <span>{hours}h {minutes}m elapsed</span>
  return <span>{minutes}m elapsed</span>
}

export default function ActivePage() {
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['dev-active'],
    queryFn: () => api.get('/inbox').then(r => r.data),
    refetchInterval: 30000,
  })

  const activeThreads = threads.filter((t: any) => t.devSection === 'ACTIVE_WORK')

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading...</div>
  )

  if (activeThreads.length === 0) return (
    <div className="text-center py-20 max-w-sm mx-auto">
      <div className="text-5xl mb-4">⚡</div>
      <h2 className="text-xl font-semibold mb-2 text-gray-800">No active sessions</h2>
      <p className="text-gray-500 mb-6">Accepted sessions will appear here while in progress.</p>
      <Link href="/inbox" className="btn-primary px-8 py-3 text-base">Go to inbox</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Active sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeThreads.length} session{activeThreads.length > 1 ? 's' : ''} in progress</p>
        </div>
      </div>

      <div className="space-y-3">
        {activeThreads.map((thread: any) => (
          <Link key={thread.id} href={`/threads/${thread.id}`}
            className="card hover:shadow-md transition-shadow block border-l-4 border-green-400">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                  <span className="font-medium text-gray-900 truncate">
                    {thread.question?.title || 'Untitled request'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {thread.question?.fingerprint?.platform &&
                   thread.question.fingerprint.platform !== 'UNKNOWN' && (
                    <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                      {thread.question.fingerprint.platform}
                    </span>
                  )}
                  {thread.user?.name && (
                    <span className="text-xs text-gray-500">👤 {thread.user.name}</span>
                  )}
                  {thread.session?.startedAt && (
                    <span className="text-xs text-green-600 font-medium">
                      ⏱ <TimeElapsed startedAt={thread.session.startedAt} />
                    </span>
                  )}
                </div>
                {thread.lastMessagePreview && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{thread.lastMessagePreview}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {thread.devUnreadCount > 0 && (
                  <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {thread.devUnreadCount}
                  </span>
                )}
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
        <p className="text-xs text-gray-500">
          Click a session to open the chat and mark it complete when done.
        </p>
      </div>
    </div>
  )
}
