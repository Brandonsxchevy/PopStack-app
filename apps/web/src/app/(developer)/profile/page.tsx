'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

const TECH_SUGGESTIONS = [
  'WordPress', 'Shopify', 'Wix', 'Squarespace', 'Webflow',
  'React', 'Next.js', 'Vue', 'JavaScript', 'TypeScript',
  'PHP', 'Python', 'Node.js', 'CSS', 'Tailwind',
  'MySQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Cloudflare',
]

export default function DeveloperProfilePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const [bio, setBio] = useState('')
  const [techTags, setTechTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [hourlyRateHint, setHourlyRateHint] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [location, setLocation] = useState('')
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([''])
  const [retainerEnabled, setRetainerEnabled] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get(`/profiles/${user?.name}`).then(r => r.data),
    enabled: !!user?.name,
  })

  useEffect(() => {
    if (profile?.profile) {
      const p = profile.profile
      setBio(p.bio || '')
      setTechTags(p.techTags || [])
      setYearsExperience(p.yearsExperience?.toString() || '')
      setHourlyRateHint(p.hourlyRateHint?.toString() || '')
      setWebsiteUrl(p.websiteUrl || '')
      setLocation(p.location || '')
      setPortfolioLinks(p.portfolioLinks?.length ? p.portfolioLinks : [''])
      setRetainerEnabled(p.retainerEnabled || false)
    }
  }, [profile])

  const save = useMutation({
    mutationFn: () => api.patch('/profiles/me', {
      bio,
      techTags,
      yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
      hourlyRateHint: hourlyRateHint ? parseInt(hourlyRateHint) : null,
      websiteUrl,
      location,
      portfolioLinks: portfolioLinks.filter(Boolean),
      retainerEnabled,
    }),
    onSuccess: () => {
      toast.success('Profile updated!')
      qc.invalidateQueries({ queryKey: ['my-profile'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  })

  const addTag = (tag: string) => {
    if (tag && !techTags.includes(tag)) {
      setTechTags([...techTags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTechTags(techTags.filter(t => t !== tag))

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading profile...</div>

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visible to users at{' '}
            <a href={`/dev/${user?.name}`} target="_blank"
              className="text-brand underline">
              app.popstack.dev/dev/{user?.name}
            </a>
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="space-y-5">
        {/* Bio */}
        <div className="card">
          <label className="text-sm font-medium text-gray-700 block mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="input min-h-[80px] resize-none"
            placeholder="Tell users what you're good at and how you work..."
            maxLength={300}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/300</p>
        </div>

        {/* Location + Website */}
        <div className="card space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="input" placeholder="e.g. Los Angeles, CA" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Website</label>
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              className="input" placeholder="https://yoursite.com" />
          </div>
        </div>

        {/* Experience + Rate */}
        <div className="card grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Years experience</label>
            <input value={yearsExperience} onChange={e => setYearsExperience(e.target.value)}
              type="number" min="0" max="50" className="input" placeholder="e.g. 5" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Hourly rate hint ($)</label>
            <input value={hourlyRateHint} onChange={e => setHourlyRateHint(e.target.value)}
              type="number" min="0" className="input" placeholder="e.g. 75" />
          </div>
        </div>

        {/* Tech tags */}
        <div className="card">
          <label className="text-sm font-medium text-gray-700 block mb-2">Skills & platforms</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {techTags.map(tag => (
              <span key={tag}
                className="flex items-center gap-1 text-xs bg-brand-light text-brand px-2 py-1 rounded-full">
                {tag}
                <button onClick={() => removeTag(tag)} className="text-brand/60 hover:text-brand ml-0.5">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
              className="input flex-1"
              placeholder="Add a skill or platform..."
            />
            <button onClick={() => addTag(tagInput)}
              className="btn-secondary px-3 py-2 text-sm">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TECH_SUGGESTIONS.filter(s => !techTags.includes(s)).slice(0, 10).map(s => (
              <button key={s} onClick={() => addTag(s)}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-brand-light hover:text-brand transition-colors">
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio links */}
        <div className="card">
          <label className="text-sm font-medium text-gray-700 block mb-2">Portfolio links</label>
          <div className="space-y-2">
            {portfolioLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={link}
                  onChange={e => {
                    const updated = [...portfolioLinks]
                    updated[i] = e.target.value
                    setPortfolioLinks(updated)
                  }}
                  className="input flex-1"
                  placeholder="https://github.com/yourproject"
                />
                {portfolioLinks.length > 1 && (
                  <button onClick={() => setPortfolioLinks(portfolioLinks.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-sm px-2">×</button>
                )}
              </div>
            ))}
          </div>
          {portfolioLinks.length < 5 && (
            <button onClick={() => setPortfolioLinks([...portfolioLinks, ''])}
              className="text-sm text-brand hover:underline mt-2">
              + Add another link
            </button>
          )}
        </div>

        {/* Retainer */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable retainer subscriptions</p>
              <p className="text-xs text-gray-500 mt-0.5">Let users subscribe to priority access at $300/mo</p>
            </div>
            <button
              onClick={() => setRetainerEnabled(!retainerEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${retainerEnabled ? 'bg-brand' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${retainerEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Ratings */}
        {profile?.ratingsReceived?.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Ratings ({profile.ratingsReceived.length})
              {profile.avgRating && (
                <span className="text-amber-500 ml-2">★ {profile.avgRating.toFixed(1)}</span>
              )}
            </h3>
            <div className="space-y-3">
              {profile.ratingsReceived.slice(0, 5).map((r: any) => (
                <div key={r.id} className="text-sm border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500">{'★'.repeat(r.overall)}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && <p className="text-gray-600 text-xs">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-primary w-full py-3 text-base disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save profile'}
        </button>

        <button
          onClick={() => router.push(`/dev/${user?.name}`)}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Preview public profile →
        </button>
      </div>
    </div>
  )
}
