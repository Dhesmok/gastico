'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Receipt, SendHorizontal, Sparkles } from 'lucide-react'
import {
  CATEGORIES,
  formatCOP,
  PEOPLE,
  type Author,
  type Message,
  type Settings,
} from '@/lib/finance'
import { getBackground } from '@/lib/backgrounds'
import { BudgetSummary } from '@/components/budget-summary'
import { cn } from '@/lib/utils'

const QUICK_CHIPS = ['Mercado 120mil', 'Uber 18k', 'Antojo 25.000', 'Cena 90mil']

export function ChatView({
  messages,
  spent,
  settings,
  onSend,
  onSendReceipt,
}: {
  messages: Message[]
  spent: number
  settings: Settings
  onSend: (text: string, author: Author) => void
  onSendReceipt: (author: Author) => void
}) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState<Author>('me')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bg = getBackground(settings.chatBackground)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function submit() {
    const value = text.trim()
    if (!value) return
    setText('')
    setTyping(true)
    onSend(value, author)
    window.setTimeout(() => setTyping(false), 650)
  }

  function receipt() {
    setTyping(true)
    onSendReceipt(author)
    window.setTimeout(() => setTyping(false), 900)
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-2xl flex-col">
      {/* Resumen fijo arriba */}
      <div className="px-4 pt-4">
        <BudgetSummary spent={spent} settings={settings} compact />
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="no-scrollbar relative flex-1 overflow-y-auto px-4 py-4" style={bg.style}>
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <MessageBubble key={m.id} message={m} last={i === messages.length - 1} />
          ))}
          {typing && <TypingBubble />}
        </div>
      </div>

      {/* Composer */}
      <div className="glass border-t border-border/60 px-4 pb-4 pt-3">
        {/* Selector de quién registra */}
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[11px] font-600 text-muted-foreground">Registra:</span>
          {(['me', 'partner'] as Author[]).map((a) => (
            <button
              key={a}
              onClick={() => setAuthor(a)}
              className={cn(
                'flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-700 transition-all',
                author === a
                  ? 'bg-primary/12 text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Avatar author={a} size={20} />
              {PEOPLE[a].name}
            </button>
          ))}
        </div>

        {/* Chips rápidos */}
        <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setText(chip)}
              className="shrink-0 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-600 text-foreground transition-colors hover:bg-muted"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={receipt}
            title="Enviar foto de factura (simulado)"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-md"
          >
            <Receipt className="size-5" />
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
              placeholder="Cuéntame el gasto… ej: “mercado 120mil”"
              className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-40 disabled:shadow-none"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, last }: { message: Message; last: boolean }) {
  const isBot = message.role === 'assistant'
  const person = PEOPLE[message.author]

  if (isBot) {
    return (
      <div className={cn('flex max-w-[85%] items-end gap-2', last && 'animate-float-up')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </div>
        <div className="rounded-3xl rounded-bl-md bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur">
          <p className="text-sm leading-relaxed text-foreground">{renderText(message.text)}</p>
          {message.expense && (
            <ExpenseChip amount={message.expense.amount} category={message.expense.category} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex max-w-[85%] items-end gap-2 self-end', last && 'animate-float-up')}>
      <div className="rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-md shadow-primary/20">
        {message.hasImage && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-xs font-600">
            <ImageIcon className="size-4" />
            Foto de factura
          </div>
        )}
        <p className="text-sm leading-relaxed">{message.text}</p>
      </div>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-2xl text-xs font-700 text-white shadow-sm"
        style={{ backgroundColor: person.color }}
      >
        {person.initials}
      </div>
    </div>
  )
}

function ExpenseChip({ amount, category }: { amount: number; category: keyof typeof CATEGORIES }) {
  const cat = CATEGORIES[category]
  return (
    <div
      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-700"
      style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 16%, transparent)`, color: 'var(--foreground)' }}
    >
      <span>{cat.emoji}</span>
      <span>{cat.label}</span>
      <span className="opacity-50">·</span>
      <span>{formatCOP(amount)}</span>
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

function Avatar({ author, size }: { author: Author; size: number }) {
  const person = PEOPLE[author]
  return (
    <span
      className="flex items-center justify-center rounded-full text-[10px] font-700 text-white"
      style={{ width: size, height: size, backgroundColor: person.color }}
    >
      {person.initials}
    </span>
  )
}

// Convierte *texto* en negrita simple para las respuestas del bot.
function renderText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? (
      <b key={i} className="font-700">
        {part.slice(1, -1)}
      </b>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
