'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, DoorOpen, LogOut } from 'lucide-react'
import type { Member, Room } from '@/lib/finance'
import { formatCode } from '@/lib/room'
import { TABS } from '@/components/bottom-nav'
import { cn } from '@/lib/utils'

export type View = 'chat' | 'stats' | 'recurring' | 'settings'

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
    function onClick(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('touchstart', onClick)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('touchstart', onClick)
    }
  }, [])

  function copyCode() {
    navigator.clipboard?.writeText(room.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="glass pt-safe sticky top-0 z-30">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo />
          <p className="truncate font-display text-lg font-500 text-foreground">{room.name}</p>
        </div>

        {/* En el escritorio las pestañas viven aquí arriba, a la vista. */}
        <nav className="hidden items-center gap-1 rounded-full bg-muted p-1 md:flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              aria-current={view === tab.id ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors',
                view === tab.id
                  ? 'ink font-700'
                  : 'font-600 text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.id === 'stats' && overBudget && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        <div ref={ref} className="relative shrink-0">
          {/* Las caras de la sala: dicen quién está sin gastar una línea. */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Opciones de la sala"
            className="flex items-center rounded-full p-0.5 transition-transform active:scale-95"
          >
            <span className="flex -space-x-2">
              {members.slice(0, 3).map((m) => (
                <span
                  key={m.userId}
                  className="flex size-8 items-center justify-center rounded-full text-xs font-800 text-white ring-2 ring-background"
                  style={{ backgroundColor: m.color }}
                >
                  {m.nick.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {members.length > 3 && (
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-700 text-muted-foreground ring-2 ring-background">
                  +{members.length - 3}
                </span>
              )}
            </span>
          </button>

          {open && (
            <div
              role="menu"
              className="glass-strong animate-pop-in absolute right-0 top-full z-40 mt-2 w-64 origin-top-right overflow-hidden rounded-3xl border border-border p-2 shadow-xl"
            >
              <div className="px-3 pb-2 pt-1.5">
                <p className="eyebrow">En la sala</p>
                <p className="mt-0.5 truncate text-sm font-600 text-foreground">
                  {members.map((m) => m.nick).join(', ')}
                </p>
              </div>

              <button
                onClick={copyCode}
                className="flex w-full items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2.5 text-left"
              >
                <span>
                  <span className="eyebrow block">ID para invitar</span>
                  <span className="font-mono text-sm font-600 tracking-wider text-foreground">
                    {formatCode(room.code)}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs font-700 text-primary">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Listo' : 'Copiar'}
                </span>
              </button>

              <div className="mt-1.5">
                <MenuItem
                  icon={DoorOpen}
                  label="Cambiar de sala"
                  onClick={() => {
                    setOpen(false)
                    onExit()
                  }}
                />
                <MenuItem
                  icon={LogOut}
                  label="Cerrar sesión"
                  danger
                  onClick={() => {
                    setOpen(false)
                    onSignOut()
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof LogOut
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-600 transition-colors hover:bg-muted',
        danger ? 'text-muted-foreground hover:text-destructive' : 'text-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

/** La marca: un tiquete con la esquina doblada, en tinta y tomate. */
export function Logo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const big = size === 'lg'
  return (
    <span
      className={cn(
        'ink relative flex shrink-0 items-center justify-center font-display font-600',
        big ? 'size-16 rounded-[1.4rem] text-3xl' : 'size-8 rounded-[0.7rem] text-base',
      )}
      aria-hidden
    >
      <span className="-mt-px">$</span>
      <span
        className={cn(
          'absolute rounded-full bg-primary',
          big ? 'right-2.5 top-2.5 size-2.5' : 'right-1 top-1 size-1.5',
        )}
      />
    </span>
  )
}
