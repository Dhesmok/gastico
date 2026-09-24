'use client'

import { CalendarClock, MessageCircle, PieChart, Settings2 } from 'lucide-react'
import type { View } from '@/components/top-bar'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  currentView: View
  onChangeView: (view: View) => void
  overBudget?: boolean
  thinking?: boolean
}

export const TABS: { id: View; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'stats', label: 'Resumen', icon: PieChart },
  { id: 'recurring', label: 'Fijos', icon: CalendarClock },
  { id: 'settings', label: 'Ajustes', icon: Settings2 },
]

/**
 * El dock flotante del celular. Es de tinta, como el resumen, y la pestaña
 * activa se abre en una pastilla con su nombre: las demás son sólo íconos,
 * así cuatro opciones no se sienten como un menú de oficina.
 */
export function BottomNav({
  currentView,
  onChangeView,
  overBudget = false,
  thinking = false,
}: BottomNavProps) {
  return (
    <nav
      data-dock
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(var(--safe-bottom)+0.625rem)] md:hidden"
    >
      <div className="ink pointer-events-auto flex h-14 w-full max-w-sm items-center justify-between gap-1 rounded-full p-1.5 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)]">
        {TABS.map((tab) => {
          const active = currentView === tab.id
          const Icon = tab.icon
          const dot =
            (tab.id === 'chat' && thinking) || (tab.id === 'stats' && overBudget)
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={cn(
                'relative flex h-full items-center justify-center gap-1.5 rounded-full transition-all duration-300 ease-out active:scale-95',
                active
                  ? 'flex-[1.9] bg-highlight px-3 text-highlight-foreground'
                  : 'flex-1 text-ink-muted',
              )}
            >
              <span className="relative">
                <Icon className="size-[1.2rem]" strokeWidth={active ? 2.3 : 1.8} />
                {dot && (
                  <span
                    className={cn(
                      'absolute -right-1 -top-0.5 size-2 rounded-full ring-2',
                      tab.id === 'chat' ? 'animate-pulse bg-highlight' : 'bg-primary',
                      active ? 'ring-highlight' : 'ring-ink',
                    )}
                  />
                )}
              </span>
              {active && <span className="text-[13px] font-700">{tab.label}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
