'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface RatingModalProps {
  sessionId: string
  rateeType: 'developer' | 'user'
  rateeName: string
  onClose: () => void
}

export default function RatingModal({ sessionId, rateeType, rateeName, onClose }: RatingModalProps) {
  const [overall, setOverall] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = useMutation({
    mutationFn: () => api.post(`/sessions/${sessionId}/rating`, { overall, comment }),
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(onClose, 2000)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit rating'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="font-semibold text-gray-900 mb-1">Thanks for the feedback!</h3>
            <p className="text-sm text-gray-500">Your rating helps the community.</p>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 mb-1">Rate your experience</h3>
            <p className="text-sm text-gray-500 mb-5">
              How was your session with <span className="font-medium text-gray-700">{rateeName}</span>?
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setOverall(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition-transform hover:scale-110">
                  <span className={(hovered || overall) >= star ? 'text-amber-400' : 'text-gray-200'}>
                    ★
                  </span>
                </button>
              ))}
            </div>

            {overall > 0 && (
              <p className="text-center text-sm text-gray-500 mb-4">
                {overall === 1 && 'Poor experience'}
                {overall === 2 && 'Below average'}
                {overall === 3 && 'Average'}
                {overall === 4 && 'Good experience'}
                {overall === 5 && 'Excellent! 🚀'}
              </p>
            )}

            {/* Comment */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="input min-h-[80px] resize-none mb-4"
              placeholder={rateeType === 'developer'
                ? 'What did they do well? Any suggestions?'
                : 'How was working with this client?'}
              maxLength={300}
            />

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                Skip
              </button>
              <button
                onClick={() => submit.mutate()}
                disabled={overall === 0 || submit.isPending}
                className="flex-1 btn-primary py-2.5 disabled:opacity-50">
                {submit.isPending ? 'Submitting...' : 'Submit rating'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
