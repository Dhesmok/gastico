'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { LoginScreen } from '@/components/login-screen'
import { RoomGate } from '@/components/room-gate'
import { TopBar, type View } from '@/components/top-bar'
import { ChatView } from '@/components/chat-view'
import { StatsView } from '@/components/stats-view'
import { RecurringView } from '@/components/recurring-view'
import { SettingsView } from '@/components/settings-view'
import { EditExpenseModal } from '@/components/edit-expense-modal'
import {
  currentSession,
  getSupabase,
  signOut,
  supabaseConfigured,
} from '@/lib/supabase/client'
import {
  deleteExpense as deleteExpenseRow,
  forgetRoom,
  insertExpenses,
  insertUserMessage,
  lastRoomId,
  leaveRoom,
  loadRoom,
  purgeOldReceipts,
  rememberRoom,
  subscribeToRoom,
  toExpense,
  toMessage,
  updateExpense as updateExpenseRow,
  updateNick,
  updateRoom,
  uploadReceipt,
} from '@/lib/room'
import { prepareReceipt } from '@/lib/image'
import {
  filterByRange,
  incomeBudget,
  periodRange,
  sumExpenses,
  type CategoryId,
  type Expense,
  type Member,
  type Message,
  type Room,
} from '@/lib/finance'
import { applyStoredTheme } from '@/lib/theme'

type Phase = 'booting' | 'login' | 'gate' | 'loading' | 'ready'

