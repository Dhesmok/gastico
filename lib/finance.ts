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

/**
 * Para qué sirve la plata. Sobre esto se arma el "en qué se les va": no es lo
 * mismo pasarse en mercado que pasarse en lujos, aunque el total sea igual.
 */
export type Nature = 'necesario' | 'gusto' | 'ahorro' | 'suelto' | 'ingreso'

export const NATURES: Record<Nature, { label: string; emoji: string; color: string; hint: string }> = {
  necesario: {
    label: 'Necesario',
    emoji: '🧱',
    color: 'var(--cat-mercado)',
    hint: 'Mercado, casa, servicios, transporte, salud, educación y mascotas.',
  },
  gusto: {
    label: 'Gustos',
    emoji: '✨',
    color: 'var(--cat-lujos)',
    hint: 'Antojos, ocio y lujos: lo primero que se recorta si el mes viene apretado.',
  },
  ahorro: {
    label: 'Ahorro y deudas',
    emoji: '🐷',
    color: 'var(--cat-ahorro)',
    hint: 'Sale de la cuenta, pero no se "gasta": se guarda o abona una deuda.',
  },
  suelto: {
    label: 'Sin clasificar',
    emoji: '📦',
    color: 'var(--cat-otros)',
    hint: 'Lo que quedó en "Otros". Tócalo y corrígele la categoría.',
  },
  ingreso: {
    label: 'Ingresos',
    emoji: '💰',
    color: 'var(--cat-nomina)',
    hint: 'Lo que entra.',
  },
}

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string
  kind: Kind
  nature: Nature
  /**
   * Pistas para la IA y para el parser local de respaldo.
   *
   * Se comparan sin tildes y como palabra completa (con su plural), así que
   * "energia" también pilla "energía" y "energías", pero "pan" no se dispara
   * dentro de "pantalón". Una pista que termina en `*` se compara como
   * prefijo: "droguer*" pilla "droguería" y "drogueria".
   */
  hints: string[]
}

