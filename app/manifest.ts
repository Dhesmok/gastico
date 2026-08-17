import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gastico · Cuentas Claras',
    short_name: 'Gastico',
    description:
      'Lleva el control de los gastos del mes con tu pareja, chateando. Cuéntale qué compraste o manda la foto de la factura y deja que arme el resumen.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#fbe9df',
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
