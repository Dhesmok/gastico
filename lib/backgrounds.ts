export type ChatBackground = {
  id: string
  label: string
  // estilo aplicado al contenedor del chat
  style: React.CSSProperties
  // muestra para el selector
  swatch: string
}

// ---------------------------------------------------------------------------
// Fondos del chat, todos hechos con CSS a partir de la paleta.
//
// Antes eran imágenes PNG de tonos cálidos: pesaban en el celular, no se
// adaptaban al modo oscuro y chocaban con los colores nuevos. Al derivarlos de
// las variables de tema, cada fondo se ve bien de día y de noche sin descargar
// nada. Se conservan los mismos identificadores para que a nadie se le pierda
// el fondo que ya tenía escogido.
// ---------------------------------------------------------------------------

/** Dos luces difuminadas en las esquinas: la base de casi todos. */
function glow(a: string, b: string, intensidadA = 18, intensidadB = 16): React.CSSProperties {
  return {
    backgroundColor: 'var(--background)',
    backgroundImage: [
      `radial-gradient(120% 90% at 8% 0%, color-mix(in oklch, ${a} ${intensidadA}%, transparent), transparent 60%)`,
      `radial-gradient(110% 80% at 100% 100%, color-mix(in oklch, ${b} ${intensidadB}%, transparent), transparent 60%)`,
    ].join(', '),
    backgroundAttachment: 'local',
  }
}

export const CHAT_BACKGROUNDS: ChatBackground[] = [
  {
    id: 'cozy',
    label: 'Acogedor',
    style: glow('var(--primary)', 'var(--accent)'),
    swatch:
      'radial-gradient(circle at 25% 20%, color-mix(in oklch, var(--primary) 45%, transparent), transparent 65%), radial-gradient(circle at 80% 85%, color-mix(in oklch, var(--accent) 55%, transparent), var(--background))',
  },
  {
    id: 'mint',
    label: 'Menta',
    style: glow('var(--accent)', 'var(--chart-5)', 22, 16),
    swatch:
      'linear-gradient(150deg, color-mix(in oklch, var(--accent) 55%, transparent), color-mix(in oklch, var(--chart-5) 40%, transparent), var(--background))',
  },
  {
    id: 'sunset',
    label: 'Atardecer',
    style: glow('var(--chart-4)', 'var(--chart-3)', 20, 20),
    swatch:
      'linear-gradient(150deg, color-mix(in oklch, var(--chart-4) 55%, transparent), color-mix(in oklch, var(--chart-3) 55%, transparent), var(--background))',
  },
  {
    id: 'bubbles',
    label: 'Puntitos',
    style: {
      backgroundColor: 'var(--background)',
      backgroundImage: `radial-gradient(color-mix(in oklch, var(--primary) 20%, transparent) 1.5px, transparent 1.5px)`,
      backgroundSize: '18px 18px',
      backgroundAttachment: 'local',
    },
    swatch:
      'radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--primary) 50%, transparent) 22%, transparent 23%), radial-gradient(circle at 70% 70%, color-mix(in oklch, var(--primary) 50%, transparent) 22%, var(--background) 23%)',
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