export const CATEGORIES: Record<CategoryId, Category> = {
  mercado: {
    id: 'mercado',
    label: 'Mercado',
    emoji: '🛒',
    color: 'var(--cat-mercado)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'mercado', 'mercar', 'mercamos', 'supermercado', 'super', 'd1', 'ara', 'justo y bueno',
      'exito', 'olimpica', 'jumbo', 'carulla', 'makro', 'pricesmart', 'surtimax', 'zapatoca',
      'la 14', 'colsubsidio', 'tienda', 'granero', 'plaza de mercado', 'fruver',
      'verduras', 'frutas', 'carniceria', 'pollo', 'carne', 'huevos', 'leche', 'arroz',
      'panaderia', 'pan', 'despensa', 'abarrotes', 'aseo del mercado', 'papel higienico',
    ],
  },
  casa: {
    id: 'casa',
    label: 'Casa',
    emoji: '🏠',
    color: 'var(--cat-casa)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'arriendo', 'renta', 'administracion', 'hogar', 'muebles', 'mueble', 'reparacion',
      'ferreteria', 'homecenter', 'sodimac', 'easy', 'plomero', 'electricista', 'cerrajero',
      'pintura', 'lavadora', 'nevera', 'estufa', 'colchon', 'cortinas', 'vajilla', 'olla',
      'decoracion', 'trasteo', 'mudanza', 'predial', 'impuesto de la casa', 'seguro del hogar',
      'empleada', 'servicio de aseo',
    ],
  },
  servicios: {
    id: 'servicios',
    label: 'Servicios',
    emoji: '🧾',
    color: 'var(--cat-servicios)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'luz', 'energia', 'agua', 'acueducto', 'gas', 'internet', 'wifi', 'celular', 'recibo',
      'recibos', 'servicios', 'epm', 'emcali', 'codensa', 'enel', 'vanti', 'afinia', 'air-e',
      'claro', 'movistar', 'tigo', 'wom', 'etb', 'recarga', 'plan de datos', 'minutos',
      'netflix', 'spotify', 'disney', 'hbo max', 'prime video', 'youtube premium', 'icloud',
      'suscripcion', 'membresia',
    ],
  },
  calle: {
    id: 'calle',
    label: 'Antojos / Calle',
    emoji: '🌮',
    color: 'var(--cat-calle)',
    kind: 'expense',
    nature: 'gusto',
    hints: [
      'antojo', 'domicilio', 'rappi', 'didi food', 'ifood', 'almuerzo', 'desayuno', 'onces',
      'comida rapida', 'empanada', 'arepa', 'salchipapa', 'perro caliente', 'hamburguesa',
      'pizza', 'sandwich', 'picada', 'mcdonalds', 'burger king', 'kfc', 'frisby', 'subway',
      'dominos', 'presto', 'sierra nevada', 'cafe', 'tinto', 'juan valdez', 'tostao', 'oma',
      'starbucks', 'helado', 'postre', 'malteada', 'jugo', 'gaseosa', 'snack', 'mecato',
      'chocolatina', 'buñuelo', 'almojabana', 'cerveza', 'michelada',
    ],
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    emoji: '🚕',
    color: 'var(--cat-transporte)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'uber', 'didi', 'indriver', 'cabify', 'taxi', 'bus', 'buseta', 'sitp', 'transmilenio',
      'metro', 'tullave', 'civica', 'pasaje', 'gasolina', 'combustible', 'acpm',
      'peaje', 'parqueadero', 'grua', 'mecanico', 'taller', 'llantas', 'aceite del carro',
      'lavada del carro', 'soat', 'tecnomecanica', 'seguro del carro', 'moto', 'bicicleta',
      'patineta',
    ],
  },
  salud: {
    id: 'salud',
    label: 'Salud',
    emoji: '💊',
    color: 'var(--cat-salud)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'farmacia', 'droguer*', 'farmatodo', 'cruz verde', 'locatel', 'medicina', 'medicamento',
      'pastillas', 'vitaminas', 'doctor', 'doctora', 'medico', 'odontolog*', 'psicolog*',
      'nutricionista', 'optica', 'gafas', 'eps', 'sura', 'sanitas', 'compensar', 'copago',
      'cita', 'consulta', 'examen', 'laboratorio', 'vacuna', 'terapia', 'gimnasio', 'gym',
      'crossfit', 'yoga', 'pilates', 'proteina',
    ],
  },
  lujos: {
    id: 'lujos',
    label: 'Lujos',
    emoji: '✨',
    color: 'var(--cat-lujos)',
    kind: 'expense',
    nature: 'gusto',
    hints: [
      'lujo', 'capricho', 'ropa', 'zapatos', 'tenis', 'camisa', 'camiseta', 'pantalon',
      'vestido', 'chaqueta', 'bolso', 'gorra', 'zara', 'falabella', 'arturo calle', 'totto',
      'koaj', 'adidas', 'nike', 'regalo', 'joya', 'anillo', 'reloj', 'perfume', 'maquillaje',
      'crema', 'peluqueria', 'barberia', 'corte de pelo', 'manicure', 'pedicure',
      'spa', 'masaje', 'tatuaje', 'audifonos', 'tecnologia',
    ],
  },
  ocio: {
    id: 'ocio',
    label: 'Ocio',
    emoji: '🎬',
    color: 'var(--cat-ocio)',
    kind: 'expense',
    nature: 'gusto',
    hints: [
      'cine', 'pelicula', 'teatro', 'concierto', 'festival', 'feria', 'museo', 'restaurante',
      'cena', 'salida', 'fiesta', 'rumba', 'bar', 'discoteca', 'trago', 'licor', 'aguardiente',
      'ron', 'whisky', 'billar', 'bolos', 'videojuego', 'steam', 'playstation', 'xbox',
      'nintendo', 'viaje', 'paseo', 'finca', 'hotel', 'airbnb', 'vuelo', 'tiquete', 'crucero',
      'parque', 'piscina', 'plan',
    ],
  },
  mascotas: {
    id: 'mascotas',
    label: 'Mascotas',
    emoji: '🐾',
    color: 'var(--cat-mascotas)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'perro', 'perrito', 'gato', 'gatico', 'mascota', 'veterinari*', 'concentrado', 'purina',
      'dog chow', 'hills', 'arena para gato', 'guarderia canina', 'peluqueria canina',
      'baño del perro', 'collar', 'guacal', 'desparasitante', 'vacuna del perro',
    ],
  },
  educacion: {
    id: 'educacion',
    label: 'Educación',
    emoji: '📚',
    color: 'var(--cat-educacion)',
    kind: 'expense',
    nature: 'necesario',
    hints: [
      'curso', 'universidad', 'colegio', 'jardin', 'sena', 'matricula', 'pension del colegio',
      'semestre', 'diplomado', 'maestria', 'certificacion', 'libro', 'cuaderno', 'utiles',
      'morral', 'uniforme', 'clase', 'profesor', 'tutoria', 'platzi', 'udemy', 'coursera',
      'duolingo',
    ],
  },
  ahorro: {
    id: 'ahorro',
    label: 'Ahorro / Deudas',
    emoji: '🐷',
    color: 'var(--cat-ahorro)',
    kind: 'expense',
    nature: 'ahorro',
    hints: [
      'ahorro', 'ahorre', 'ahorramos', 'alcancia', 'bolsillo', 'cdt', 'fondo', 'inversion',
      'acciones', 'dolares', 'cripto', 'bitcoin', 'deuda', 'cuota', 'abono', 'credito',
      'tarjeta de credito', 'prestamo', 'hipoteca', 'libranza', 'intereses',
    ],
  },
  otros: {
    id: 'otros',
    label: 'Otros',
    emoji: '📦',
    color: 'var(--cat-otros)',
    kind: 'expense',
    nature: 'suelto',
    hints: [],
  },
  nomina: {
    id: 'nomina',
    label: 'Nómina',
    emoji: '💼',
    color: 'var(--cat-nomina)',
    kind: 'income',
    nature: 'ingreso',
    hints: ['nomina', 'sueldo', 'salario', 'quincena', 'mesada', 'pago del mes', 'pago mensual'],
  },
  extra: {
    id: 'extra',
    label: 'Ingreso extra',
    emoji: '🎁',
    color: 'var(--cat-extra)',
    kind: 'income',
    nature: 'ingreso',
    hints: [
      'extra', 'freelance', 'venta', 'vendi', 'vendimos', 'bono', 'prima', 'cesantias',
      'liquidacion', 'propina', 'rifa', 'loteria', 'dividendos', 'arriendo recibido',
      'regalo recibido', 'me regalaron', 'devolucion', 'reembolso', 'cashback',
    ],
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

/**
 * El mismo periodo, una unidad atrás. En los rangos "a mano" se corre la
 * misma cantidad de días hacia atrás, que es lo único que compara peras con
 * peras.
 */
export function previousRange(
  period: PeriodId,
  offset = 0,
  custom?: { from: string; to: string },
): PeriodRange {
  if (period !== 'custom') return periodRange(period, offset - 1, custom)

  const current = periodRange('custom', offset, custom)
  const span = current.end.getTime() - current.start.getTime()
  const start = new Date(current.start.getTime() - span)
  const end = new Date(current.start)
  return {
    start,
    end,
    label: `${shortDate(start)} – ${shortDate(new Date(end.getTime() - 86_400_000))}`,
    months: current.months,
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

export type CategoryTotal = {
  category: Category
  total: number
  /** Cuántos movimientos, para poder mostrar el ticket promedio. */
  count: number
  /** Qué porción del gasto del periodo se llevó, de 0 a 1. */
  share: number
  /** Lo mismo en el periodo anterior; null si no se pidió comparación. */
  previous: number | null
  /** Variación contra el periodo anterior, de -1 a lo que sea. null si no aplica. */
  change: number | null
}

/**
 * Totales por categoría, de mayor a menor. Si se le pasan los movimientos del
 * periodo anterior, cada categoría trae además cuánto cambió: eso es lo que
 * convierte "gastamos 400 en antojos" en "los antojos subieron 60%".
 */
export function byCategory(items: Expense[], previousItems?: Expense[]): CategoryTotal[] {
  const totals = new Map<CategoryId, { total: number; count: number }>()
  for (const e of items) {
    if (e.kind !== 'expense') continue
    const acc = totals.get(e.category) ?? { total: 0, count: 0 }
    acc.total += e.amount
    acc.count += 1
    totals.set(e.category, acc)
  }

  const before = new Map<CategoryId, number>()
  if (previousItems) {
    for (const e of previousItems) {
      if (e.kind !== 'expense') continue
      before.set(e.category, (before.get(e.category) ?? 0) + e.amount)
    }
  }

  const spent = [...totals.values()].reduce((s, t) => s + t.total, 0) || 1

  return [...totals.entries()]
    .map(([id, { total, count }]) => {
      const previous = previousItems ? (before.get(id) ?? 0) : null
      return {
        category: categoryOf(id),
        total,
        count,
        share: total / spent,
        previous,
        change: previous ? (total - previous) / previous : null,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export type NatureTotal = {
  nature: Nature
  label: string
  emoji: string
  color: string
  hint: string
  total: number
  share: number
}

/**
 * El reparto que de verdad importa: cuánto se fue en lo que toca, cuánto en
 * gustos y cuánto quedó guardado. Dos meses con el mismo total pueden ser
 * muy distintos según cómo caiga esta división.
 */
export function byNature(items: Expense[]): NatureTotal[] {
  const totals = new Map<Nature, number>()
  for (const e of items) {
    if (e.kind !== 'expense') continue
    const nature = categoryOf(e.category).nature
    totals.set(nature, (totals.get(nature) ?? 0) + e.amount)
  }
  const spent = [...totals.values()].reduce((s, t) => s + t, 0) || 1
  const order: Nature[] = ['necesario', 'gusto', 'ahorro', 'suelto']

  return order
    .filter((nature) => (totals.get(nature) ?? 0) > 0)
    .map((nature) => ({
      nature,
      ...NATURES[nature],
      total: totals.get(nature) ?? 0,
      share: (totals.get(nature) ?? 0) / spent,
    }))
}

/** Los movimientos más grandes: casi siempre explican el mes entero. */
export function topExpenses(items: Expense[], limit = 5): Expense[] {
  return items
    .filter((e) => e.kind === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export type Pace = {
  /** Días que dura el periodo. */
  days: number
  /** Días ya vividos (el periodo puede estar a medias). */
  elapsed: number
  /** true si el periodo todavía está corriendo. */
  running: boolean
  /** Gasto promedio por día vivido. */
  perDay: number
  /** A este ritmo, cuánto cerraría el periodo. */
  projected: number
  /** Cuánto pueden gastar por día que queda sin pasarse del tope. 0 si ya se pasaron. */
  allowancePerDay: number
}

/**
 * El ritmo del periodo. Sirve para avisar a mitad de mes, que es cuando
 * todavía se puede hacer algo, en vez de dar el parte de guerra el día 30.
 */
export function pace(spent: number, range: PeriodRange, cap: number, now = new Date()): Pace {
  const days = Math.max(1, (range.end.getTime() - range.start.getTime()) / 86_400_000)
  const running = now >= range.start && now < range.end
  // En días enteros: así el ritmo no cambia con cada segundo que pasa y el
  // número se ve igual toda la jornada.
  const elapsed = running
    ? Math.max(1, Math.ceil((now.getTime() - range.start.getTime()) / 86_400_000))
    : now < range.start
      ? 0
      : days

  const perDay = elapsed > 0 ? spent / elapsed : 0
  const left = Math.max(0, days - elapsed)

  return {
    days,
    elapsed,
    running,
    perDay,
    projected: elapsed > 0 ? perDay * days : 0,
    allowancePerDay: cap > 0 && left > 0 ? Math.max(0, (cap - spent) / left) : 0,
  }
}

/** Qué porción de lo que entró quedó sin gastar. Negativo = se pasaron. */
export function savingsRate(income: number, spent: number): number | null {
  if (income <= 0) return null
  return (income - spent) / income
}

/** El día que más pesó en el periodo, para el "¿en qué se nos fue?". */
export function heaviestDay(items: Expense[]): { date: Date; total: number } | null {
  const byDay = new Map<string, number>()
  for (const e of items) {
    if (e.kind !== 'expense') continue
    const key = e.occurredAt.slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + e.amount)
  }
  let best: { date: Date; total: number } | null = null
  for (const [key, total] of byDay) {
    if (!best || total > best.total) best = { date: new Date(`${key}T12:00:00`), total }
  }
  return best
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

// ---- Avisos ----------------------------------------------------------------
// Un número solo no dice nada; "los antojos subieron 60%" sí. Estas frases se
// arman con lo que ya está calculado y salen arriba de las gráficas.

export type Insight = {
  id: string
  tone: 'bien' | 'ojo' | 'alerta' | 'dato'
  emoji: string
  text: string
}

export function buildInsights(input: {
  range: PeriodRange
  spent: number
  previousSpent: number
  income: IncomeBudget
  cap: number
  currency: string
  categories: CategoryTotal[]
  natures: NatureTotal[]
  rhythm: Pace
}): Insight[] {
  const { range, spent, previousSpent, income, cap, currency, categories, natures, rhythm } = input
  const out: Insight[] = []
  const pct = (v: number) => Math.round(Math.abs(v) * 100)

  if (spent === 0) return out

  // 1. Ritmo y proyección: sólo tiene sentido con el periodo en curso y con
  //    un par de días encima, o la proyección se vuelve un chiste.
  if (rhythm.running && rhythm.elapsed >= 2) {
    const overCap = cap > 0 && rhythm.projected > cap
    out.push({
      id: 'ritmo',
      tone: overCap ? 'ojo' : 'dato',
      emoji: '🗓️',
      text: `Van ${formatMoney(rhythm.perDay, currency)} por día. A este ritmo, ${range.label.toLowerCase()} cierra en ${formatMoney(rhythm.projected, currency)}${
        overCap ? `, ${formatMoney(rhythm.projected - cap, currency)} por encima del tope` : ''
      }.`,
    })
  }

  // 2. Contra el periodo anterior.
  if (previousSpent > 0) {
    const change = (spent - previousSpent) / previousSpent
    if (Math.abs(change) >= 0.08) {
      out.push({
        id: 'vs-anterior',
        tone: change < 0 ? 'bien' : 'ojo',
        emoji: change < 0 ? '📉' : '📈',
        text: `${pct(change)}% ${change < 0 ? 'menos' : 'más'} que el periodo anterior (${formatMoney(previousSpent, currency)}).`,
      })
    }
  }

  // 3. La categoría que más se movió, si pesa lo suficiente como para importar.
  const jumped = categories
    .filter((c) => c.change !== null && c.change >= 0.35 && c.share >= 0.08)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0]
  if (jumped) {
    out.push({
      id: `subio-${jumped.category.id}`,
      tone: 'ojo',
      emoji: jumped.category.emoji,
      text: `${jumped.category.label} subió ${pct(jumped.change ?? 0)}%: de ${formatMoney(jumped.previous ?? 0, currency)} a ${formatMoney(jumped.total, currency)}.`,
    })
  }

  // 4. Gustos: el dato que más ayuda a decidir dónde recortar.
  const gustos = natures.find((n) => n.nature === 'gusto')
  if (gustos && gustos.share >= 0.3) {
    out.push({
      id: 'gustos',
      tone: gustos.share >= 0.45 ? 'ojo' : 'dato',
      emoji: '✨',
      text: `${pct(gustos.share)}% del gasto se fue en gustos (${formatMoney(gustos.total, currency)}). Ahí es donde más fácil se recorta.`,
    })
  }

  // 5. Cuánto quedó de lo que entró
  //    (cuando sobra, el dato ya está arriba en su recuadro: aquí sólo va lo feo)
  const rate = savingsRate(income.total, spent)
  if (rate !== null && rate < 0) {
    out.push({
      id: 'ahorro',
      tone: 'alerta',
      emoji: '😳',
      text: `Gastaron ${formatMoney(spent - income.total, currency)} más de lo que entró.`,
    })
  }

  // 6. Lo que quedó sin clasificar: se arregla tocando el movimiento.
  const sueltos = natures.find((n) => n.nature === 'suelto')
  if (sueltos && sueltos.share >= 0.15) {
    out.push({
      id: 'sin-clasificar',
      tone: 'dato',
      emoji: '📦',
      text: `${pct(sueltos.share)}% quedó en "Otros". Toca el movimiento y cámbiale la categoría para que las cuentas hablen claro.`,
    })
  }

  const rank = { alerta: 0, ojo: 1, bien: 2, dato: 3 }
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 4)
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

/** Sin tildes, sin mayúsculas, sin dobles espacios: así se comparan las pistas. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Una pista se busca como palabra completa (aceptando el plural) para que
 * "pan" no se dispare dentro de "pantalón". Con `*` al final se compara como
 * prefijo: "droguer*" pilla "droguería" y "drogueristas".
 */
const hintPatterns = new Map<string, RegExp>()

function hintPattern(hint: string): RegExp {
  let pattern = hintPatterns.get(hint)
  if (!pattern) {
    const prefix = hint.endsWith('*')
    const body = normalizeText(prefix ? hint.slice(0, -1) : hint).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )
    // Con `*` la palabra puede seguir ("droguer" → "droguería"); sin `*` tiene
    // que cerrar ahí, aceptando el plural.
    pattern = new RegExp(`(?:^|[^a-z0-9])${body}${prefix ? '' : 'e?s?(?![a-z0-9])'}`)
    hintPatterns.set(hint, pattern)
  }
  return pattern
}

/**
 * Lo que esta casa ya clasificó a mano. Vale más que cualquier lista que
 * traiga la app: si para ellos "carulla" es mercado y "el corral" es antojo,
 * eso es lo que manda.
 */
export type CategoryMemory = Map<string, CategoryId>

const STOPWORDS = new Set([
  'para', 'con', 'del', 'los', 'las', 'una', 'unos', 'unas', 'por', 'que', 'este', 'esta',
  'mil', 'lucas', 'luca', 'palo', 'palos', 'pague', 'pagamos', 'compre', 'compramos', 'gaste',
  'gastamos', 'ayer', 'hoy', 'mañana', 'manana', 'total', 'pesos', 'plata', 'cosas', 'algo',
])

function keywordsOf(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !STOPWORDS.has(w))
}

/** Lo mínimo que hace falta para aprender: qué escribieron y dónde lo pusieron. */
export type Classified = { note: string; category: CategoryId }

/**
 * Arma la memoria con lo que ya está registrado. Una palabra sólo entra si
 * aparece al menos dos veces y si en dos de cada tres casos cayó en la misma
 * categoría: así una corrección ocasional no arrastra todo el historial.
 */
export function buildCategoryMemory(items: Classified[]): CategoryMemory {
  const memory: CategoryMemory = new Map()
  for (const { word, category } of tallyWords(items)) memory.set(word, category)
  return memory
}

/**
 * Las palabras que esta casa ya clasificó, de la más repetida a la menos.
 * Sirve para enseñarle sus mañas a la IA sin mandarle el historial entero.
 */
export function memoryHighlights(
  items: Classified[],
  limit = 20,
): { word: string; category: Category; count: number }[] {
  return tallyWords(items)
    .slice(0, limit)
    .map(({ word, category, count }) => ({ word, category: categoryOf(category), count }))
}

function tallyWords(
  items: Classified[],
): { word: string; category: CategoryId; count: number }[] {
  const counts = new Map<string, Map<CategoryId, number>>()

  for (const e of items) {
    if (!e.note) continue
    for (const word of new Set(keywordsOf(e.note))) {
      const byCat = counts.get(word) ?? new Map<CategoryId, number>()
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1)
      counts.set(word, byCat)
    }
  }

  const learned: { word: string; category: CategoryId; count: number }[] = []
  for (const [word, byCat] of counts) {
    let winner: CategoryId | null = null
    let top = 0
    let total = 0
    for (const [cat, n] of byCat) {
      total += n
      if (n > top) {
        top = n
        winner = cat
      }
    }
    // Dos apariciones y dos tercios de acuerdo: suficiente para creerles,
    // poco para que un gasto raro contamine la memoria.
    if (winner && total >= 2 && top / total >= 0.66 && winner !== 'otros') {
      learned.push({ word, category: winner, count: top })
    }
  }

  return learned.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
}

export function detectCategory(
  text: string,
  kind: Kind = 'expense',
  memory?: CategoryMemory,
): CategoryId {
  const normalized = normalizeText(text)

  // Primero la memoria de la casa: la palabra más larga que ya hayan
  // clasificado antes gana, porque es la más específica ("juan valdez" pesa
  // más que "cafe").
  if (memory && memory.size > 0) {
    let best: CategoryId | null = null
    let bestScore = 0
    for (const word of keywordsOf(normalized)) {
      const remembered = memory.get(word)
      if (remembered && categoryOf(remembered).kind === kind && word.length > bestScore) {
        best = remembered
        bestScore = word.length
      }
    }
    if (best) return best
  }

  let best: CategoryId = kind === 'income' ? 'extra' : 'otros'
  let bestScore = 0
  for (const cat of CATEGORY_LIST) {
    if (cat.kind !== kind) continue
    for (const hint of cat.hints) {
      if (hint.length > bestScore && hintPattern(hint).test(normalized)) {
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
  /(?:^|[^a-záéíóúüñ])(me pagaron|me consignaron|me cay[oó]|me lleg[oó]|me devolvieron|me reembolsaron|me transfirieron|me giraron|me depositaron|me gan[eé]|recib[ií]|cobr[eé]|ingres[oó]|entr[oó] (?:plata|la n[oó]mina|el pago|el sueldo)|n[oó]mina|sueldo|salario|quincena|vend[ií])(?![a-záéíóúüñ])/

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
export function parseLocally(text: string, memory?: CategoryMemory): ParsedEntry | null {
  const amount = parseAmount(text)
  if (amount == null) return null
  const kind = detectKind(text)
  return {
    kind,
    amount,
    category: detectCategory(text, kind, memory),
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
