'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const TIER_LABELS: Record<string, string> = {
  QUICK_FOLLOWUP: 'Quick follow-up',
  FIFTEEN_MIN:    '15 min session',
  FULL_SOLUTION:  'Full solution',
}

export default function EarningsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => api.get('/earnings').then(r => r.data),
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading earnings...</div>
  )

  const { summary, sessions = [] } = data || {}

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Earnings</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand">
            ${((summary?.totalEarnedCents || 0) / 100).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total earned</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-800">
            ${((summary?.pendingCents || 0) / 100).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Pending release</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-800">
            {summary?.completedSessions || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Sessions done</div>
        </div>
      </div>

      {/* Session history */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Session history
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">💸</div>
          <p>No completed sessions yet.</p>
          <p className="text-sm mt-1">Complete your first session to start earning.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s: any) => (
            <div key={s.id} className="card flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {s.question?.title || 'Session'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {TIER_LABELS[s.tier] || s.tier}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.endedAt || s.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${
                    s.escrowStatus === 'RELEASED'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {s.escrowStatus === 'RELEASED' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className={`text-lg font-bold ${
                s.escrowStatus === 'RELEASED' ? 'text-green-600' : 'text-gray-400'
              }`}>
                ${((s.amountCents || 0) / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
