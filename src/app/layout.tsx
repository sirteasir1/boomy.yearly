import { PostHogProvider } from '@/components/PostHogProvider'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title:       'Boomly — AI Operating System for Ambitious People',
  description: 'The AI-native workspace that plans your day, learns your patterns, and thinks alongside you. All features free during Early Access.',
  icons: {
    icon: [
      { url:'/favicon.svg',  type:'image/svg+xml' },
      { url:'/logo-symbol.jpg', type:'image/jpeg' },
    ],
    apple: '/logo-symbol.jpg',
  },
  openGraph: {
    title:       'Boomly — Your AI Operating System',
    description: 'Replace 4 productivity apps with one intelligent workspace.',
    images:      ['/logo-wordmark.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <PostHogProvider>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
      </PostHogProvider>
    </html>
  )
}
