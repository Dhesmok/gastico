// ---------------------------------------------------------------------------
// Tipos, categorías y cálculos de "Cuentas Claras".
// Los datos vienen de Supabase (ver lib/room.ts); aquí sólo vive la lógica pura.
// ---------------------------------------------------------------------------

export type Kind = 'expense' | 'income'

export type CategoryId =
  // gastos
  | 'mercado'
  | 'casa'
  | 'servicios'
  | 'calle'
  | 'transporte'
  | 'salud'
  | 'lujos'
  | 'ocio'
  | 'mascotas'
  | 'educacion'
  | 'ahorro'
  | 'otros'
  // ingresos
  | 'nomina'
  | 'extra'

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string
  kind: Kind
  /** Pistas para la IA y para el parser local de respaldo. */
  hints: string[]
}

export const CATEGORIES: Record<CategoryId, Category> = {
  mercado: {
    id: 'mercado',
    label: 'Mercado',
    emoji: '🛒',
    color: 'var(--cat-mercado)',
    kind: 'expense',
    hints: ['mercado', 'supermercado', 'super', 'd1', 'ara', 'exito', 'olimpica', 'jumbo', 'carulla', 'plaza', 'fruver', 'verduras', 'frutas', 'carniceria', 'despensa'],
  },
  casa: {
    id: 'casa',
    label: 'Casa',
    emoji: '🏠',
    color: 'var(--cat-casa)',
    kind: 'expense',
    hints: ['arriendo', 'renta', 'administracion', 'administración', 'hogar', 'muebles', 'reparacion', 'reparación', 'ferreteria', 'ferretería', 'aseo', 'plomero', 'electricista'],
  },
  servicios: {
    id: 'servicios',
    label: 'Servicios',
    emoji: '🧾',
    color: 'var(--cat-servicios)',
    kind: 'expense',
    hints: ['luz', 'energia', 'energía', 'agua', 'gas', 'internet', 'celular', 'recibo', 'factura', 'netflix', 'spotify', 'suscripcion', 'suscripción', 'plan de datos'],
  },
  calle: {
    id: 'calle',
    label: 'Antojos / Calle',
    emoji: '🌮',
    color: 'var(--cat-calle)',
    kind: 'expense',
    hints: ['antojo', 'antojos', 'domicilio', 'rappi', 'almuerzo', 'desayuno', 'onces', 'empanada', 'arepa', 'cafe', 'café', 'tinto', 'helado', 'postre', 'cerveza', 'snack', 'comida rapida', 'comida rápida'],
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    emoji: '🚕',
    color: 'var(--cat-transporte)',
    kind: 'expense',
    hints: ['uber', 'didi', 'indriver', 'taxi', 'bus', 'buseta', 'gasolina', 'combustible', 'peaje', 'parqueadero', 'transmilenio', 'metro', 'pasaje', 'sitp', 'mecanico', 'mecánico', 'lavada'],
  },
  salud: {
    id: 'salud',
    label: 'Salud',
    emoji: '💊',
    color: 'var(--cat-salud)',
    kind: 'expense',
    hints: ['farmacia', 'droguer', 'medicina', 'medicamento', 'vitaminas', 'doctor', 'medico', 'médico', 'odontolog', 'eps', 'consulta', 'examen', 'terapia', 'gimnasio', 'gym'],
  },
  lujos: {
    id: 'lujos',
    label: 'Lujos',
    emoji: '✨',
    color: 'var(--cat-lujos)',
    kind: 'expense',
    hints: ['lujo', 'ropa', 'zapatos', 'camisa', 'vestido', 'regalo', 'joya', 'perfume', 'maquillaje', 'peluqueria', 'peluquería', 'spa', 'tecnologia', 'tecnología', 'capricho'],
  },
  ocio: {
    id: 'ocio',
    label: 'Ocio',
    emoji: '🎬',
    color: 'var(--cat-ocio)',
    kind: 'expense',
    hints: ['cine', 'restaurante', 'cena', 'salida', 'fiesta', 'rumba', 'concierto', 'viaje', 'paseo', 'hotel', 'vuelo', 'museo', 'juego', 'plan'],
  },
  mascotas: {
    id: 'mascotas',
    label: 'Mascotas',
    emoji: '🐾',
    color: 'var(--cat-mascotas)',
    kind: 'expense',
    hints: ['perro', 'gato', 'mascota', 'veterinario', 'veterinaria', 'concentrado', 'purina', 'guarderia canina', 'arena para gato'],
  },
  educacion: {
    id: 'educacion',
    label: 'Educación',
    emoji: '📚',
    color: 'var(--cat-educacion)',
    kind: 'expense',
    hints: ['curso', 'universidad', 'colegio', 'matricula', 'matrícula', 'libro', 'libros', 'estudio', 'clase', 'certificacion', 'certificación'],
  },
  ahorro: {
    id: 'ahorro',
    label: 'Ahorro / Deudas',
    emoji: '🐷',
    color: 'var(--cat-ahorro)',
    kind: 'expense',
    hints: ['ahorro', 'ahorre', 'ahorré', 'cdt', 'inversion', 'inversión', 'deuda', 'cuota', 'credito', 'crédito', 'tarjeta', 'prestamo', 'préstamo'],
  },
  otros: {
    id: 'otros',
    label: 'Otros',
    emoji: '📦',
    color: 'var(--cat-otros)',
    kind: 'expense',
    hints: [],
  },
  nomina: {
    id: 'nomina',
    label: 'Nómina',
    emoji: '💼',
    color: 'var(--cat-nomina)',
    kind: 'income',
    hints: ['nomina', 'nómina', 'sueldo', 'salario', 'quincena', 'pago del mes'],
  },
  extra: {
    id: 'extra',
    label: 'Ingreso extra',
    emoji: '🎁',
    color: 'var(--cat-extra)',
    kind: 'income',
    hints: ['extra', 'freelance', 'venta', 'vendi', 'vendí', 'bono', 'prima', 'regalo recibido', 'devolucion', 'devolución', 'reembolso'],
  },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)
