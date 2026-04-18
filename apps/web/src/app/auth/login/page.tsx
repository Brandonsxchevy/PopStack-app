'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { Suspense } from 'react'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const questionId = searchParams.get('questionId') || ''
  const role = searchParams.get('role') || ''
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.accessToken, res.data.user)
      const userRole = res.data.user.role
      if (userRole === 'ADMIN') {
        router.push('/admin')
      } else if (userRole === 'DEVELOPER') {
        router.push(questionId ? `/swipe?questionId=${questionId}` : '/swipe')
      } else {
        router.push(questionId ? `/ask?questionId=${questionId}` : '/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card shadow-sm">
      <h1 className="text-xl font-semibold mb-6">Welcome back</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input {...register('email')} type="email" className="input mt-1" placeholder="you@example.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input {...register('password')} type="password" className="input mt-1" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        No account?{' '}
        <Link href={`/auth/signup${role ? `?role=${role}` : ''}${questionId ? `${role ? '&' : '?'}questionId=${questionId}` : ''}`}
          className="text-brand font-medium">Sign up</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card shadow-sm p-8 text-center text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