export default function Page() {
  const [phase, setPhase] = useState<Phase>('booting')
  const [userId, setUserId] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [view, setView] = useState<View>('chat')
  const [thinking, setThinking] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const roomIdRef = useRef<string | null>(null)
  roomIdRef.current = roomId

  const notify = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 4000)
  }, [])

  // ---- Arranque: sesión guardada + última sala usada ----------------------
  useEffect(() => {
    applyStoredTheme()

    if (!supabaseConfigured) {
      setConfigError(
        'Faltan las variables de entorno de Supabase. Copia .env.example a .env.local y llénalas (ver SETUP.md).',
      )
      setPhase('login')
      return
    }

    let cancelled = false
    currentSession()
      .then((session) => {
        if (cancelled) return
        if (!session) {
          setPhase('login')
          return
        }
        setUserId(session.user.id)
        const saved = lastRoomId()
        if (saved) {
          setRoomId(saved)
          setPhase('loading')
        } else {
          setPhase('gate')
        }
      })
      .catch(() => {
        if (cancelled) return
        setPhase('login')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Tras entrar con usuario y contraseña, seguir hacia la sala.
  const handleLoggedIn = useCallback(async () => {
    const session = await currentSession()
    if (!session) return
    setUserId(session.user.id)
    const saved = lastRoomId()
    if (saved) {
      setRoomId(saved)
      setPhase('loading')
    } else {
      setPhase('gate')
    }
  }, [])

  // ---- Carga de la sala + suscripción en vivo -----------------------------
  useEffect(() => {
    if (!roomId || !userId) return

    let cancelled = false
    setPhase('loading')

    loadRoom(roomId)
      .then((snapshot) => {
        if (cancelled) return
        setRoom(snapshot.room)
        setMembers(snapshot.members)
        setMessages(snapshot.messages)
        setExpenses(snapshot.expenses)
        setPhase('ready')
        rememberRoom(roomId)
        // Limpieza silenciosa de fotos viejas, para no llenar el plan gratis.
        purgeOldReceipts(snapshot.room).catch(() => {})
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // La sala guardada ya no existe o perdimos el acceso: volver al inicio.
        console.error('[sala] no pude cargarla:', error)
        forgetRoom()
        setRoomId(null)
        setRoom(null)
        setPhase('gate')
        notify('No pude abrir esa sala. Vuelve a entrar con el ID y la contraseña.')
      })

    const channel = subscribeToRoom(roomId, {
      onMessage: (m) => mergeMessage(m),
      onExpenseInsert: (e) => mergeExpense(e),
      onExpenseUpdate: (e) => mergeExpense(e),
      onExpenseDelete: (id) => setExpenses((prev) => prev.filter((e) => e.id !== id)),
      onRoomUpdate: (r) => setRoom(r),
    })

    return () => {
      cancelled = true
      getSupabase().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId])

  // Los mensajes y gastos llegan por dos vías (la respuesta del servidor y el
  // canal en vivo). Fusionar por id evita duplicados.
  const mergeMessage = useCallback((incoming: Message) => {
    setMessages((prev) => {
      const i = prev.findIndex((m) => m.id === incoming.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...prev[i], ...incoming }
        return next
      }
      return [...prev, incoming]
    })
  }, [])

  const mergeExpense = useCallback((incoming: Expense) => {
    setExpenses((prev) => {
      const i = prev.findIndex((e) => e.id === incoming.id)
      if (i >= 0) {
        const next = [...prev]
        next[i] = incoming
        return next
      }
      return [incoming, ...prev]
    })
  }, [])

  const me = useMemo(
    () => members.find((m) => m.userId === userId) ?? null,
    [members, userId],
  )

  const monthItems = useMemo(() => filterByRange(expenses, periodRange('month')), [expenses])
  const monthSpent = useMemo(() => sumExpenses(monthItems), [monthItems])
  const monthIncome = useMemo(
    () => incomeBudget(monthItems, room?.monthlyIncome ?? 0, 1),
    [monthItems, room?.monthlyIncome],
  )

  const overBudget = room ? monthSpent > room.spendingCap && room.spendingCap > 0 : false

  // ---- Enviar al bot -------------------------------------------------------

  const callBot = useCallback(
    async (payload: {
      text: string
      image?: { base64: string; mimeType: string } | null
      receiptPath?: string | null
    }) => {
      const currentRoom = roomIdRef.current
      if (!currentRoom) return

      const { data } = await getSupabase().auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Se venció la sesión. Recarga la página.')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: currentRoom, ...payload }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.error ?? 'El bot no respondió. Intenta de nuevo.')
      }

      const result = await response.json()
      if (result.message) mergeMessage(toMessage(result.message))
      for (const row of result.expenses ?? []) mergeExpense(toExpense(row))
      return result
    },
    [mergeExpense, mergeMessage],
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (!roomId || !userId || !me) return
      setThinking(true)

      const tempId = `temp-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          roomId,
          userId,
          nick: me.nick,
          role: 'user',
          text,
          imagePath: null,
          expenseId: null,
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ])

      try {
        const saved = await insertUserMessage({ roomId, userId, nick: me.nick, text })
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)))
        await callBot({ text })
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        notify(error instanceof Error ? error.message : 'No pude enviar el mensaje.')
      } finally {
        setThinking(false)
      }
    },
    [callBot, me, notify, roomId, userId],
  )

  const handleReceipt = useCallback(
    async (file: File, caption: string) => {
      if (!roomId || !userId || !me || !room) return
      setThinking(true)

      const tempId = `temp-${Date.now()}`
      let previewUrl: string | null = null

      try {
        const prepared = await prepareReceipt(file)
        previewUrl = prepared.previewUrl

        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            roomId,
            userId,
            nick: me.nick,
            role: 'user',
            text: caption || 'Te mando la factura 📸',
            imagePath: null,
            expenseId: null,
            createdAt: new Date().toISOString(),
            localImageUrl: prepared.previewUrl,
            pending: true,
          },
        ])

        // Guardar la foto es opcional: si está apagado, la imagen sólo pasa
        // por Gemini para leerla y no ocupa ni un byte en Storage.
        let receiptPath: string | null = null
        if (room.keepReceipts) {
          try {
            receiptPath = await uploadReceipt(roomId, prepared.blob, prepared.mimeType)
          } catch (error) {
            console.error('[factura] no pude subirla:', error)
            notify('No pude guardar la foto, pero igual leo la factura.')
          }
        }

        const saved = await insertUserMessage({
          roomId,
          userId,
          nick: me.nick,
          text: caption || 'Te mando la factura 📸',
          imagePath: receiptPath,
        })
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...saved, localImageUrl: previewUrl ?? undefined } : m)),
        )

        await callBot({
          text: caption,
          image: { base64: prepared.base64, mimeType: prepared.mimeType },
          receiptPath,
        })
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        notify(error instanceof Error ? error.message : 'No pude procesar la factura.')
      } finally {
        setThinking(false)
      }
    },
    [callBot, me, notify, room, roomId, userId],
  )

  // ---- Correcciones --------------------------------------------------------

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      const previous = expenses
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      try {
        await deleteExpenseRow(id)
        notify('Movimiento borrado.')
      } catch (error) {
        setExpenses(previous)
        notify(error instanceof Error ? error.message : 'No pude borrarlo.')
      }
    },
    [expenses, notify],
  )

  const handleUpdateExpense = useCallback(
    async (id: string, patch: Partial<Expense>) => {
      const previous = expenses
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
      try {
        await updateExpenseRow(id, patch)
      } catch (error) {
        setExpenses(previous)
        notify(error instanceof Error ? error.message : 'No pude corregirlo.')
      }
    },
    [expenses, notify],
  )

  const handleOpenEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense)
    setIsEditModalOpen(true)
  }, [])

  const handleAddDirectExpense = useCallback(
    async (entry: {
      kind: 'expense'
      amount: number
      category: CategoryId
      note: string
      occurredAt?: string
    }) => {
      if (!roomId || !userId || !me) return
      const created = await insertExpenses(roomId, userId, me.nick, [entry])
      if (created.length > 0) {
        setExpenses((prev) => [created[0], ...prev])
      }
    },
    [me, roomId, userId],
  )

  // ---- Ajustes -------------------------------------------------------------

  const handleRoomChange = useCallback(
    async (patch: Partial<Room>) => {
      if (!room) return
      const previous = room
      setRoom({ ...room, ...patch })
      try {
        await updateRoom(room.id, patch)
      } catch (error) {
        setRoom(previous)
        notify(error instanceof Error ? error.message : 'No pude guardar el cambio.')
      }
    },
    [notify, room],
  )

  const handleNickChange = useCallback(
    async (nick: string) => {
      if (!room || !userId) return
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, nick } : m)))
      try {
        await updateNick(room.id, userId, nick)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'No pude cambiar tu apodo.')
      }
    },
    [notify, room, userId],
  )

  const clearRoomState = useCallback(() => {
    forgetRoom()
    setRoomId(null)
    setRoom(null)
    setMessages([])
    setExpenses([])
    setMembers([])
    setView('chat')
  }, [])

  /** Vuelve al selector de sala, sin cerrar la sesión. */
  const handleExit = useCallback(() => {
    clearRoomState()
    setPhase('gate')
  }, [clearRoomState])

  const handleSignOut = useCallback(async () => {
    clearRoomState()
    setUserId(null)
    await signOut().catch(() => {})
    setPhase('login')
  }, [clearRoomState])

  const handleLeaveRoom = useCallback(async () => {
    if (!room || !userId) return
    await leaveRoom(room.id, userId).catch(() => {})
    handleExit()
  }, [handleExit, room, userId])

  // ---- Render --------------------------------------------------------------

  if (phase === 'booting') {
    return <FullScreenLoader label="Abriendo la app…" />
  }

  if (phase === 'login' || !userId) {
    return <LoginScreen configError={configError} onLogin={handleLoggedIn} />
  }

  if (phase === 'gate' || !roomId) {
    return (
      <RoomGate
        onReady={(id) => {
          setRoomId(id)
          setPhase('loading')
        }}
        onSignOut={handleSignOut}
      />
    )
  }

  if (phase === 'loading' || !room || !me) {
    return <FullScreenLoader label="Cargando la sala…" />
  }

  return (
    <div className="min-h-svh bg-background">
      <TopBar
        room={room}
        members={members}
        view={view}
        onChangeView={setView}
        onExit={handleExit}
        onSignOut={handleSignOut}
        overBudget={overBudget}
      />

      {view === 'chat' && (
        <ChatView
          room={room}
          members={members}
          messages={messages}
          expenses={expenses}
          me={me}
          thinking={thinking}
          spent={monthSpent}
          income={monthIncome}
          onSend={handleSend}
          onSendReceipt={handleReceipt}
          onEditExpense={handleOpenEditExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      )}

      {view === 'stats' && (
        <StatsView
          room={room}
          members={members}
          expenses={expenses}
          onEditExpense={handleOpenEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onUpdateExpense={handleUpdateExpense}
        />
      )}

      {view === 'recurring' && (
        <RecurringView
          room={room}
          members={members}
          expenses={expenses}
          me={me}
          onAddExpense={handleAddDirectExpense}
          notify={notify}
        />
      )}

      {view === 'settings' && (
        <SettingsView
          room={room}
          members={members}
          me={me}
          onChange={handleRoomChange}
          onNickChange={handleNickChange}
          onLeaveRoom={handleLeaveRoom}
          onSignOut={handleSignOut}
          notify={notify}
        />
      )}

      {/* Modal para Corregir / Editar / Cambiar a Ingreso cualquier Movimiento */}
      <EditExpenseModal
        expense={editingExpense}
        currency={room.currency}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingExpense(null)
        }}
        onSave={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <p className="glass-strong animate-pop-in max-w-md rounded-2xl border border-border/70 px-4 py-2.5 text-center text-xs font-600 leading-relaxed text-foreground shadow-lg">
            {toast}
          </p>
        </div>
      )}
    </div>
  )
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-7 animate-spin text-primary" />
      <p className="text-sm font-600 text-muted-foreground">{label}</p>
    </main>
  )
}
