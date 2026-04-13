'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function PublicDevProfilePage() {
  const { username } = useParams()
  const router = useRouter()

  const { data: dev, isLoading } = useQuery({
    queryKey: ['dev-profile', username],
    queryFn: () => api.get(`/profiles/${username}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (!dev) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Developer not found</div>
    </div>
  )

  const profile = dev.profile

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-brand font-bold text-lg">PopStack</Link>
        <button onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Back
        </button>
      </nav>

      <div className="max-w-2xl mx-auto p-4 pt-8">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center text-brand text-2xl font-bold shrink-0">
              {dev.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{dev.name}</h1>
              {profile?.location && (
                <p className="text-sm text-gray-500 mt-0.5">📍 {profile.location}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {dev.avgRating && (
                  <span className="text-sm text-amber-600 font-medium">
                    ★ {dev.avgRating.toFixed(1)}
                    <span className="text-gray-400 font-normal"> ({dev.ratingCount} reviews)</span>
                  </span>
                )}
                {profile?.yearsExperience && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {profile.yearsExperience} yrs exp
                  </span>
                )}
                {profile?.hourlyRateHint && (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    ~${profile.hourlyRateHint}/hr
                  </span>
                )}
                {dev.badges?.includes('top_stacker') && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    🏆 Top Stacker
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-gray-700 mt-4 leading-relaxed">{profile.bio}</p>
          )}

          {profile?.websiteUrl && (
            <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand underline mt-2 block">
              {profile.websiteUrl}
            </a>
          )}
        </div>

        {/* Tech tags */}
        {profile?.techTags?.length > 0 && (
          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Skills & platforms</h2>
            <div className="flex flex-wrap gap-2">
              {profile.techTags.map((tag: string) => (
                <span key={tag}
                  className="text-xs bg-brand-light text-brand px-2 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile?.portfolioLinks?.filter(Boolean).length > 0 && (
          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Portfolio</h2>
            <div className="space-y-2">
              {profile.portfolioLinks.filter(Boolean).map((link: string, i: number) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand hover:underline truncate">
                  🔗 {link}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {dev.ratingsReceived?.length > 0 && (
          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Reviews ({dev.ratingsReceived.length})
            </h2>
            <div className="space-y-3">
              {dev.ratingsReceived.map((r: any) => (
                <div key={r.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500 text-sm">{'★'.repeat(r.overall)}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card bg-brand text-white text-center py-6">
          <h3 className="font-semibold text-lg mb-1">Need help with your website?</h3>
          <p className="text-brand-light text-sm mb-4 opacity-90">
            {dev.name} can diagnose and fix your issue fast.
          </p>
          <Link href={`/auth/signup?role=user`}
            className="bg-white text-brand font-medium px-6 py-2 rounded-xl text-sm hover:bg-brand-light transition-colors inline-block">
            Get help from {dev.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
