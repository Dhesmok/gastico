// ---------------------------------------------------------------------------
// Tipos y datos de ejemplo para "Cuentas Claras"
// NOTA: Todo esto es data simulada en memoria para el diseño. Cuando conectes
// el backend (Supabase / IA) reemplaza estas fuentes por datos reales.
// ---------------------------------------------------------------------------

export type CategoryId =
  | 'mercado'
  | 'lujos'
  | 'calle'
  | 'transporte'
  | 'servicios'
  | 'salud'
  | 'otros'

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string // css var reference
}

export const CATEGORIES: Record<CategoryId, Category> = {
  mercado: { id: 'mercado', label: 'Mercado', emoji: '🛒', color: 'var(--chart-1)' },
  lujos: { id: 'lujos', label: 'Lujos', emoji: '✨', color: 'var(--chart-4)' },
  calle: { id: 'calle', label: 'Antojos / Calle', emoji: '🌮', color: 'var(--chart-3)' },
  transporte: { id: 'transporte', label: 'Transporte', emoji: '🚕', color: 'var(--chart-2)' },
  servicios: { id: 'servicios', label: 'Servicios', emoji: '🧾', color: 'var(--chart-5)' },
  salud: { id: 'salud', label: 'Salud', emoji: '💊', color: 'var(--accent)' },
  otros: { id: 'otros', label: 'Otros', emoji: '📦', color: 'var(--muted-foreground)' },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

export type Author = 'me' | 'partner'

export type Expense = {
  id: string
  amount: number
  category: CategoryId
  note: string
  author: Author
  date: string // ISO
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  author: Author
  text: string
  createdAt: number
  // datos que la "IA" extrajo de este mensaje
  expense?: Expense
  hasImage?: boolean
}

export type People = {
  me: { name: string; initials: string; color: string }
  partner: { name: string; initials: string; color: string }
}

export const PEOPLE: People = {
  me: { name: 'Sofía', initials: 'S', color: 'var(--primary)' },
  partner: { name: 'Andrés', initials: 'A', color: 'var(--accent)' },
}

// ---- Configuración simulada -----------------------------------------------

export type Settings = {
  monthlyIncome: number // nómina combinada del mes
  spendingCap: number // tope de gasto que dispara alertas
  currency: 'COP'
  chatBackground: string
}

export const DEFAULT_SETTINGS: Settings = {
  monthlyIncome: 6800000,
  spendingCap: 5200000,
  currency: 'COP',
  chatBackground: 'cozy',
}

// ---- Formato de moneda (COP) ----------------------------------------------

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number): string {
  return copFormatter.format(Math.round(value))
}

export function formatCompactCOP(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value}`
}

// ---- Datos de ejemplo (mes actual) ----------------------------------------

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

let counter = 0
const uid = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`

export const SAMPLE_EXPENSES: Expense[] = [
  { id: uid('e'), amount: 320000, category: 'mercado', note: 'Mercado de la quincena en el D1', author: 'me', date: iso(1) },
  { id: uid('e'), amount: 48000, category: 'calle', note: 'Almuerzo antojado con arepa e‑verything', author: 'partner', date: iso(1) },
  { id: uid('e'), amount: 180000, category: 'lujos', note: 'Cena de aniversario 🥂', author: 'me', date: iso(2) },
  { id: uid('e'), amount: 26000, category: 'transporte', note: 'Uber a la casa de la mamá', author: 'partner', date: iso(3) },
  { id: uid('e'), amount: 145000, category: 'servicios', note: 'Recibo de la luz', author: 'me', date: iso(4) },
  { id: uid('e'), amount: 62000, category: 'salud', note: 'Vitaminas y algo de la farmacia', author: 'partner', date: iso(5) },
  { id: uid('e'), amount: 95000, category: 'mercado', note: 'Frutas y verduras de la plaza', author: 'me', date: iso(6) },
  { id: uid('e'), amount: 220000, category: 'lujos', note: 'Camisa nueva (estaba en descuento, lo juro)', author: 'partner', date: iso(8) },
  { id: uid('e'), amount: 38000, category: 'calle', note: 'Helados y postre en el centro comercial', author: 'me', date: iso(9) },
  { id: uid('e'), amount: 210000, category: 'servicios', note: 'Internet + plan de celular', author: 'partner', date: iso(11) },
]

export function makeStarterMessages(): Message[] {
  return [
    {
      id: uid('m'),
      role: 'assistant',
      author: 'me',
      text: '¡Hola, par de tortolitos! 💸 Soy Cuenti, su contador de bolsillo. Cuéntenme qué compraron hoy (ej: "mercado 120mil" o "me di un lujo, cine 45k") o mándenme la foto de una factura y yo la voy anotando en el resumen del mes.',
      createdAt: Date.now() - 60000,
    },
  ]
}

// ---- "Cerebro" simulado: interpreta el texto del usuario -------------------

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  mercado: ['mercado', 'super', 'supermercado', 'd1', 'ara', 'exito', 'olimpica', 'plaza', 'fruver', 'verdura', 'comida casa', 'despensa'],
  lujos: ['lujo', 'lujos', 'ropa', 'zapatos', 'camisa', 'cena', 'restaurante', 'aniversario', 'regalo', 'spa', 'gym', 'concierto', 'viaje', 'joya', 'perfume'],
  calle: ['calle', 'antojo', 'antojos', 'helado', 'postre', 'domicilio', 'rappi', 'almuerzo', 'empanada', 'arepa', 'cafe', 'café', 'tinto', 'cerveza', 'onces', 'snack'],
  transporte: ['transporte', 'uber', 'didi', 'taxi', 'bus', 'gasolina', 'peaje', 'parqueadero', 'transmilenio', 'metro', 'pasaje'],
  servicios: ['servicio', 'servicios', 'luz', 'agua', 'gas', 'internet', 'celular', 'arriendo', 'administracion', 'administración', 'recibo', 'factura', 'netflix', 'spotify', 'suscripcion', 'suscripción'],
  salud: ['salud', 'farmacia', 'droguer', 'medicina', 'vitamina', 'doctor', 'odontolog', 'eps', 'consulta', 'examen'],
  otros: [],
}

