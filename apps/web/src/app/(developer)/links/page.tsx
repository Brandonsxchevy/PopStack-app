'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

const REQUEST_TYPES = [
  { value: 'WEBSITE_FIX', label: 'Website fix' },
  { value: 'BUG_FIX', label: 'Bug fix' },
  { value: 'QUICK_QUESTION', label: 'Quick question' },
]

export default function LinksPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [requestType, setRequestType] = useState('WEBSITE_FIX')
  const [customHeadline, setCustomHeadline] = useState('')
  const [customCta, setCustomCta] = useState('')
  const [requiresUrl, setRequiresUrl] = useState(true)
  const [requiresScreenshot, setRequiresScreenshot] = useState(false)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['dev-links'],
    queryFn: () => api.get('/dev-links').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/dev-links', {
      label,
      requestType,
      customHeadline: customHeadline || null,
      customCta: customCta || null,
      requiresUrl,
      requiresScreenshot,
      type: 'GENERAL',
      isActive: true,
    }),
    onSuccess: () => {
      toast.success('Link created!')
      setCreating(false)
      setLabel('')
      setCustomHeadline('')
      setCustomCta('')
      qc.invalidateQueries({ queryKey: ['dev-links'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create link'),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/dev-links/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dev-links'] }),
  })

  const copyLink = (shortcode: string) => {
    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/r/${shortcode}`)
    toast.success('Link copied!')
  }

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading links...</div>

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Direct links</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Share these links to let clients book you directly
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="btn-primary px-4 py-2 text-sm">
          + New link
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card mb-6 border-brand/30">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Create new link</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                className="input" placeholder="e.g. WordPress fix, Quick question" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Request type</label>
              <div className="grid grid-cols-3 gap-2">
                {REQUEST_TYPES.map(rt => (
                  <button key={rt.value} type="button"
                    onClick={() => setRequestType(rt.value)}
                    className={`p-2 rounded-xl border text-xs text-left transition-all ${
                      requestType === rt.value
                        ? 'border-brand bg-brand-light text-brand font-medium'
                        : 'border-gray-200 text-gray-600'}`}>
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Custom headline <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={customHeadline} onChange={e => setCustomHeadline(e.target.value)}
                className="input" placeholder="e.g. Get your WordPress site fixed fast" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Custom CTA <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={customCta} onChange={e => setCustomCta(e.target.value)}
                className="input" placeholder="e.g. Book a fix" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={requiresUrl}
                  onChange={e => setRequiresUrl(e.target.checked)}
                  className="rounded border-gray-300" />
                Require website URL
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={requiresScreenshot}
                  onChange={e => setRequiresScreenshot(e.target.checked)}
                  className="rounded border-gray-300" />
                Require screenshot
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => create.mutate()}
              disabled={create.isPending || !label}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {create.isPending ? 'Creating...' : 'Create link'}
            </button>
            <button onClick={() => setCreating(false)}
              className="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* General profile link */}
      <div className="card mb-4 bg-brand-light border-brand/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-brand">Your profile link</span>
              <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded">Always active</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Anyone can visit your public profile and book you
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded border border-brand/20 text-gray-700">
              app.popstack.dev/dev/{user?.name}
            </code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/dev/${user?.name}`)
              toast.success('Profile link copied!')
            }}
            className="text-sm text-brand font-medium hover:underline shrink-0">
            Copy
          </button>
        </div>
      </div>

      {/* Links list */}
      {links.length === 0 && !creating ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-gray-500 mb-2">No direct links yet</p>
          <p className="text-xs text-gray-400">
            Create a link to share with specific clients or on social media
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => (
            <div key={link.id} className={`card ${!link.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {link.label || 'General link'}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {link.requestType?.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    {!link.isActive && (
                      <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-gray-500">
                    app.popstack.dev/r/{link.shortcode}
                  </code>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{link.useCount} uses</span>
                    {link.maxUses && <span>/ {link.maxUses} max</span>}
                    {link.requiresUrl && <span>🔗 URL required</span>}
                    {link.requiresScreenshot && <span>📸 Screenshot required</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyLink(link.shortcode)}
                    className="text-xs text-brand font-medium hover:underline">
                    Copy
                  </button>
                  <button
                    onClick={() => toggle.mutate({ id: link.id, isActive: !link.isActive })}
                    className="text-xs text-gray-400 hover:text-gray-600">
                    {link.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
