'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  Copy,
  Check,
  DoorOpen,
  HeartHandshake,
  LogOut,
  MessageCircle,
  Settings,
} from 'lucide-react'
import type { Member, Room } from '@/lib/finance'
import { formatCode } from '@/lib/room'
import { cn } from '@/lib/utils'

export type View = 'chat' | 'stats' | 'recurring' | 'settings'

const ITEMS: { id: View; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'recurring', label: 'Gastos Fijos', icon: CalendarClock },
  { id: 'settings', label: 'Configuración', icon: Settings },
]

export function TopBar({
  room,
  members,
  view,
  onChangeView,
  onExit,
  onSignOut,
  overBudget,
}: {
  room: Room
  members: Member[]
  view: View
  onChangeView: (v: View) => void
  onExit: () => void
  onSignOut: () => void
  overBudget: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function copyCode() {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const current = ITEMS.find((i) => i.id === view)!
  const roster =
    members.length <= 3
      ? members.map((m) => m.nick).join(' & ')
      : `${members.length} personas`

  return (
    <header className="glass pt-safe sticky top-0 z-30 border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartHandshake className="size-4.5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[15px] font-600 text-foreground">
              {room.name}
            </p>
            <p className="label truncate">{roster}</p>
          </div>
        </div>

        <div ref={ref} className="relative shrink-0">
          {/* Versión móvil: pastilla de sala clara */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-full bg-muted py-1.5 pl-3 pr-2 text-foreground transition-colors hover:bg-secondary active:opacity-70 md:hidden"
            title="Opciones de sala"
          >
            <span className="font-mono text-[11px] font-500 text-muted-foreground">
              {formatCode(room.code)}
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>

          {/* Versión escritorio: selector de vista */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="hidden items-center gap-2 rounded-full bg-muted py-1.5 pl-3 pr-2.5 text-sm font-500 text-foreground transition-colors hover:bg-secondary md:flex"
          >
            <current.icon className="size-4 text-muted-foreground" />
            <span>{current.label}</span>
            {overBudget && (
              <span
                className="size-1.5 rounded-full bg-destructive"
                aria-label="Alerta de presupuesto"
              />
            )}
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="glass-strong animate-pop-in absolute right-0 top-full z-40 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-border p-1.5 shadow-lg"
            >
              {/* Vistas solo en pantallas medianas / escritorio */}
              <div className="hidden md:block">
                {ITEMS.map((item) => (
                  <button
                    key={item.id}
                    role="menuitem"
                    onClick={() => {
                      onChangeView(item.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                      view === item.id
                        ? 'bg-muted font-600 text-primary'
                        : 'font-500 text-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {item.id === 'stats' && overBudget && (
                      <span className="ml-auto size-1.5 rounded-full bg-destructive" />
                    )}
                  </button>
                ))}
                <div className="my-1.5 h-px bg-border" />
              </div>

              {/* Acciones de la sala (móvil y escritorio) */}
              <div className="px-3 py-1.5 text-left">
                <p className="label">Código de sala</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-500 text-foreground">
                    {formatCode(room.code)}
                  </span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-xs font-500 text-primary"
                    title="Copiar código de la sala"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="my-1.5 h-px bg-border" />

              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onExit()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-500 text-foreground transition-colors hover:bg-muted"
              >
                <DoorOpen className="size-4 text-muted-foreground" />
                Cambiar de sala
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-500 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
