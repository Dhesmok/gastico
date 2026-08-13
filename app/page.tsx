'use client'

import { useMemo, useState } from 'react'
import { LoginScreen } from '@/components/login-screen'
import { TopBar, type View } from '@/components/top-bar'
import { ChatView } from '@/components/chat-view'
import { StatsView } from '@/components/stats-view'
import { SettingsView } from '@/components/settings-view'
import {
  DEFAULT_SETTINGS,
  interpret,
  interpretReceipt,
  makeStarterMessages,
  SAMPLE_EXPENSES,
  totalOf,
  type Author,
  type Expense,
  type Message,
  type Settings,
} from '@/lib/finance'

let seq = 0
const nextId = (p: string) => `${p}-${Date.now()}-${seq++}`

export default function Page() {
  const [authed, setAuthed] = useState(false)
  const [view, setView] = useState<View>('chat')
  const [expenses, setExpenses] = useState<Expense[]>(SAMPLE_EXPENSES)
  const [messages, setMessages] = useState<Message[]>(makeStarterMessages)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const humor = true
  const spent = useMemo(() => totalOf(expenses), [expenses])
  const overBudget = spent > settings.spendingCap

  function handleSend(text: string, author: Author) {
    const userMsg: Message = {
      id: nextId('m'),
      role: 'user',
      author,
      text,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])

    const result = interpret(text, humor)

    // Respuesta simulada del bot con un pequeño retraso
    window.setTimeout(() => {
      let addedExpense: Expense | undefined
      if (result.expense) {
        addedExpense = {
          ...result.expense,
          id: nextId('e'),
          author,
          date: new Date().toISOString(),
        }
        setExpenses((prev) => [addedExpense as Expense, ...prev])
      }
      const botMsg: Message = {
        id: nextId('m'),
        role: 'assistant',
        author,
        text: result.reply,
        createdAt: Date.now(),
        expense: addedExpense,
      }
      setMessages((prev) => [...prev, botMsg])
    }, 650)
  }

  function handleReceipt(author: Author) {
    const userMsg: Message = {
      id: nextId('m'),
      role: 'user',
      author,
      text: 'Te mando la factura 📸',
      createdAt: Date.now(),
      hasImage: true,
    }
    setMessages((prev) => [...prev, userMsg])

    const result = interpretReceipt(humor)
    window.setTimeout(() => {
      let addedExpense: Expense | undefined
      if (result.expense) {
        addedExpense = {
          ...result.expense,
          id: nextId('e'),
          author,
          date: new Date().toISOString(),
        }
        setExpenses((prev) => [addedExpense as Expense, ...prev])
      }
      const botMsg: Message = {
        id: nextId('m'),
        role: 'assistant',
        author,
        text: result.reply,
        createdAt: Date.now(),
        expense: addedExpense,
      }
      setMessages((prev) => [...prev, botMsg])
    }, 900)
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-svh bg-background">
      <TopBar view={view} onChangeView={setView} onLogout={() => setAuthed(false)} overBudget={overBudget} />
      {view === 'chat' && (
        <ChatView
          messages={messages}
          spent={spent}
          settings={settings}
          onSend={handleSend}
          onSendReceipt={handleReceipt}
        />
      )}
      {view === 'stats' && <StatsView expenses={expenses} settings={settings} />}
      {view === 'settings' && <SettingsView settings={settings} onChange={setSettings} />}
    </div>
  )
}