export const EXPENSE_CATEGORIES = CATEGORY_LIST.filter((c) => c.kind === 'expense')
export const INCOME_CATEGORIES = CATEGORY_LIST.filter((c) => c.kind === 'income')

export function categoryOf(id: string | null | undefined): Category {
  return CATEGORIES[(id ?? 'otros') as CategoryId] ?? CATEGORIES.otros
}

// ---- Modelos ---------------------------------------------------------------

export type Member = {
  userId: string
  nick: string
  color: string
  isOwner: boolean
}

export type Expense = {
  id: string
  roomId: string
  userId: string | null
  nick: string
  kind: Kind
  amount: number
  category: CategoryId
  note: string
  occurredAt: string // ISO
  receiptPath: string | null
  createdAt: string
}

export type Message = {
  id: string
  roomId: string
  userId: string | null
  nick: string | null
  role: 'user' | 'assistant'
  text: string
  imagePath: string | null
  expenseId: string | null
  createdAt: string
  /** Sólo en cliente: la foto que aún se está subiendo. */
  localImageUrl?: string
  pending?: boolean
}

export type Room = {
  id: string
  code: string
  name: string
  currency: string
  monthlyIncome: number
  spendingCap: number
  chatBackground: string
  humor: boolean
  keepReceipts: boolean
  receiptRetentionMonths: number
}

// ---- Formato de moneda -----------------------------------------------------

const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(currency: string) {
  let f = formatters.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    formatters.set(currency, f)
  }
  return f
}

