'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const MAX_CHARS = 500

const EFFORT_OPTIONS = [
  { value: 'quick',    label: 'Quick fix',     desc: '< 30 min' },
  { value: 'medium',  label: 'Medium effort',  desc: '1–2 hours' },
  { value: 'complex', label: 'Complex',        desc: 'Half day+' },
]

const OFFER_OPTIONS = [
  { cents: 750,  label: '$7.50',  desc: 'Quick follow-up' },
  { cents: 3000, label: '$30',    desc: '15 min session' },
  { cents: 7500, label: '$75+',   desc: 'Full solution' },
]

export default function RespondPage() {
  const { id } = useParams()
  const router = useRouter()

  const [textContent, setTextContent] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [effortEstimate, setEffortEstimate] = useState('quick')
  const [offerPriceCents, setOfferPriceCents] = useState(3000)
  const [offerTimeMinutes, setOfferTimeMinutes] = useState(15)

  const { data: question, isLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.get(`/questions/${id}`).then(r => r.data),
  })

  const submit = useMutation({
    mutationFn: () => {
      const blocks: any[] = []
      if (textContent.trim()) blocks.push({ type: 'text', content: textContent.trim() })
      if (showCode && codeContent.trim()) blocks.push({ type: 'code', content: codeContent.trim() })

      return api.post(`/questions/${id}/response`, {
        blocks,
        effortEstimate,
        offerPriceCents,
        offerTimeMinutes,
      })
    },
    onSuccess: () => {
      toast.success('Response sent!')
      router.push('/inbox')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send response')
    },
  })

  const charsUsed = textContent.length
  const charsLeft = MAX_CHARS - charsUsed
  const isOverLimit = charsLeft < 0

  if (isLoading) return (
    <div className="text-center py-20 text-gray-400">Loading question...</div>
  )

  if (!question) return (
    <div className="text-center py-20 text-gray-500">Question not found</div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      {/* Question summary */}
      <div className="card mb-6 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          {question.fingerprint?.platform && question.fingerprint.platform !== 'UNKNOWN' && (
            <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full font-medium">
              {question.fingerprint.platform}
            </span>
          )}
          <span className="text-xs text-gray-400">
            Clarity {question.clarityScore?.toFixed(1)}/10
          </span>
        </div>
        <h2 className="font-semibold text-gray-900">{question.title}</h2>
        {question.description && (
          <p className="text-sm text-gray-600 mt-1">{question.description}</p>
        )}
        {question.url && (
          <a href={question.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand underline mt-1 block truncate">
            {question.url}
          </a>
        )}
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Write your response</h1>
      <p className="text-sm text-gray-500 mb-5">
        Give a free diagnosis — max 500 chars. This unlocks the paid session.
      </p>

      {/* Text block */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Your diagnosis</label>
          <span className={`text-xs font-mono ${isOverLimit ? 'text-red-500' : charsLeft < 100 ? 'text-amber-500' : 'text-gray-400'}`}>
            {charsLeft} left
          </span>
        </div>
        <textarea
          value={textContent}
          onChange={e => setTextContent(e.target.value)}
          className={`input min-h-[120px] resize-none font-mono text-sm ${isOverLimit ? 'border-red-400 focus:ring-red-300' : ''}`}
          placeholder="Explain what you think is wrong and how you'd fix it..."
        />
      </div>

      {/* Code block toggle */}
      <div className="mb-5">
        {!showCode ? (
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="text-sm text-brand hover:underline">
            + Add code snippet
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Code snippet</label>
              <button onClick={() => { setShowCode(false); setCodeContent('') }}
                className="text-xs text-gray-400 hover:text-red-500">Remove</button>
            </div>
            <textarea
              value={codeContent}
              onChange={e => setCodeContent(e.target.value)}
              className="input min-h-[100px] resize-none font-mono text-xs bg-gray-900 text-green-400 border-gray-700"
              placeholder="// paste relevant code here"
            />
          </div>
        )}
      </div>

      {/* Effort estimate */}
      <div className="mb-5">
        <label className="text-sm font-medium text-gray-700 block mb-2">Effort estimate</label>
        <div className="grid grid-cols-3 gap-2">
          {EFFORT_OPTIONS.map(o => (
            <button key={o.value} type="button"
              onClick={() => setEffortEstimate(o.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                effortEstimate === o.value
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`text-sm font-semibold ${effortEstimate === o.value ? 'text-brand' : 'text-gray-800'}`}>
                {o.label}
              </div>
              <div className={`text-xs mt-0.5 ${effortEstimate === o.value ? 'text-brand/70' : 'text-gray-500'}`}>
                {o.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Offer price */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 block mb-2">Session offer</label>
        <div className="grid grid-cols-3 gap-2">
          {OFFER_OPTIONS.map(o => (
            <button key={o.cents} type="button"
              onClick={() => setOfferPriceCents(o.cents)}
              className={`p-3 rounded-xl border text-left transition-all ${
                offerPriceCents === o.cents
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`text-sm font-bold ${offerPriceCents === o.cents ? 'text-brand' : 'text-gray-800'}`}>
                {o.label}
              </div>
              <div className={`text-xs mt-0.5 ${offerPriceCents === o.cents ? 'text-brand/70' : 'text-gray-500'}`}>
                {o.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending || !textContent.trim() || isOverLimit}
        className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {submit.isPending ? 'Sending...' : 'Send response →'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        The user will see your diagnosis for free. Payment is only requested if they want to continue.
      </p>
    </div>
  )
}