/** Convierte "120mil", "45k", "1.2M", "50.000", "50000" a número. */
export function parseAmount(text: string): number | null {
  const lower = text.toLowerCase().replace(/\s+/g, ' ')

  // 1.2M / 2M
  const millones = lower.match(/(\d+(?:[.,]\d+)?)\s*(m|mm|millon|millones|palo|palos)\b/)
  if (millones) {
    return Math.round(parseFloat(millones[1].replace(',', '.')) * 1_000_000)
  }

  // 120mil / 120 mil / 45k
  const miles = lower.match(/(\d+(?:[.,]\d+)?)\s*(k|mil|lucas|luca)\b/)
  if (miles) {
    return Math.round(parseFloat(miles[1].replace(',', '.')) * 1_000)
  }

  // 50.000 / 50,000 / 120000  (con separadores de miles)
  const plain = lower.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/)
  if (plain) {
    return parseInt(plain[1].replace(/[.,]/g, ''), 10)
  }

  return null
}

export function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase()
  let best: CategoryId = 'otros'
  let bestScore = 0
  for (const cat of Object.keys(CATEGORY_KEYWORDS) as CategoryId[]) {
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (lower.includes(kw) && kw.length > bestScore) {
        best = cat
        bestScore = kw.length
      }
    }
  }
  return best
}

const FUNNY_LINES: string[] = [
  'Anotado. Su cuenta de ahorros les manda saludos… nerviosos.',
  '¡Listo! Prometo no juzgar. (Miento un poquito, pero lo anoto igual.)',
  'Registrado. Recuerden: el dinero es como el jabón, entre más lo tocas, menos queda. 🧼',
  'Ya quedó en el resumen. Su alcancía respiró hondo.',
  'Apuntado con cariño. Ese antojo valió la pena, seguro. 😌',
]

const NEUTRAL_LINES: string[] = [
  'Listo, lo agregué al resumen del mes.',
  'Perfecto, ya quedó registrado.',
  '¡Hecho! Actualicé los totales.',
]

export type BotResult = {
  reply: string
  expense?: Omit<Expense, 'id' | 'date' | 'author'>
}

export function interpret(text: string, humor: boolean): BotResult {
  const amount = parseAmount(text)

  if (amount == null) {
    // Sin monto detectado -> pedir aclaración con gracia
    return {
      reply:
        'Mmm, no le pillé el valor a eso. 🤔 Escríbelo con el monto, por ejemplo: “mercado 120mil”, “uber 18k” o “cena 90.000”. También puedes mandarme la foto de la factura.',
    }
  }

  const category = detectCategory(text)
  const cat = CATEGORIES[category]

  const closer = humor
    ? FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)]
    : NEUTRAL_LINES[Math.floor(Math.random() * NEUTRAL_LINES.length)]

  const reply = `${cat.emoji} Registré ${formatCOP(amount)} en *${cat.label}*. ${closer}`

  return {
    reply,
    expense: {
      amount,
      category,
      note: text.trim(),
    },
  }
}

// Simula la lectura de una factura fotografiada.
export function interpretReceipt(humor: boolean): BotResult {
  const options: { amount: number; category: CategoryId; note: string }[] = [
    { amount: 137400, category: 'mercado', note: 'Factura Éxito · 14 productos' },
    { amount: 52900, category: 'calle', note: 'Factura restaurante · almuerzo' },
    { amount: 89000, category: 'servicios', note: 'Factura droguería + varios' },
    { amount: 24500, category: 'transporte', note: 'Factura gasolina' },
  ]
  const pick = options[Math.floor(Math.random() * options.length)]
  const cat = CATEGORIES[pick.category]
  const closer = humor
    ? 'Leí la factura con mis ojitos de contador. 👓'
    : 'Extraje el total de la factura.'
  return {
    reply: `${cat.emoji} De la factura saqué ${formatCOP(pick.amount)} en *${cat.label}*. ${closer}`,
    expense: pick,
  }
}

// ---- Utilidades de agregación ---------------------------------------------

export function totalOf(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function byCategory(expenses: Expense[]): { category: Category; total: number }[] {
  const map = new Map<CategoryId, number>()
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  return CATEGORY_LIST.map((category) => ({ category, total: map.get(category.id) ?? 0 }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function byAuthor(expenses: Expense[]): { me: number; partner: number } {
  return expenses.reduce(
    (acc, e) => {
      acc[e.author] += e.amount
      return acc
    },
    { me: 0, partner: 0 },
  )
}

// Serie diaria de los últimos N días (para el gráfico de tendencia)
export function dailySeries(expenses: Expense[], days = 12): { day: string; total: number }[] {
  const buckets: { day: string; total: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    const total = expenses
      .filter((e) => e.date.slice(0, 10) === key)
      .reduce((s, e) => s + e.amount, 0)
    buckets.push({ day: label, total })
  }
  return buckets
}
