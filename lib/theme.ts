'use client'

// Modo claro / oscuro. Se guarda en el dispositivo, no en la sala: cada quien
// lo prefiere distinto y anotar gastos de noche con la pantalla en blanco duele.

export type Theme = 'light' | 'dark'

const KEY = 'cuentas-claras:theme'

export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function systemTheme(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function currentTheme(): Theme {
  return storedTheme() ?? systemTheme()
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* modo incógnito */
  }
}

export function applyStoredTheme() {
  const theme = currentTheme()
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}