export function formatMoney(value: number, currency = 'COP'): string {
  return formatterFor(currency).format(Math.round(value))
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${Math.round(abs)}`
}

/** Compat: la mayoría de la app usa COP. */
export const formatCOP = (v: number) => formatMoney(v, 'COP')

// ---- Periodos --------------------------------------------------------------

export type PeriodId = 'month' | 'quarter' | 'semester' | 'year' | 'custom'

export type PeriodRange = {
  start: Date
  /** Exclusivo. */
  end: Date
  label: string
  /** Cuántos meses cubre, para escalar la nómina y el tope mensuales. */
  months: number
}

export const PERIODS: { id: PeriodId; label: string; short: string }[] = [
  { id: 'month', label: 'Mensual', short: 'Mes' },
  { id: 'quarter', label: 'Trimestral', short: 'Trim' },
  { id: 'semester', label: 'Semestral', short: 'Sem' },
  { id: 'year', label: 'Anual', short: 'Año' },
  { id: 'custom', label: 'Otro', short: 'Otro' },
]

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const shortDate = (d: Date) =>
  `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`

/**
 * Rango del periodo. `offset` mueve hacia atrás (-1) o adelante (+1) una unidad
 * completa: un mes, un trimestre, un semestre o un año.
 */
export function periodRange(
  period: PeriodId,
  offset = 0,
  custom?: { from: string; to: string },
): PeriodRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (period === 'custom') {
    const start = custom?.from ? new Date(`${custom.from}T00:00:00`) : new Date(y, m, 1)
    const end = custom?.to ? new Date(`${custom.to}T00:00:00`) : new Date(y, m + 1, 1)
    // El día final se incluye completo.
    const endExclusive = new Date(end)
    endExclusive.setDate(endExclusive.getDate() + 1)
    const days = Math.max(1, (endExclusive.getTime() - start.getTime()) / 86_400_000)
    return {
      start,
      end: endExclusive,
      label: `${shortDate(start)} – ${shortDate(end)}`,
      months: Math.max(1, days / 30.44),
    }
  }

  if (period === 'year') {
    const year = y + offset
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
      label: String(year),
      months: 12,
    }
  }

  if (period === 'semester') {
    const index = Math.floor(m / 6) + offset
    const year = y + Math.floor(index / 2)
    const half = ((index % 2) + 2) % 2
    return {
      start: new Date(year, half * 6, 1),
      end: new Date(year, half * 6 + 6, 1),
      label: `${half === 0 ? 'Ene–Jun' : 'Jul–Dic'} ${year}`,
      months: 6,
    }
  }

  if (period === 'quarter') {
    const index = Math.floor(m / 3) + offset
    const year = y + Math.floor(index / 4)
    const q = ((index % 4) + 4) % 4
    const startMonth = q * 3
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 1),
      label: `${capitalize(MONTH_NAMES[startMonth].slice(0, 3))}–${capitalize(
        MONTH_NAMES[startMonth + 2].slice(0, 3),
      )} ${year}`,
      months: 3,
    }
  }

  // Mensual
  const start = new Date(y, m + offset, 1)
  return {
    start,
    end: new Date(y, m + offset + 1, 1),
    label: `${capitalize(MONTH_NAMES[start.getMonth()])} ${start.getFullYear()}`,
    months: 1,
  }
}

export function inRange(iso: string, range: PeriodRange): boolean {
  const t = new Date(iso).getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}

export function filterByRange(expenses: Expense[], range: PeriodRange): Expense[] {
  return expenses.filter((e) => inRange(e.occurredAt, range))
}

// ---- Agregaciones ----------------------------------------------------------

export function sumExpenses(items: Expense[]): number {
  return items.reduce((s, e) => (e.kind === 'expense' ? s + e.amount : s), 0)
}

export function sumIncome(items: Expense[]): number {
  return items.reduce((s, e) => (e.kind === 'income' ? s + e.amount : s), 0)
}

export type IncomeBudget = {
  /** Lo que se toma como sueldo del periodo. */
  base: number
  /** Freelances, ventas, bonos: siempre suman aparte. */
  extra: number
  total: number
  /** true si el sueldo salió de lo registrado y no del valor configurado. */
  usesRegistered: boolean
}

/**
 * Cuánto dinero hay disponible en el periodo.
 *
 * La nómina configurada en ajustes es lo que *esperan* recibir cada mes. Si
 * además registran su pago por el chat ("me pagaron la quincena 3 palos"),
 * sumar ambos contaría la plata dos veces: por eso la nómina registrada
 * reemplaza a la configurada, y sólo los ingresos extra se suman encima.
 */
export function incomeBudget(
  items: Expense[],
  monthlyIncome: number,
  months: number,
): IncomeBudget {
  let nomina = 0
  let extra = 0
  for (const e of items) {
    if (e.kind !== 'income') continue
    if (e.category === 'nomina') nomina += e.amount
    else extra += e.amount
  }
  const base = nomina > 0 ? nomina : monthlyIncome * months
  return { base, extra, total: base + extra, usesRegistered: nomina > 0 }
}

export function byCategory(items: Expense[]): { category: Category; total: number }[] {
  const map = new Map<CategoryId, number>()
  for (const e of items) {
    if (e.kind !== 'expense') continue
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  }
  return [...map.entries()]
    .map(([id, total]) => ({ category: categoryOf(id), total }))
    .sort((a, b) => b.total - a.total)
}

export function byMember(
  items: Expense[],
  members: Member[],
): { nick: string; color: string; total: number }[] {
  const map = new Map<string, number>()
  for (const e of items) {
    if (e.kind !== 'expense') continue
    map.set(e.nick, (map.get(e.nick) ?? 0) + e.amount)
  }
  const colorFor = (nick: string) =>
    members.find((m) => m.nick === nick)?.color ?? 'var(--muted-foreground)'
  return [...map.entries()]
    .map(([nick, total]) => ({ nick, color: colorFor(nick), total }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Serie temporal del periodo, agrupada por día, semana o mes según qué tan
 * largo sea el rango, para que la gráfica nunca quede con 400 barritas.
 */
export function timeSeries(
  items: Expense[],
  range: PeriodRange,
): { label: string; total: number }[] {
  const days = (range.end.getTime() - range.start.getTime()) / 86_400_000
  const grain: 'day' | 'week' | 'month' = days <= 45 ? 'day' : days <= 200 ? 'week' : 'month'

  const buckets = new Map<string, { label: string; total: number; sort: number }>()

  const cursor = new Date(range.start)
  while (cursor < range.end) {
    const { key, label } = bucketKey(cursor, grain)
    if (!buckets.has(key)) buckets.set(key, { label, total: 0, sort: cursor.getTime() })
    if (grain === 'day') cursor.setDate(cursor.getDate() + 1)
    else if (grain === 'week') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
  }

  for (const e of items) {
    if (e.kind !== 'expense') continue
    const d = new Date(e.occurredAt)
    if (d < range.start || d >= range.end) continue
    const { key, label } = bucketKey(d, grain)
    const b = buckets.get(key) ?? { label, total: 0, sort: d.getTime() }
    b.total += e.amount
    buckets.set(key, b)
  }

  return [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ label, total }) => ({ label, total }))
}

function bucketKey(d: Date, grain: 'day' | 'week' | 'month') {
  if (grain === 'month') {
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: capitalize(MONTH_NAMES[d.getMonth()].slice(0, 3)),
    }
  }
  if (grain === 'week') {
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return {
      key: `w-${monday.toISOString().slice(0, 10)}`,
      label: `${monday.getDate()}/${monday.getMonth() + 1}`,
    }
  }
  return {
    key: d.toISOString().slice(0, 10),
    label: String(d.getDate()),
  }
}

// ---- Parser local de respaldo ---------------------------------------------
// Si Gemini no responde (sin cuota, sin red, sin API key) la app sigue
// registrando gastos con estas reglas. Nunca te quedas sin anotar.

/** "120mil", "45k", "1.2M", "50.000", "50000" -> número. */
export function parseAmount(text: string): number | null {
  const lower = text.toLowerCase().replace(/\s+/g, ' ')

  const millones = lower.match(/(\d+(?:[.,]\d+)?)\s*(millones|millon|millón|palos|palo|mm|m)\b/)
  if (millones) return Math.round(parseFloat(millones[1].replace(',', '.')) * 1_000_000)

  const miles = lower.match(/(\d+(?:[.,]\d+)?)\s*(mil|lucas|luca|k)\b/)
  if (miles) return Math.round(parseFloat(miles[1].replace(',', '.')) * 1_000)

  const plain = lower.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})/)
  if (plain) return parseInt(plain[1].replace(/[.,]/g, ''), 10)

  // Jerga sin cifra: "una luca", "un palo".
  const slang = lower.match(/\b(?:un|una)\s+(luca|barra|palo|melo)\b/)
  if (slang) return slang[1] === 'palo' || slang[1] === 'melo' ? 1_000_000 : 1_000

  return null
}

export function detectCategory(text: string, kind: Kind = 'expense'): CategoryId {
  const lower = text.toLowerCase()
  let best: CategoryId = kind === 'income' ? 'extra' : 'otros'
  let bestScore = 0
  for (const cat of CATEGORY_LIST) {
    if (cat.kind !== kind) continue
    for (const hint of cat.hints) {
      if (lower.includes(hint) && hint.length > bestScore) {
        best = cat.id
        bestScore = hint.length
      }
    }
  }
  return best
}

/**
 * Ojo con \b: en JavaScript sólo entiende letras ASCII, así que "recibí" o
 * "entró" nunca cierran un límite de palabra. Por eso los bordes se escriben
 * a mano incluyendo las vocales acentuadas y la ñ.
 */
const INCOME_HINTS =
  /(?:^|[^a-záéíóúüñ])(me pagaron|me consignaron|me cay[oó]|me lleg[oó]|recib[ií]|ingres[oó]|entr[oó] (?:plata|la n[oó]mina|el pago|el sueldo)|n[oó]mina|sueldo|salario|quincena|vend[ií])(?![a-záéíóúüñ])/

export function detectKind(text: string): Kind {
  return INCOME_HINTS.test(text.toLowerCase()) ? 'income' : 'expense'
}

export type ParsedEntry = {
  kind: Kind
  amount: number
  category: CategoryId
  note: string
  occurredAt?: string
}

/** Interpretación local, sin IA. Devuelve null si no encuentra un monto. */
export function parseLocally(text: string): ParsedEntry | null {
  const amount = parseAmount(text)
  if (amount == null) return null
  const kind = detectKind(text)
  return {
    kind,
    amount,
    category: detectCategory(text, kind),
    note: text.trim().slice(0, 200),
  }
}

const FUNNY_LINES = [
  'Anotado. Su cuenta de ahorros les manda saludos… nerviosos.',
  '¡Listo! Prometo no juzgar. (Miento un poquito, pero lo anoto igual.)',
  'Registrado. El dinero es como el jabón: entre más lo tocas, menos queda. 🧼',
  'Ya quedó en el resumen. Su alcancía respiró hondo.',
  'Apuntado con cariño. Ese antojo valió la pena, seguro. 😌',
]

const NEUTRAL_LINES = [
  'Listo, lo agregué al resumen.',
  'Perfecto, ya quedó registrado.',
  '¡Hecho! Actualicé los totales.',
]

export function localReply(entry: ParsedEntry, humor: boolean, currency = 'COP'): string {
  const cat = categoryOf(entry.category)
  const closer = humor
    ? FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)]
    : NEUTRAL_LINES[Math.floor(Math.random() * NEUTRAL_LINES.length)]
  const verb = entry.kind === 'income' ? 'Sumé' : 'Registré'
  return `${cat.emoji} ${verb} ${formatMoney(entry.amount, currency)} en *${cat.label}*. ${closer}`
}
