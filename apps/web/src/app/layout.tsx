import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Providers } from '@/components/ui/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PopStack — Pop problems. Fix fast.',
  description: 'Connect with expert developers to fix your tech issues fast.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="bottom-center" offset={80} richColors />
        </Providers>
      </body>
    </html>
  )
}
