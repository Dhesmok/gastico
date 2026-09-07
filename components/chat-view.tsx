'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Edit2, Loader2, Sparkles, Tag, Trash2, Undo2, X } from 'lucide-react'
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
      <div className="px-4 pt-3 sm:pt-4">
        <BudgetSummary spent={spent} income={income} room={room} compact />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar relative flex-1 overflow-y-auto px-4 py-3 sm:py-4"
        style={bg.style}
      >
        <div className="flex flex-col gap-3">
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

      <div className="glass sticky bottom-0 z-20 border-t border-border/70 px-3.5 py-2.5 sm:px-4 md:pb-safe">
        {pendingFile && (
          <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-border bg-card/90 p-2 shadow-xs backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingFile.url}
              alt="Factura por enviar"
              className="size-14 rounded-xl object-cover shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-700 text-foreground">Factura lista para enviar</p>
              <p className="text-[11px] text-muted-foreground">
                Puedes añadir una nota antes de mandarla.
              </p>
            </div>
            <button
              onClick={() => {
                URL.revokeObjectURL(pendingFile.url)
                setPendingFile(null)
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Quitar la foto"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
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
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-md active:scale-95"
          >
            <Camera className="size-5" />
          </button>

          <div className="flex min-h-[44px] flex-1 items-center rounded-2xl border border-border bg-card px-3.5 py-1 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
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
                pendingFile ? 'Nota para la factura (opcional)…' : 'Cuéntame el gasto… ej: “mercado 120mil”'
              }
              className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-snug text-foreground outline-none placeholder:text-xs placeholder:text-muted-foreground sm:placeholder:text-sm"
            />
          </div>

          <button
            onClick={submit}
            disabled={(!text.trim() && !pendingFile) || thinking}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:shadow-none"
            aria-label="Enviar"
          >
            {thinking ? <Loader2 className="size-5 animate-spin" /> : <SendIcon />}
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
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <path
        d="M4 12l16-8-6 16-2.5-6.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Welcome() {
  return (
    <div className="flex max-w-[85%] items-end gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="size-4" />
      </div>
      <div className="rounded-3xl rounded-bl-md bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="text-sm leading-relaxed text-foreground">
          ¡Hola! 💸 Soy Cuenti, su contador de bolsillo. Cuéntenme qué compraron (ej:{' '}
          <b className="font-700">“mercado 120mil”</b>) o mándenme la foto de una factura y yo la
          anoto en el resumen del mes. También pueden preguntarme cosas como{' '}
          <b className="font-700">“¿cuánto llevamos en antojos?”</b>
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
      <div className={cn('flex max-w-[92%] sm:max-w-[85%] items-end gap-2', last && 'animate-float-up')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="overflow-hidden rounded-3xl rounded-bl-md border border-border/70 bg-card/95 shadow-sm backdrop-blur">
            <div className="px-4 py-2.5">
              <p className="text-sm leading-relaxed text-foreground">{renderText(message.text)}</p>
            </div>
            {entries && entries.length > 0 && (
              <div className="border-t border-border/40 bg-muted/25">
                <AccountingCard
                  entries={entries}
                  currency={currency}
                  onQuickCategory={onQuickCategory}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const color = member?.color ?? 'var(--muted-foreground)'
  const initials = (message.nick ?? '?').slice(0, 1).toUpperCase()

  return (
    <div
      className={cn(
        'flex max-w-[85%] items-end gap-2',
        isMine && 'self-end',
        last && 'animate-float-up',
      )}
    >
      {!isMine && <Avatar initials={initials} color={color} />}
      <div
        className={cn(
          'rounded-3xl p-3 sm:px-4 sm:py-2.5 shadow-md backdrop-blur-xs',
          isMine
            ? 'rounded-br-md bg-primary text-primary-foreground shadow-primary/20'
            : 'rounded-bl-md bg-card/95 text-foreground border border-border/50',
          message.pending && 'opacity-70',
        )}
      >
        {!isMine && (
          <p className="mb-1 text-[11px] font-700" style={{ color }}>
            {message.nick}
          </p>
        )}
        <ReceiptThumb message={message} onOpenImage={onOpenImage} />
        {message.text && <p className="text-sm leading-relaxed px-0.5">{message.text}</p>}
      </div>
      {isMine && <Avatar initials={initials} color={color} />}
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
        'group relative mb-2 overflow-hidden rounded-2xl bg-black/10 transition-all duration-200',
        url && 'cursor-pointer hover:opacity-95 active:scale-[0.98]',
      )}
      title={url ? 'Toca para ver la foto en pantalla completa' : undefined}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Factura" className="max-h-40 sm:max-h-52 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-1.5 text-center">
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-700 text-white backdrop-blur-xs">
              Toca para ampliar 🔍
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="size-4 animate-spin opacity-60" />
        </div>
      )}
    </div>
  )
}

function AccountingCard({
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

  if (!entries || entries.length === 0) return null

  const activeEntries = entries.filter((e) => !undoneIds.has(e.id))
  if (activeEntries.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-muted-foreground italic">
        <Undo2 className="size-3.5" />
        <span>Movimiento deshecho y eliminado</span>
      </div>
    )
  }

  const isGroup = activeEntries.length > 1
  const totalAmount = activeEntries.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="w-full">
      {isGroup && (
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-3.5 py-1.5 text-xs">
          <span className="font-700 text-muted-foreground">Compra desglosada</span>
          <span className="font-display font-800 text-foreground">
            Total: {formatMoney(totalAmount, currency)}
          </span>
        </div>
      )}

      <div className="divide-y divide-border/30">
        {activeEntries.map((expense) => {
          const cat = categoryOf(expense.category)
          const cleanNote = stripRecurringTag(expense.note)

          return (
            <div key={expense.id} className="flex flex-col gap-2 p-3">
              {/* Fila 1: Categoría interactiva y Monto */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => onQuickCategory(expense)}
                  className="group flex items-center gap-1.5 rounded-xl border border-border/50 px-2.5 py-1 text-xs font-700 transition-all hover:scale-102 active:scale-95"
                  style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)` }}
                  title="Toca para cambiar la categoría"
                >
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-foreground">{cat.label}</span>
                  <span className="text-[10px] text-muted-foreground transition-transform group-hover:translate-y-0.5">▾</span>
                </button>
                <span className="font-display text-base font-800 tabular-nums text-foreground">
                  {expense.kind === 'income' ? '+' : ''}
                  {formatMoney(expense.amount, currency)}
                </span>
              </div>

              {/* Fila 2: Detalle o nota */}
              {cleanNote && cleanNote.toLowerCase() !== cat.label.toLowerCase() && (
                <p className="text-xs font-500 text-muted-foreground px-0.5">{cleanNote}</p>
              )}

              {/* Fila 3: Acciones compactas que nunca colisionan */}
              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                <button
                  onClick={() => onQuickCategory(expense)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2.5 py-1 text-[11px] font-700 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
                  title="Cambiar categoría"
                >
                  <Tag className="size-3 text-primary" />
                  <span>Categoría</span>
                </button>
                <button
                  onClick={() => onEdit(expense)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2.5 py-1 text-[11px] font-700 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
                  title="Editar valor o nota"
                >
                  <Edit2 className="size-3 text-primary" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    setUndoneIds((prev) => new Set([...prev, expense.id]))
                    onDelete(expense.id)
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2.5 py-1 text-[11px] font-700 text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                  title="Deshacer y borrar este movimiento"
                >
                  <Undo2 className="size-3" />
                  <span>Deshacer</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
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
    ? ['Optimizando foto...', 'Leyendo factura con IA...', 'Separando mercado y canastas...']
    : ['Cuenti pensando...', 'Analizando montos y hábitos...', 'Guardando movimiento...']

  return (
    <div className="flex items-end gap-2 animate-float-up">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="size-4 animate-pulse" />
      </div>
      <div className="flex items-center gap-2.5 rounded-3xl rounded-bl-md bg-card/90 px-4 py-2.5 shadow-sm border border-border/40 backdrop-blur">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-primary"
              style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite` }}
            />
          ))}
        </div>
        <span className="text-xs font-600 text-muted-foreground transition-all duration-300">
          {phrases[stage]}
        </span>
      </div>
    </div>
  )
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-2xl text-xs font-700 text-white shadow-sm"
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
      <b key={i} className="font-700">
        {part.slice(1, -1)}
      </b>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
