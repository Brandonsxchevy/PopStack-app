'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Suspense } from 'react'

const schema = z.object({
  title: z.string().min(5, 'Please describe the problem in at least 5 characters'),
  description: z.string().optional(),
  url: z.string().optional(),
  budgetTier: z.enum(['FIVE', 'TWENTY', 'FIFTY_PLUS']),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']),
})

type FormData = z.infer<typeof schema>

const BUDGET_OPTIONS = [
  { value: 'FIVE',       label: 'Quick question',    price: '$7.50',  desc: 'Simple fix or answer' },
  { value: 'TWENTY',     label: 'Real fix',           price: '$30',    desc: '15-minute session' },
  { value: 'FIFTY_PLUS', label: 'Bigger job',         price: '$75+',   desc: 'Contract work' },
]

const URGENCY_OPTIONS = [
  { value: 'LOW',    label: 'Flexible',  desc: 'No rush' },
  { value: 'MEDIUM', label: 'Soon',      desc: 'Within a day' },
  { value: 'HIGH',   label: 'Urgent',    desc: 'Customers affected' },
]

function AskForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const devId = searchParams.get('devId')
  const linkId = searchParams.get('linkId')

  const [loading, setLoading] = useState(false)
  const [screenshotKeys, setScreenshotKeys] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { budgetTier: 'TWENTY', urgency: 'MEDIUM' },
  })

  const budget = watch('budgetTier')
  const urgency = watch('urgency')

  const handleScreenshotUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Screenshot must be under 5MB'); return }
    setUploading(true)
    try {
      const { data } = await api.get('/uploads/screenshot')
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      setScreenshotKeys(prev => [...prev, data.key])
      toast.success('Screenshot added')
    } catch {
      toast.error('Upload failed — try again')
    } finally {
      setUploading(false)
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!data.url && screenshotKeys.length === 0) {
      toast.error('Please add a link or screenshot so a Stacker can help you faster')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/questions', {
        ...data,
        screenshotKeys,
        stackTags: [],
        preSelectedDevId: devId || undefined,
        linkId: linkId || undefined,
      })
      toast.success('Request submitted! Stackers will respond soon.')
      router.push(`/question/${res.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Direct link banner */}
      {devId && (
        <div className="card bg-brand-light border-brand/20 mb-5">
          <p className="text-sm text-brand font-medium">
            🎯 This request will go directly to your developer
          </p>
        </div>
      )}

      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Submit a request</h1>
      <p className="text-gray-500 mb-6 text-sm">Show us what's going wrong — a Stacker will pop it fast.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            What's the problem?
          </label>
          <input {...register('title')} className="input"
            placeholder="e.g. Menu text looks jumbled on my phone" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        {/* URL + Screenshot */}
        <div className="card bg-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Show us what you're seeing <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-gray-500">Add a link or screenshot (at least one required)</p>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Your website link</label>
            <input
              {...register('url')}
              className="input"
              placeholder="https://yoursite.com/page-with-problem"
              onChange={e => { setUrlValue(e.target.value); setValue('url', e.target.value) }}
            />
            {urlValue && (
              <p className="text-xs text-brand mt-1">✓ We'll auto-detect your platform</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Screenshot of the issue</label>
            <label className={`flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer text-sm transition-colors
              ${screenshotKeys.length > 0 ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:border-brand hover:text-brand'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} disabled={uploading} />
              {uploading ? '⏳ Uploading...' :
               screenshotKeys.length > 0 ? `✓ ${screenshotKeys.length} screenshot${screenshotKeys.length > 1 ? 's' : ''} added` :
               '+ Upload a screenshot'}
            </label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Tell us more <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea {...register('description')} className="input min-h-[80px] resize-none"
            placeholder="Which pages, which device, when did it start?" />
        </div>

        {/* Budget */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Budget</label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setValue('budgetTier', o.value as any)}
                className={`p-3 rounded-xl border text-left transition-all ${budget === o.value
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`text-sm font-semibold ${budget === o.value ? 'text-brand' : 'text-gray-800'}`}>
                  {o.price}
                </div>
                <div className={`text-xs mt-0.5 ${budget === o.value ? 'text-brand/70' : 'text-gray-500'}`}>
                  {o.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">How urgent?</label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setValue('urgency', o.value as any)}
                className={`p-3 rounded-xl border text-left transition-all ${urgency === o.value
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`text-sm font-semibold ${urgency === o.value ? 'text-brand' : 'text-gray-800'}`}>
                  {o.label}
                </div>
                <div className={`text-xs mt-0.5 ${urgency === o.value ? 'text-brand/70' : 'text-gray-500'}`}>
                  {o.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || uploading}
          className="btn-primary w-full py-3 text-base disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit request →'}
        </button>
      </form>
    </div>
  )
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
      <AskForm />
    </Suspense>
  )
}
