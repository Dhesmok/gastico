export type ChatBackground = {
  id: string
  label: string
  // estilo aplicado al contenedor del chat
  style: React.CSSProperties
  // muestra para el selector
  swatch: string
}

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  {
    id: 'cozy',
    label: 'Acogedor',
    style: {
      backgroundImage: 'url(/bg-cozy.png)',
      backgroundSize: '420px',
      backgroundColor: 'var(--background)',
    },
    swatch: 'url(/bg-cozy.png)',
  },
  {
    id: 'mint',
    label: 'Menta',
    style: {
      backgroundImage: 'url(/bg-mint.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    swatch: 'url(/bg-mint.png)',
  },
  {
    id: 'sunset',
    label: 'Atardecer',
    style: {
      backgroundImage: 'url(/bg-sunset.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    swatch: 'url(/bg-sunset.png)',
  },
  {
    id: 'bubbles',
    label: 'Burbujas',
    style: {
      backgroundColor: 'var(--background)',
      backgroundImage:
        'radial-gradient(closest-side, color-mix(in oklch, var(--primary) 22%, transparent), transparent 100%), radial-gradient(closest-side, color-mix(in oklch, var(--accent) 26%, transparent), transparent 100%)',
      backgroundSize: '340px 340px, 300px 300px',
      backgroundPosition: '-60px -40px, right 20px bottom 60px',
      backgroundRepeat: 'no-repeat, no-repeat',
    },
    swatch:
      'radial-gradient(circle at 30% 30%, var(--primary), transparent 60%), radial-gradient(circle at 70% 70%, var(--accent), var(--background))',
  },
  {
    id: 'plain',
    label: 'Liso',
    style: { backgroundColor: 'var(--muted)' },
    swatch: 'var(--muted)',
  },
]

export function getBackground(id: string): ChatBackground {
  return CHAT_BACKGROUNDS.find((b) => b.id === id) ?? CHAT_BACKGROUNDS[0]
}
