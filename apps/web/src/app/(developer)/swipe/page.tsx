'use client'
import { useState, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'

interface Signal {
  source: string
  signal: string
  platform: string
  weight: number
}

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
  fingerprint?: { platform: string; confidence: number; signals?: Signal[] }
  user: { id: string; name: string; avgRating: number | null; badges: string[] }
}

interface HelperCard {
  id: string
  title: string
  description?: string
  stackTags: string[]
  helperRequestId: string
  helperRole: string
  helperScopeDescription?: string
  helperTier: string
  isHelperRequest: true
  isOwnRequest: boolean
}

type FeedCard = Question | HelperCard

function isHelperCard(card: FeedCard): card is HelperCard {
  return (card as HelperCard).isHelperRequest === true
}

const BUDGET_LABELS: Record<string, string> = {
  FIVE: '$7.50', TWENTY: '$30', FIFTY_PLUS: '$75+'
}
const URGENCY_COLORS: Record<string, string> = {
  HIGH: 'text-red-600 bg-red-50',
  MEDIUM: 'text-amber-600 bg-amber-50',
  LOW: 'text-green-600 bg-green-50'
}

function getDnsProvider(signals?: Signal[]) {
  const sig = signals?.find(s => s.signal?.startsWith('dns_provider:'))
  return sig?.signal?.replace('dns_provider: ', '') ?? null
}

function SwipeFeedPage() {
  const qc = useQueryClient()
  const [current, setCurrent] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('questionId') || ''

  const { data: rawFeed = [], isLoading } = useQuery<FeedCard[]>({
    queryKey: ['feed'],
    queryFn: () => api.get('/questions/feed').then(r => r.data),
  })

 const respond = useMutation({
  mutationFn: (helperRequestId: string) =>
    api.post(`/helper-requests/${helperRequestId}/respond`),
  onSuccess: () => {
    toast.success('Response sent! Waiting for client to accept.')
    setCurrent(c => c + 1)
    setExpanded(false)
    qc.invalidateQueries({ queryKey: ['feed'] })
  },
  onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to respond'),
})

  const questions = highlightId
    ? [...rawFeed].sort((a, b) => a.id === highlightId ? -1 : b.id === highlightId ? 1 : 0)
    : rawFeed

  const swipe = useMutation({
  mutationFn: ({ questionId, action }: { questionId: string; action: string }) =>
    api.post('/swipes', { questionId, action }),
  onSuccess: (_, variables) => {
    if (variables.action === 'ANSWER_NOW') {
      router.push(`/respond/${variables.questionId}`)
    } else {
      setCurrent(c => c + 1)
      setExpanded(false)
      qc.invalidateQueries({ queryKey: ['feed'] })
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
        <button
          onClick={() => { setCurrent(0); qc.invalidateQueries({ queryKey: ['feed'] }) }}
          className="btn-primary mt-4 px-6 py-2">
          Refresh feed
        </button>
      </div>
    </div>
  )

  if (isHelperCard(card)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-brand">PopStack</span>
          <span className="text-sm text-gray-500">{current + 1} of {questions.length}</span>
        </div>
        <div className="max-w-lg mx-auto p-4 pt-6">
          <div className="card shadow-sm mb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                🤝 Helper Request
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {card.helperRole.charAt(0) + card.helperRole.slice(1).toLowerCase()}
              </span>
              {card.helperTier && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium ml-auto">
                  {BUDGET_LABELS[card.helperTier] || card.helperTier}
                </span>
              )}
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h2>

            {card.helperScopeDescription && (
              <div className="bg-purple-50 rounded-lg p-3 mb-3">
                <div className="text-xs font-medium text-purple-700 mb-1">Scope needed</div>
                <p className="text-sm text-purple-900">{card.helperScopeDescription}</p>
              </div>
            )}

            {expanded && card.description && (
              <p className="text-sm text-gray-600 mb-3">{card.description}</p>
            )}

            {card.stackTags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {card.stackTags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
            )}

            {card.isOwnRequest && (
              <div className="bg-gray-50 rounded-lg p-3 text-center text-sm text-gray-500">
                This is your helper request
              </div>
            )}

            <div className="text-xs text-gray-400 text-right mt-1">
              {expanded ? '▲ Less' : '▼ More'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); setExpanded(false) }}
              className="py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Skip
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); respond.mutate(card.helperRequestId) }}
              disabled={respond.isPending || card.isOwnRequest}
              className="py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-50">
              {card.isOwnRequest ? 'Your request' : respond.isPending ? '...' : 'I can help'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const dnsProvider = getDnsProvider((card as Question).fingerprint?.signals)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-brand">PopStack</span>
        <span className="text-sm text-gray-500">{current + 1} of {questions.length}</span>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        {highlightId && card.id === highlightId && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 mb-3 text-sm text-purple-700 font-medium">
            ⚡ Someone referred this question to you
          </div>
        )}

        <div className="card shadow-sm mb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(card as Question).fingerprint?.platform && (card as Question).fingerprint?.platform !== 'UNKNOWN' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand font-medium">
                {(card as Question).fingerprint?.platform} {(card as Question).fingerprint?.confidence}%
              </span>
            )}
            {dnsProvider && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                DNS: {dnsProvider}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              (card as Question).clarityScore >= 8 ? 'bg-green-50 text-green-700' :
              (card as Question).clarityScore >= 5 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'}`}>
              Clarity {(card as Question).clarityScore.toFixed(1)}/10
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${URGENCY_COLORS[(card as Question).urgency]}`}>
              {(card as Question).urgency}
            </span>
          </div>

          {expanded && (card as Question).screenshotKeys.length > 0 && (
            <div className="bg-gray-100 rounded-lg h-32 mb-3 overflow-hidden">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${(card as Question).screenshotKeys[0]}`}
                alt="Screenshot"
                className="w-full h-full object-cover rounded-lg"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h2>

          {expanded ? (
            <p className="text-sm text-gray-600 mb-3">{card.description}</p>
          ) : (
            card.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{card.description}</p>
            )
          )}

          {expanded && (card as Question).url && (
            <a href={(card as Question).url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-brand underline block mb-3 truncate">
              {(card as Question).url}
            </a>
          )}

          {card.stackTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.stackTags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand text-xs font-bold shrink-0">
                {(card as Question).user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-700">{(card as Question).user.name}</div>
                {(card as Question).user.badges.includes('good_client') && (
                  <div className="text-xs text-green-600">✓ Good Client</div>
                )}
              </div>
            </div>
            <div className="text-lg font-bold text-brand">{BUDGET_LABELS[(card as Question).budgetTier]}</div>
          </div>

          <div className="text-xs text-gray-400 text-right mt-2">
            {expanded ? '▲ Less' : '▼ More'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); swipe.mutate({ questionId: card.id, action: 'SKIP' }) }}
            disabled={swipe.isPending}
            className="py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            Skip
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); swipe.mutate({ questionId: card.id, action: 'INTERESTED' }) }}
            disabled={swipe.isPending}
            className="py-3 rounded-xl border border-brand text-brand font-medium hover:bg-brand-light transition-colors disabled:opacity-50">
            Interested
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); swipe.mutate({ questionId: card.id, action: 'ANSWER_NOW' }) }}
            disabled={swipe.isPending}
            className="py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-50">
            Answer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SwipePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>}>
      <SwipeFeedPage />
    </Suspense>
  )
}
