import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Gastico · Cuentas Claras',
  description:
    'Lleva el control de los gastos del mes con tu pareja, chateando. Cuéntale qué compraste o manda la foto de la factura y deja que arme el resumen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gastico',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbe9df',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunito.variable} bg-background`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
