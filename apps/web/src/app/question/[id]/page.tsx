'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const TIER_LABELS = {
  FIVE: '$7.50 — Quick follow-up',
  TWENTY: '$30.00 — 15 min session',
  FIFTY_PLUS: '$75+ — Full solution'
}

export default function QuestionPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const [selectedTier, setSelectedTier] = useState('TWENTY')

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.get(`/questions/${id}`).then(r => r.data),
  })

  const startSession = useMutation({
    mutationFn: () => api.post('/sessions', { questionId: id, tier: selectedTier }),
    onSuccess: () => {
      toast.success('Session started — waiting for developer to accept')
      qc.invalidateQueries({ queryKey: ['question', id] })
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

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!question) return <div className="text-center py-20 text-gray-500">Question not found</div>

  const response = question.responses?.[0]
  const isLocked = question.status === 'LOCKED'
  const isActive = ['AWAITING_ACCEPT', 'ACTIVE'].includes(question.status)

  return (
    <div>
      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            question.status === 'OPEN' ? 'bg-blue-50 text-blue-700' :
            question.status === 'LOCKED' ? 'bg-amber-50 text-amber-700' :
            question.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
            'bg-gray-100 text-gray-600'}`}>
            {question.status.replace(/_/g, ' ')}
          </span>
          {question.fingerprint?.platform !== 'UNKNOWN' && (
            <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
              {question.fingerprint?.platform}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{question.title}</h1>
        {question.description && (
          <p className="text-sm text-gray-600 mt-2">{question.description}</p>
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
{response && question.fingerprint && (
  <div className="card border-amber-200 bg-amber-50 mb-4">
    <div className="flex items-start gap-2">
      <span className="text-amber-500 text-lg">🔑</span>
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
          {(() => {
            const dnsSig = question.fingerprint.signals?.find((s: any) =>
              s.signal?.startsWith('dns_provider:')
            )
            const provider = dnsSig?.signal?.replace('dns_provider: ', '')
            return provider && provider !== question.fingerprint.platform ? (
              <li>• <strong>{provider}</strong> DNS settings</li>
            ) : null
          })()}
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          Have your credentials ready before starting a session.
        </p>
      </div>
    </div>
  </div>
)}
      
      {/* Paywall */}
      {isLocked && !isActive && response && (
        <div className="card border-brand/30">
          <h3 className="font-semibold text-gray-900 mb-3">Continue with {response.developer.name}</h3>
          <div className="space-y-2 mb-4">
            {Object.entries(TIER_LABELS).map(([tier, label]) => (
              <button key={tier} type="button"
                onClick={() => setSelectedTier(tier)}
                className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
                  selectedTier === tier ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => startSession.mutate()}
            disabled={startSession.isPending}
            className="btn-primary w-full py-3 disabled:opacity-50">
            {startSession.isPending ? 'Starting...' : 'Start session'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Payment is held safely — only released when you approve the work
          </p>
        </div>
      )}

      {isActive && (
        <div className="card bg-green-50 border-green-200 text-center py-6">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-semibold text-green-800">Session in progress</h3>
          <p className="text-sm text-green-600 mt-1">Your developer is working on it</p>
        </div>
      )}

      {question.status === 'OPEN' && !response && (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">👀</div>
          <h3 className="font-semibold text-gray-800">Waiting for a Stacker</h3>
          <p className="text-sm text-gray-500 mt-1">
            Developers are reviewing your request. You'll be notified when someone responds.
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
    </div>
  )
}
