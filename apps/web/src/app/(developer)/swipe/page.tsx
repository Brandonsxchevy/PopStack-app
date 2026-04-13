'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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

export default function SwipeFeedPage() {
  const qc = useQueryClient()
  const [current, setCurrent] = useState(0)
  const router = useRouter()

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
        <button
          onClick={() => { setCurrent(0); qc.invalidateQueries({ queryKey: ['feed'] }) }}
          className="btn-primary mt-4 px-6 py-2">
          Refresh feed
        </button>
      </div>
    </div>
  )

  const dnsProvider = getDnsProvider(card.fingerprint?.signals)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-brand">PopStack</span>
        <span className="text-sm text-gray-500">{current + 1} of {questions.length}</span>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        <div cla
