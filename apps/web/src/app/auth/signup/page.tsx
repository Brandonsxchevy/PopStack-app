'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

function SignupForm() {
  const params = useSearchParams()
  const router = useRouter()
  const role = params.get('role') === 'developer' ? 'DEVELOPER' : 'USER'
  const questionId = params.get('questionId') || ''
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await api.post('/auth/register', { ...data, role })
      toast.success('Account created! Please log in.')
      const loginUrl = `/auth/login?role=${params.get('role') || 'user'}${questionId ? `&questionId=${questionId}` : ''}`
      router.push(loginUrl)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card shadow-sm">
      <h1 className="text-xl font-semibold mb-1">
        {role === 'DEVELOPER' ? 'Join as a Stacker' : 'Get help as a Popper'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {role === 'DEVELOPER' ? 'Fix fast. Earn real stacks.' : 'Pop problems. Fix fast.'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input {...register('name')} className="input mt-1" placeholder="Your name" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input {...register('email')} type="email" className="input mt-1" placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input {...register('password')} type="password" className="input mt-1" placeholder="Min 8 characters" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        Already have an account?{' '}
        <Link href={`/auth/login${questionId ? `?questionId=${questionId}&role=${params.get('role') || 'user'}` : ''}`}
          className="text-brand font-medium">Log in</Link>
      </p>
      <p className="text-sm text-center text-gray-400 mt-2">
        {role === 'DEVELOPER' ? (
          <Link href={`/auth/signup?role=user${questionId ? `&questionId=${questionId}` : ''}`} className="hover:underline">I need help instead →</Link>
        ) : (
          <Link href={`/auth/signup?role=developer${questionId ? `&questionId=${questionId}` : ''}`} className="hover:underline">I fix problems →</Link>
        )}
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="card shadow-sm p-8 text-center text-gray-400">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
