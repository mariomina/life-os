import { describe, it, expect } from 'vitest'

// ─── Pure validation helpers (extracted from actions/inbox.ts logic) ──────────
// These tests verify the validation rules without hitting the database.
// Story 6.1 — Captura Rápida Inbox.

function validateCreateInboxItem(rawText: unknown): string | null {
  if (typeof rawText !== 'string') return 'El texto no puede estar vacío'
  const trimmed = rawText.trim()
  if (!trimmed) return 'El texto no puede estar vacío'
  return null
}

function validateDiscardInboxItem(itemId: unknown): string | null {
  if (!itemId || typeof itemId !== 'string' || !itemId.trim()) return 'ID de item inválido'
  return null
}

// Status filter validation (mirrors getInboxItemsByUser optional param)
type InboxStatus = 'pending' | 'processing' | 'processed' | 'manual' | 'discarded'
const VALID_STATUSES: InboxStatus[] = ['pending', 'processing', 'processed', 'manual', 'discarded']

function isValidStatusFilter(status: string): status is InboxStatus {
  return VALID_STATUSES.includes(status as InboxStatus)
}

// ─── Pending count capping ────────────────────────────────────────────────────

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ─── createInboxItem — validation ────────────────────────────────────────────

describe('createInboxItem — input validation', () => {
  it('rejects empty string', () => {
    expect(validateCreateInboxItem('')).toBe('El texto no puede estar vacío')
  })

  it('rejects whitespace-only string', () => {
    expect(validateCreateInboxItem('   ')).toBe('El texto no puede estar vacío')
  })

  it('rejects null', () => {
    expect(validateCreateInboxItem(null)).toBe('El texto no puede estar vacío')
  })

  it('rejects undefined', () => {
    expect(validateCreateInboxItem(undefined)).toBe('El texto no puede estar vacío')
  })

  it('accepts non-empty text', () => {
    expect(validateCreateInboxItem('Llamar al médico')).toBeNull()
  })

  it('accepts text with surrounding whitespace (trimmed)', () => {
    expect(validateCreateInboxItem('  Comprar leche  ')).toBeNull()
  })
})

// ─── discardInboxItem — validation ───────────────────────────────────────────

describe('discardInboxItem — input validation', () => {
  it('rejects empty string', () => {
    expect(validateDiscardInboxItem('')).toBe('ID de item inválido')
  })

  it('rejects null', () => {
    expect(validateDiscardInboxItem(null)).toBe('ID de item inválido')
  })

  it('rejects undefined', () => {
    expect(validateDiscardInboxItem(undefined)).toBe('ID de item inválido')
  })

  it('accepts valid UUID', () => {
    expect(validateDiscardInboxItem(VALID_UUID)).toBeNull()
  })

  it('accepts any non-empty string (server enforces UUID via DB)', () => {
    expect(validateDiscardInboxItem('some-id')).toBeNull()
  })
})

// ─── Status filter validation ─────────────────────────────────────────────────

describe('getInboxItemsByUser — status filter validation', () => {
  it('accepts pending status', () => {
    expect(isValidStatusFilter('pending')).toBe(true)
  })

  it('accepts processed status', () => {
    expect(isValidStatusFilter('processed')).toBe(true)
  })

  it('accepts discarded status', () => {
    expect(isValidStatusFilter('discarded')).toBe(true)
  })

  it('accepts manual status', () => {
    expect(isValidStatusFilter('manual')).toBe(true)
  })

  it('accepts processing status', () => {
    expect(isValidStatusFilter('processing')).toBe(true)
  })

  it('rejects unknown status', () => {
    expect(isValidStatusFilter('unknown')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidStatusFilter('')).toBe(false)
  })
})

// ─── Badge count formatting ───────────────────────────────────────────────────

describe('sidebar badge count formatting', () => {
  it('shows count as-is for 1', () => {
    expect(formatBadgeCount(1)).toBe('1')
  })

  it('shows count as-is for 99', () => {
    expect(formatBadgeCount(99)).toBe('99')
  })

  it('caps at 99+ for 100', () => {
    expect(formatBadgeCount(100)).toBe('99+')
  })

  it('caps at 99+ for large numbers', () => {
    expect(formatBadgeCount(999)).toBe('99+')
  })

  it('shows 0 for zero', () => {
    expect(formatBadgeCount(0)).toBe('0')
  })
})
