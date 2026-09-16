'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Edit2,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Sparkles,
  Tag,
  Undo2,
  X,
} from 'lucide-react'
import {
  categoryOf,
  formatMoney,
  type CategoryId,
  type Expense,
  type IncomeBudget,
  type Member,
  type Message,
  type Room,
} from '@/lib/finance'
import { stripRecurringTag } from '@/lib/recurring'
import { getBackground } from '@/lib/backgrounds'
import { receiptUrl } from '@/lib/room'
import { BudgetSummary } from '@/components/budget-summary'
import { CategorySheet } from '@/components/category-sheet'
import { cn } from '@/lib/utils'

export function ChatView({
  room,
  members,
  messages,
  expenses,
  me,
  thinking,
  spent,
  income,
  onSend,
  onSendReceipt,
  onEditExpense,
  onDeleteExpense,
  onUpdateExpense,
}: {
  room: Room
  members: Member[]
  messages: Message[]
  expenses: Expense[]
  me: Member
  thinking: boolean
  spent: number
  income: IncomeBudget
  onSend: (text: string) => void
  onSendReceipt: (file: File, caption: string) => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (id: string) => void
  onUpdateExpense?: (id: string, patch: Partial<Expense>) => void
}) {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [pendingFile, setPendingFile] = useState<{ file: File; url: string } | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bg = getBackground(room.chatBackground)

  /**
   * Un mensaje puede haber creado varios movimientos: un mercado con antojos se
   * parte en dos o tres. El mensaje sólo guarda el primero, pero todos los del
   * mismo desglose entran en la misma inserción y comparten `createdAt` al
   * microsegundo, así que por ahí se recupera el grupo completo.
   */
  const expenseGroupById = useMemo(() => {
    const siblings = new Map<string, Expense[]>()
    for (const e of expenses) {
      const key = `${e.createdAt}·${e.nick}`
      siblings.set(key, [...(siblings.get(key) ?? []), e])
    }
    const map = new Map<string, Expense[]>()
    for (const e of expenses) map.set(e.id, siblings.get(`${e.createdAt}·${e.nick}`) ?? [e])
    return map
  }, [expenses])

  const memberByNick = useMemo(() => {
    const map = new Map<string, Member>()
    for (const m of members) map.set(m.nick, m)
    return map
  }, [members])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    return () => {
      if (pendingFile) URL.revokeObjectURL(pendingFile.url)
    }
  }, [pendingFile])

  function submit() {
    const value = text.trim()

    if (pendingFile) {
      onSendReceipt(pendingFile.file, value)
      URL.revokeObjectURL(pendingFile.url)
      setPendingFile(null)
      setText('')
      return
    }

    if (!value) return
    setText('')
    onSend(value)
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (pendingFile) URL.revokeObjectURL(pendingFile.url)
    setPendingFile({ file, url: URL.createObjectURL(file) })
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-var(--app-header)-var(--app-bottom-nav))] md:h-[calc(100svh-var(--app-header))] w-full max-w-2xl flex-col">
      <div className="px-4 pb-1 pt-2">
        <BudgetSummary spent={spent} income={income} room={room} compact />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar relative flex-1 overflow-y-auto px-4 py-3 sm:py-4"
        style={bg.style}
      >
        <div className="flex flex-col gap-4">
          {messages.length === 0 && <Welcome />}
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              member={m.nick ? memberByNick.get(m.nick) : undefined}
              isMine={m.userId === me.userId}
              entries={m.expenseId ? expenseGroupById.get(m.expenseId) : undefined}
              currency={room.currency}
              last={i === messages.length - 1}
              onQuickCategory={setEditing}
              onEditExpense={onEditExpense}
              onDeleteExpense={onDeleteExpense}
              onOpenImage={setPreviewImage}
            />
          ))}
          {thinking && <TypingBubble isImage={Boolean(pendingFile)} />}
        </div>
      </div>

      <div className="glass sticky bottom-0 z-20 border-t border-border px-3 py-2.5 sm:px-4 md:pb-safe">
        {pendingFile && (
          <div className="surface mb-2 flex items-center gap-3 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingFile.url}
              alt="Factura por enviar"
              className="size-12 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-600 text-foreground">Factura lista</p>
              <p className="label">Puedes añadir una nota antes de mandarla.</p>
            </div>
            <button
              onClick={() => {
                URL.revokeObjectURL(pendingFile.url)
                setPendingFile(null)
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Quitar la foto"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Una sola pieza: cámara, texto y enviar viven dentro del mismo campo,
            en vez de tres botones sueltos peleando por atención. */}
        <div className="flex items-end gap-1 rounded-[1.5rem] border border-border bg-card py-1 pl-1 pr-1 transition-colors focus-within:border-primary/60">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pickFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Tomar o subir la foto de una factura"
            aria-label="Adjuntar factura"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Camera className="size-5" />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder={
              pendingFile ? 'Nota para la factura (opcional)…' : 'Cuéntame el gasto…'
            }
            className="max-h-28 min-h-10 flex-1 resize-none self-center bg-transparent py-2.5 text-sm leading-snug text-foreground outline-none placeholder:text-muted-foreground"
          />

          <button
            onClick={submit}
            disabled={(!text.trim() && !pendingFile) || thinking}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
            aria-label="Enviar"
          >
            {thinking ? <Loader2 className="size-4.5 animate-spin" /> : <SendIcon />}
          </button>
        </div>
      </div>

      {editing && (
        <CategorySheet
          expense={editing}
          currency={room.currency}
          onPick={(category) => {
            onUpdateExpense?.(editing.id, { category, kind: categoryOf(category).kind })
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-all hover:bg-white/30 hover:scale-110 active:scale-95"
            aria-label="Cerrar foto"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Factura completa"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl animate-pop-in"
          />
        </div>
      )}
    </div>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" fill="none" aria-hidden>
      <path
        d="M4 12l16-8-6 16-2.5-6.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** El ícono de Cuenti. Pequeño y en un tono suave: acompaña, no interrumpe. */
function BotAvatar({ busy = false }: { busy?: boolean }) {
  return (
    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
      <Sparkles className={cn('size-3.5', busy && 'animate-pulse')} />
    </span>
  )
}

function Welcome() {
  return (
    <div className="flex max-w-[92%] gap-2.5 sm:max-w-[85%]">
      <BotAvatar />
      <div className="surface min-w-0 flex-1 rounded-tl-sm px-3.5 py-2.5">
        <p className="text-sm leading-relaxed text-foreground">
          ¡Hola! Soy Cuenti. Cuéntenme qué compraron —por ejemplo{' '}
          <b className="font-600">“mercado 120mil”</b>— o mándenme la foto de una factura y yo la
          anoto.
        </p>
        <p className="label mt-1.5">
          También puedo responder: ¿cuánto llevamos en antojos?
        </p>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  member,
  isMine,
  entries,
  currency,
  last,
  onQuickCategory,
  onEditExpense,
  onDeleteExpense,
  onOpenImage,
}: {
  message: Message
  member?: Member
  isMine: boolean
  /** Los movimientos que salieron de este mensaje: casi siempre uno, varios si se desglosó. */
  entries?: Expense[]
  currency: string
  last: boolean
  onQuickCategory: (expense: Expense) => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (id: string) => void
  onOpenImage?: (url: string) => void
}) {
  const isBot = message.role === 'assistant'

  if (isBot) {
    return (
      <div className={cn('flex max-w-[92%] gap-2.5 sm:max-w-[85%]', last && 'animate-float-up')}>
        <BotAvatar />
        <div className="surface min-w-0 flex-1 rounded-tl-sm px-3.5 py-2.5">
          <p className="text-sm leading-relaxed text-foreground">{renderText(message.text)}</p>
          {entries && entries.length > 0 && (
            <Ledger
              entries={entries}
              currency={currency}
              onQuickCategory={onQuickCategory}
              onEdit={onEditExpense}
              onDelete={onDeleteExpense}
            />
          )}
        </div>
      </div>
    )
  }

  const color = member?.color ?? 'var(--muted-foreground)'
  const initials = (message.nick ?? '?').slice(0, 1).toUpperCase()

  return (
    <div
      className={cn(
        'flex max-w-[85%] gap-2.5',
        isMine && 'self-end',
        last && 'animate-float-up',
      )}
    >
      {/* Sólo se muestra quién escribió cuando no soy yo: mis mensajes ya se
          distinguen por el lado y el color, y una inicial más era ruido. */}
      {!isMine && <Avatar initials={initials} color={color} />}
      <div
        className={cn(
          'min-w-0 rounded-2xl px-3.5 py-2.5',
          isMine
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'surface rounded-tl-sm text-foreground',
          message.pending && 'opacity-60',
        )}
      >
        {!isMine && (
          <p className="mb-0.5 text-xs font-600" style={{ color }}>
            {message.nick}
          </p>
        )}
        <ReceiptThumb message={message} onOpenImage={onOpenImage} />
        {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
      </div>
    </div>
  )
}

/** La foto vive en un bucket privado: hay que pedir una URL firmada. */
function ReceiptThumb({
  message,
  onOpenImage,
}: {
  message: Message
  onOpenImage?: (url: string) => void
}) {
  const [url, setUrl] = useState<string | null>(message.localImageUrl ?? null)

  useEffect(() => {
    if (message.localImageUrl) {
      setUrl(message.localImageUrl)
      return
    }
    if (!message.imagePath) return
    let cancelled = false
    receiptUrl(message.imagePath).then((signed) => {
      if (!cancelled) setUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [message.imagePath, message.localImageUrl])

  if (!message.imagePath && !message.localImageUrl) return null

  return (
    <div
      onClick={() => url && onOpenImage?.(url)}
      className={cn(
        'relative mb-2 overflow-hidden rounded-xl bg-black/10 transition-opacity',
        url && 'cursor-pointer active:opacity-80',
      )}
      title={url ? 'Toca para ver la foto en pantalla completa' : undefined}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Factura" className="max-h-40 w-full object-cover sm:max-h-52" />
          {/* La lupa basta para decir "esto se abre"; el letrero encima de la
              foto sólo tapaba la factura. */}
          <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-xs">
            <Maximize2 className="size-3" />
          </span>
        </>
      ) : (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="size-4 animate-spin opacity-60" />
        </div>
      )}
    </div>
  )
}

/**
 * Lo que quedó anotado, dentro de la misma burbuja del bot.
 *
 * Antes cada movimiento traía tres botones con marco y etiqueta. Con dos o tres
 * gastos seguidos la pantalla era una pared de botones y costaba encontrar la
 * cifra. Ahora la fila muestra sólo lo que importa —qué, cuánto— y las acciones
 * viven detrás del "⋯", a un toque de distancia.
 */
function Ledger({
  entries,
  currency,
  onQuickCategory,
  onEdit,
  onDelete,
}: {
  entries: Expense[]
  currency: string
  onQuickCategory: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}) {
  const [undoneIds, setUndoneIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)

  if (!entries || entries.length === 0) return null

  const activeEntries = entries.filter((e) => !undoneIds.has(e.id))
  if (activeEntries.length === 0) {
    return (
      <p className="label mt-2 border-t border-border pt-2">Movimiento deshecho y eliminado.</p>
    )
  }

  const isGroup = activeEntries.length > 1
  const totalAmount = activeEntries.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="mt-2.5 border-t border-border pt-0.5">
      {isGroup && (
        <p className="label pt-1.5">
          Se dividió en {activeEntries.length} · total {formatMoney(totalAmount, currency)}
        </p>
      )}

      <div className="divide-y divide-border">
        {activeEntries.map((expense) => {
          const cat = categoryOf(expense.category)
          const cleanNote = stripRecurringTag(expense.note)
          const showNote = cleanNote && cleanNote.toLowerCase() !== cat.label.toLowerCase()
          const open = openId === expense.id

          return (
            <div key={expense.id} className="py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickCategory(expense)}
                  title="Toca para cambiar la categoría"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <span className="truncate text-sm font-600 text-foreground">{cat.label}</span>
                </button>

                <span
                  className="amount shrink-0 text-sm text-foreground"
                  style={expense.kind === 'income' ? { color: 'var(--positive)' } : undefined}
                >
                  {expense.kind === 'income' ? '+' : ''}
                  {formatMoney(expense.amount, currency)}
                </span>

                <button
                  onClick={() => setOpenId(open ? null : expense.id)}
                  aria-expanded={open}
                  aria-label="Opciones del movimiento"
                  className={cn(
                    '-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors',
                    open ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>

              {showNote && <p className="label mt-0.5 truncate pl-6">{cleanNote}</p>}

              {open && (
                <div
                  // Si la fila era la última visible, las acciones quedarían
                  // debajo del borde: se acercan solas.
                  ref={(el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
                  className="animate-reveal mt-1.5 flex flex-wrap gap-1 pl-6"
                >
                  <RowAction icon={Tag} label="Categoría" onClick={() => onQuickCategory(expense)} />
                  <RowAction icon={Edit2} label="Editar" onClick={() => onEdit(expense)} />
                  <RowAction
                    icon={Undo2}
                    label="Deshacer"
                    danger
                    onClick={() => {
                      setUndoneIds((prev) => new Set([...prev, expense.id]))
                      onDelete(expense.id)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RowAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Tag
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-500 transition-colors',
        danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function TypingBubble({ isImage }: { isImage?: boolean }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 1400)
    const timer2 = setTimeout(() => setStage(2), 3200)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const phrases = isImage
    ? ['Optimizando foto…', 'Leyendo la factura…', 'Separando el mercado…']
    : ['Pensando…', 'Revisando montos…', 'Guardando el movimiento…']

  return (
    <div className="animate-float-up flex gap-2.5">
      <BotAvatar busy />
      <div className="surface flex items-center gap-2.5 rounded-tl-sm px-3.5 py-2.5">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-primary"
              style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite` }}
            />
          ))}
        </div>
        <span className="label">{phrases[stage]}</span>
      </div>
    </div>
  )
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-600 text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}

/** Convierte *texto* en negrita simple para las respuestas del bot. */
function renderText(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <b key={i} className="font-600">
        {part.slice(1, -1)}
      </b>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
