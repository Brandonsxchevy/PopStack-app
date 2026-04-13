'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function DevQuestionPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.get(`/questions/${id}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading...</div>
  )

  if (!question) return (
    <div className="text-center py-20 text-gray-500">Question not found</div>
  )

  const response = question.responses?.[0]

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            question.status === 'OPEN' ? 'bg-blue-50 text-blue-700' :
            question.status === 'LOCKED' ? 'bg-amber-50 text-amber-700' :
            question.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
            'bg-gray-100 text-gray-600'}`}>
            {question.status.replace(/_/g, ' ')}
          </span>
          {question.fingerprint?.platform && question.fingerprint.platform !== 'UNKNOWN' && (
            <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
              {question.fingerprint.platform}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{question.title}</h1>
        {question.description && (
          <p className="text-sm text-gray-600 mt-2">{question.description}</p>
        )}
        {question.url && (
          <a href={question.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand underline mt-2 block truncate">
            {question.url}
          </a>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand text-xs font-bold">
            {question.user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-gray-600">{question.user?.name}</span>
        </div>
      </div>

      {response ? (
        <div className="card border-green-200 bg-green-50 mb-4">
          <div className="text-xs font-semibold text-green-700 mb-3">✓ Your response sent</div>
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
              {response.offerTimeMinutes && ` · ${response.offerTimeMinutes} min`}
              {response.effortEstimate && ` · ${response.effortEstimate}`}
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500 mb-4">You haven't responded yet.</p>
          <button
            onClick={() => router.push(`/respond/${id}`)}
            className="btn-primary px-6 py-2">
            Write response
          </button>
        </div>
      )}

      {['AWAITING_ACCEPT', 'ACTIVE'].includes(question.status) && (
        <div className="card bg-green-50 border-green-200 text-center py-6">
          <div className="text-2xl mb-2">⚡</div>
          <h3 className="font-semibold text-green-800">Session in progress</h3>
          <p className="text-sm text-green-600 mt-1">Work is underway</p>
        </div>
      )}

      <button onClick={() => router.back()}
        className="text-sm text-gray-400 hover:text-gray-600 mt-4 block">
        ← Back to inbox
      </button>
    </div>
  )
}
