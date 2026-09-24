'use client'

// ---------------------------------------------------------------------------
// La hoja que sube desde abajo.
//
// En el celular todo lo secundario (corregir un gasto, un formulario, el
// detalle de un número) aparece aquí, al alcance del pulgar, en vez de un
// cuadro flotando en la mitad de la pantalla. En el escritorio se centra.
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  className,
  tall = false,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  className?: string
  /** Para listas largas: ocupa casi toda la pantalla desde que abre. */
  tall?: boolean
}) {
  // Escape en el escritorio, y la página de atrás quieta mientras está abierta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        className="animate-fade-in absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'animate-sheet-up sm:animate-pop-in relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-background shadow-2xl sm:rounded-[1.75rem]',
          tall ? 'h-[92svh] sm:h-[80svh]' : 'max-h-[92svh] sm:max-h-[85svh]',
          className,
        )}
      >
        {/* La manija: dice "esto se puede cerrar" sin necesidad de texto. */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-foreground/15" />
        </div>

        {(title || subtitle) && (
          <div className="flex items-start gap-3 px-5 pb-2 pt-3 sm:pt-5">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="font-display text-xl font-500 leading-tight text-foreground">
                  {title}
                </h3>
              )}
              {subtitle && <p className="label mt-1 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(var(--safe-bottom)+1.25rem)] pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}

/** El campo de formulario de todas las hojas: etiqueta arriba, caja grande. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow mb-1.5 block">{children}</span>
}

export const inputClass =
  'h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-500 text-foreground outline-none transition-colors placeholder:font-400 placeholder:text-muted-foreground focus:border-foreground/40'
