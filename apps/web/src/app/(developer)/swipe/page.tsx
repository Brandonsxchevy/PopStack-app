'use client'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Question {
  id: string
  title: string
  description?: string
  stackTags: string[]
  budgetTier: string
  urgency: string
  clarityScore: number
  url?: string
  screenshotKeys: string[]
  fingerprint?: { platform: string; confidence: number }
  user: { id: string; name: string; avgRating: number | null; badges: string[] }
}

const BUDGET_LABELS: Record<string, string> = {
  FIVE: '$7.50', TWENTY: '$30', FIFTY_PLUS: '$75+'
}
const URGENCY_COLORS: Record<string, string> = {
  HIGH: 'text-red-600 bg-red-50', MEDIUM: 'text-amber-600 bg-amber-50', LOW: 'text-green-600 bg-green-50'
}

export default function SwipeFeedPage() {
  const qc = useQueryClient()
  const [current, setCurrent] = useState(0)

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['feed'],
    queryFn: () => api.get('/questions/feed').then(r => r.data),
  })

  const swipe = useMutation({
    mutationFn: ({ questionId, action }: { questionId: string; action: string }) =>
      api.post('/swipes', { questionId, action }),
    onSuccess: (_, variables) => {
    if (variables.action === 'ANSWER_NOW') {
      router.push(`/respond/${variables.questionId}`)
    } else {
      setCurrent(c => c + 1)
    }
  },
  onError: () => toast.error('Failed to record swipe'),
})
  const card = questions[current]

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="text-4xl font-bold text-brand mb-2">PopStack</div>
        <div className="text-gray-500">Loading questions...</div>
      </div>
    </div>
  )

  if (!card) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold mb-2">You're all caught up</h2>
        <p className="text-gray-500">No more questions right now. Check back soon.</p>
        <button onClick={() => { setCurrent(0); qc.invalidateQueries({ queryKey: ['feed'] }) }}
          className="btn-primary mt-4 px-6 py-2">
          Refresh feed
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-brand">PopStack</span>
        <span className="text-sm text-gray-500">
          {current + 1} of {questions.length}
        </span>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        {/* Question card */}
        <div className="card shadow-sm mb-4">
          {/* Platform + clarity */}
          <div className="flex items-center gap-2 mb-3">
            {card.fingerprint?.platform && card.fingerprint.platform !== 'UNKNOWN' && (
              <span className="badge-brand text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand font-medium">
                {card.fingerprint.platform} {card.fingerprint.confidence}%
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              card.clarityScore >= 8 ? 'bg-green-50 text-green-700' :
              card.clarityScore >= 5 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'}`}>
              Clarity {card.clarityScore.toFixed(1)}/10
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${URGENCY_COLORS[card.urgency]}`}>
              {card.urgency}
            </span>
          </div>

          {/* Screenshot thumbnail */}
          {card.screenshotKeys.length > 0 && (
            <div className="bg-gray-100 rounded-lg h-32 mb-3 flex items-center justify-center text-sm text-gray-400 overflow-hidden">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${card.screenshotKeys[0]}`}
                alt="Screenshot"
                className="w-full h-full object-cover rounded-lg"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h2>

          {/* Description */}
          {card.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{card.description}</p>
          )}

          {/* URL */}
          {card.url && (
            <a href={card.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand underline block mb-3 truncate">
              {card.url}
            </a>
          )}

          {/* Tags */}
          {card.stackTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.stackTags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}

          {/* Budget + user */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand text-xs font-bold">
                {card.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-700">{card.user.name}</div>
                {card.user.badges.includes('good_client') && (
                  <div className="text-xs text-green-600">✓ Good Client</div>
                )}
              </div>
            </div>
            <div className="text-lg font-bold text-brand">{BUDGET_LABELS[card.budgetTier]}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => swipe.mutate({ questionId: card.id, action: 'SKIP' })}
            disabled={swipe.isPending}
            className="py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            Skip
          </button>
          <button
            onClick={() => swipe.mutate({ questionId: card.id, action: 'INTERESTED' })}
            disabled={swipe.isPending}
            className="py-3 rounded-xl border border-brand text-brand font-medium hover:bg-brand-light transition-colors disabled:opacity-50">
            Interested
          </button>
          <button
            onClick={() => swipe.mutate({ questionId: card.id, action: 'ANSWER_NOW' })}
            disabled={swipe.isPending}
            className="py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-50">
            Answer
          </button>
        </div>
      </div>
    </div>
  )
}
