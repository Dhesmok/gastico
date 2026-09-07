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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-xl md:hidden pb-safe"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {TABS.map((tab) => {
          const active = currentView === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-2xl px-4 py-1 transition-all duration-200',
                  active ? 'bg-primary/15 text-primary shadow-xs' : 'group-hover:bg-muted/50',
                )}
              >
                <Icon
                  className={cn(
                    'size-5 transition-transform duration-200',
                    active ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]',
                  )}
                />
                {tab.id === 'chat' && thinking && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                  </span>
                )}
                {tab.id === 'stats' && overBudget && (
                  <span
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-background"
                    aria-label="Presupuesto excedido"
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight transition-all duration-200',
                  active ? 'font-800 text-primary' : 'font-600 text-muted-foreground',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
