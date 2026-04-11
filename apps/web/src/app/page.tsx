import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-dark text-white p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-brand mb-4">PopStack</h1>
        <p className="text-2xl text-gray-300 mb-2">Pop problems. Fix fast.</p>
        <p className="text-gray-500 mb-12">Connect with expert developers to fix your tech issues.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/signup?role=user" className="btn-primary text-lg px-8 py-3 rounded-xl">
            I have a problem
          </Link>
          <Link href="/auth/signup?role=developer" className="px-8 py-3 rounded-xl border border-brand text-brand font-medium hover:bg-brand-light hover:text-brand-dark transition-colors text-lg">
            I fix problems
          </Link>
        </div>
        <p className="mt-8 text-gray-600 text-sm font-mono">pop() problems. Fix fast. Earn real stacks.</p>
      </div>
    </main>
  )
}
