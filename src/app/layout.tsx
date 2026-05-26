import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: 'Mystic Synchronicity | Cosmic Tarot',
  description: 'Discover your cosmic path through AI-powered tarot readings',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)'
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)'
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml'
      }
    ],
    apple: '/apple-icon.png'
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0a14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

/** Groq 프리미엄 생성 등 Server Action 상한 (Vercel 기본 10s 초과 방지) */
export const maxDuration = 60

export default function RootLayout ({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className='dark bg-background'>
      <body
        className={`${inter.variable} ${playfair.variable} min-h-dvh font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
