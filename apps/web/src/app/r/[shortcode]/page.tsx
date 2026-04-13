'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

export default function ShortlinkPage() {
  const { shortcode } = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const { data: link, isLoading } = useQuery({
    queryKey: ['shortlink', shortcode],
    queryFn: () => api.get(`/r/${shortcode}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (!link || !link.isActive) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🔗</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Link not found</h2>
        <p className="text-gray-500">This link may have expired or been disabled.</p>
        <Link href="/" className="btn-primary inline-block mt-4 px-6 py-2">Go to PopStack</Link>
      </div>
    </div>
  )

  const dev = link.developer
  const askUrl = isAuthenticated() && user?.role === 'USER'
    ? `/ask?devId=${dev.id}&linkId=${link.id}`
    : `/auth/signup?role=user&devId=${dev.id}&linkId=${link.id}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Dev card */}
        <div className="card mb-4 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center text-brand text-2xl font-bold mx-auto mb-3">
            {dev.profile?.avatarKey ? (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${dev.profile.avatarKey}`}
                alt={dev.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              dev.name?.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{dev.name}</h1>
          {dev.profile?.bio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dev.profile.bio}</p>
          )}
          {dev.avgRating && (
            <p className="text-sm text-amber-600 mt-1">★ {dev.avgRating.toFixed(1)}</p>
          )}
          {dev.profile?.techTags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {dev.profile.techTags.slice(0, 5).map((tag: string) => (
                <span key={tag} className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA card */}
        <div className="card bg-brand text-white text-center py-6">
          <h2 className="text-lg font-semibold mb-1">
            {link.customHeadline || `Get help from ${dev.name}`}
          </h2>
          <p className="text-sm opacity-90 mb-5">
            {link.requestType === 'WEBSITE_FIX' && 'Describe your website issue and get a free diagnosis'}
            {link.requestType === 'BUG_FIX' && 'Describe the bug and get it fixed fast'}
            {link.requestType === 'QUICK_QUESTION' && 'Ask your question and get a quick answer'}
          </p>
          <Link href={askUrl}
            className="bg-white text-brand font-semibold px-8 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity inline-block">
            {link.customCta || `Submit a request`}
          </Link>
          {!isAuthenticated() && (
            <p className="text-xs opacity-70 mt-3">
              Already have an account?{' '}
              <Link href={`/auth/login?redirect=/ask?devId=${dev.id}&linkId=${link.id}`}
                className="underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
