'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  DoorOpen,
  HeartHandshake,
  LogOut,
  MessageCircle,
  Settings,
} from 'lucide-react'
import type { Member, Room } from '@/lib/finance'
import { cn } from '@/lib/utils'

export type View = 'chat' | 'stats' | 'settings'

const ITEMS: { id: View; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const current = ITEMS.find((i) => i.id === view)!
  const roster =
    members.length <= 3
      ? members.map((m) => m.nick).join(' & ')
      : `${members.length} personas`

  return (
    <header className="glass sticky top-0 z-30 border-b border-border/60">
      <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <HeartHandshake className="size-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-base font-700 text-foreground">{room.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roster}</p>
          </div>
        </div>

        <div ref={ref} className="relative shrink-0">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card/70 py-2 pl-3 pr-2.5 text-sm font-700 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <current.icon className="size-4 text-primary" />
            <span className="hidden sm:inline">{current.label}</span>
            {overBudget && (
              <span
                className="size-2 rounded-full bg-destructive"
                aria-label="Alerta de presupuesto"
              />
            )}
            <ChevronDown
              className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="glass-strong absolute right-0 top-full z-40 mt-2 w-56 origin-top-right animate-pop-in overflow-hidden rounded-3xl border border-border/70 p-2 shadow-xl"
            >
              {ITEMS.map((item) => (
                <button
                  key={item.id}
                  role="menuitem"
                  onClick={() => {
                    onChangeView(item.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-600 transition-colors',
                    view === item.id ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                  {item.id === 'stats' && overBudget && (
                    <span className="ml-auto rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-700 text-destructive">
                      alerta
                    </span>
                  )}
                </button>
              ))}
              <div className="my-1.5 h-px bg-border/70" />
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onExit()
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-600 text-foreground transition-colors hover:bg-muted"
              >
                <DoorOpen className="size-4" />
                Cambiar de sala
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-600 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
