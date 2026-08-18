'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Edit2, Loader2, Sparkles, Trash2, X } from 'lucide-react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bg = getBackground(room.chatBackground)

  const expenseById = useMemo(() => {
    const map = new Map<string, Expense>()
    for (const e of expenses) map.set(e.id, e)
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
    <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-2xl flex-col">
      <div className="px-4 pt-4">
        <BudgetSummary spent={spent} income={income} room={room} compact />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar relative flex-1 overflow-y-auto px-4 py-4"
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
              expense={m.expenseId ? expenseById.get(m.expenseId) : undefined}
              currency={room.currency}
              last={i === messages.length - 1}
              onEditExpense={onEditExpense}
              onDeleteExpense={onDeleteExpense}
              onEditExpense={setEditing}
            />
          ))}
          {thinking && <TypingBubble />}
        </div>
      </div>

      <div className="glass border-t border-border/60 px-4 pb-4 pt-3">
        {pendingFile && (
          <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingFile.url}
              alt="Factura por enviar"
              className="size-14 rounded-xl object-cover"
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

        <div className="flex items-end gap-2">
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
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-md"
          >
            <Camera className="size-5" />
          </button>

          <div className="flex flex-1 items-end rounded-2xl border border-border bg-card px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
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
              className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            onClick={submit}
            disabled={(!text.trim() && !pendingFile) || thinking}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-40 disabled:shadow-none"
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
  expense,
  currency,
  last,
  onEditExpense,
  onDeleteExpense,
}: {
  message: Message
  member?: Member
  isMine: boolean
  expense?: Expense
  currency: string
  last: boolean
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (id: string) => void
}) {
  const isBot = message.role === 'assistant'

  if (isBot) {
    return (
      <div className={cn('flex max-w-[85%] items-end gap-2', last && 'animate-float-up')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </div>
        <div className="rounded-3xl rounded-bl-md bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur">
          <p className="text-sm leading-relaxed text-foreground">{renderText(message.text)}</p>
          {expense && (
            <ExpenseChip
              expense={expense}
              currency={currency}
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
        'flex max-w-[85%] items-end gap-2',
        isMine && 'self-end',
        last && 'animate-float-up',
      )}
    >
      {!isMine && <Avatar initials={initials} color={color} />}
      <div
        className={cn(
          'rounded-3xl px-4 py-2.5 shadow-md',
          isMine
            ? 'rounded-br-md bg-primary text-primary-foreground shadow-primary/20'
            : 'rounded-bl-md bg-card text-foreground',
          message.pending && 'opacity-70',
        )}
      >
        {!isMine && (
          <p className="mb-0.5 text-[11px] font-700" style={{ color }}>
            {message.nick}
          </p>
        )}
        <ReceiptThumb message={message} />
        {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
      </div>
      {isMine && <Avatar initials={initials} color={color} />}
    </div>
  )
}

/** La foto vive en un bucket privado: hay que pedir una URL firmada. */
function ReceiptThumb({ message }: { message: Message }) {
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
    <div className="mb-2 overflow-hidden rounded-2xl bg-black/10">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Factura" className="max-h-56 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-4 animate-spin opacity-60" />
        </div>
      )}
    </div>
  )
}

function ExpenseChip({
  expense,
  currency,
  onEdit,
  onDelete,
}: {
  expense: Expense
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}) {
  const cat = categoryOf(expense.category)
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <button
        onClick={() => onEdit(expense)}
        title="Cambiar la categoría"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-700 text-foreground transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)` }}
      >
        <span>{cat.emoji}</span>
        <span>{cat.label}</span>
        <span className="opacity-50">·</span>
        <span>
          {expense.kind === 'income' ? '+' : ''}
          {formatMoney(expense.amount, currency)}
        </span>
      </button>
      <button
        onClick={() => onEdit(expense)}
        title="Editar o corregir este movimiento"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <Edit2 className="size-3.5" />
      </button>
      <button
        onClick={() => onDelete(expense.id)}
        title="Borrar este movimiento"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="size-4" />
      </div>
      <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-card/90 px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-muted-foreground"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
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
