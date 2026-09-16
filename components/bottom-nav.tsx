'use client'

import { BarChart3, CalendarClock, MessageCircle, Settings } from 'lucide-react'
import type { View } from '@/components/top-bar'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  currentView: View
  onChangeView: (view: View) => void
  overBudget?: boolean
  thinking?: boolean
}

const TABS: { id: View; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'recurring', label: 'Fijos', icon: CalendarClock },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

export function BottomNav({
  currentView,
  onChangeView,
  overBudget = false,
  thinking = false,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal móvil"
      className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border md:hidden"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = currentView === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                // El estado activo se dice con color, no con una pastilla de
                // fondo: cuatro pastillas seguidas cargaban la barra entera.
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:opacity-70',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className="relative">
                <Icon className={cn('size-5', active ? 'stroke-[2.2]' : 'stroke-[1.7]')} />
                {tab.id === 'chat' && thinking && (
                  <span className="absolute -right-1 -top-0.5 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                )}
                {tab.id === 'stats' && overBudget && (
                  <span
                    className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-destructive"
                    aria-label="Presupuesto excedido"
                  />
                )}
              </span>
              <span className={cn('text-[10px]', active ? 'font-600' : 'font-500')}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
