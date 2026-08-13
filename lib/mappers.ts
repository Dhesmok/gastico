// ---------------------------------------------------------------------------
// Traducción entre las filas de Postgres (snake_case) y los modelos de la app
// (camelCase). Vive aparte de lib/room.ts porque también lo usa la ruta de
// servidor /api/chat, que no puede importar módulos marcados 'use client'.
// ---------------------------------------------------------------------------

import type { CategoryId, Expense, Kind, Member, Message, Room } from '@/lib/finance'

export type Row = Record<string, any>

export function toRoom(r: Row): Room {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    currency: r.currency ?? 'COP',
    monthlyIncome: Number(r.monthly_income ?? 0),
    spendingCap: Number(r.spending_cap ?? 0),
    chatBackground: r.chat_background ?? 'cozy',
    humor: r.humor ?? true,
    keepReceipts: r.keep_receipts ?? true,
    receiptRetentionMonths: r.receipt_retention_months ?? 6,
  }
}

export function toMember(r: Row): Member {
  return { userId: r.user_id, nick: r.nick, color: r.color, isOwner: r.is_owner ?? false }
}

export function toExpense(r: Row): Expense {
  return {
    id: r.id,
    roomId: r.room_id,
    userId: r.user_id ?? null,
    nick: r.nick ?? 'alguien',
    kind: (r.kind ?? 'expense') as Kind,
    amount: Number(r.amount),
    category: (r.category ?? 'otros') as CategoryId,
    note: r.note ?? '',
    occurredAt: r.occurred_at,
    receiptPath: r.receipt_path ?? null,
    createdAt: r.created_at,
  }
}

export function toMessage(r: Row): Message {
  return {
    id: r.id,
    roomId: r.room_id,
    userId: r.user_id ?? null,
    nick: r.nick ?? null,
    role: r.role,
    text: r.text ?? '',
    imagePath: r.image_path ?? null,
    expenseId: r.expense_id ?? null,
    createdAt: r.created_at,
  }
}
