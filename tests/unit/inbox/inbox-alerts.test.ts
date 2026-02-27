import { describe, it, expect } from 'vitest'
import { getInboxAccumulationAlert } from '@/features/inbox/alerts'

// ─── Story 6.5 — Inbox Accumulation Alert Tests ───────────────────────────────
// Pure logic tests for getInboxAccumulationAlert.
// No DB or network calls — function accepts plain InboxItem array.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

// Minimal mock that matches InboxItem fields used by getInboxAccumulationAlert
type MockStatus = 'pending' | 'processing' | 'processed' | 'manual' | 'discarded'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeItem(id: string, status: MockStatus, createdDaysAgo: number): any {
  return {
    id,
    userId: 'user-123',
    rawText: `Item ${id}`,
    status,
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(createdDaysAgo),
    processedAt: null,
    aiClassification: null,
    aiSuggestedAreaId: null,
    aiSuggestedOkrId: null,
    aiSuggestedSlot: null,
    aiSuggestedTitle: null,
    aiSuggestedDurationMinutes: null,
    aiError: null,
    stepActivityId: null,
    projectId: null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getInboxAccumulationAlert — pure logic', () => {
  it('returns null when no items', () => {
    const result = getInboxAccumulationAlert([])
    expect(result).toBeNull()
  })

  it('returns null when all items are recent (<7 days)', () => {
    const items = [
      makeItem('a', 'pending', 3),
      makeItem('b', 'pending', 6),
      makeItem('c', 'manual', 1),
    ]
    const result = getInboxAccumulationAlert(items)
    expect(result).toBeNull()
  })

  it('returns null when items are processed/discarded (ignores them)', () => {
    const items = [
      makeItem('a', 'processed', 10),
      makeItem('b', 'discarded', 15),
      makeItem('c', 'processing', 8),
    ]
    const result = getInboxAccumulationAlert(items)
    expect(result).toBeNull()
  })

  it('returns alert for 1 pending item >7 days', () => {
    const items = [makeItem('a', 'pending', 8)]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('warning')
    expect(result!.count).toBe(1)
    expect(result!.oldestDays).toBe(8)
  })

  it('returns alert for multiple pending items >7 days', () => {
    const items = [
      makeItem('a', 'pending', 8),
      makeItem('b', 'pending', 10),
      makeItem('c', 'pending', 12),
    ]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.count).toBe(3)
    expect(result!.oldestDays).toBe(12)
  })

  it('returns alert for manual items >7 days', () => {
    const items = [makeItem('a', 'manual', 9)]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('warning')
    expect(result!.count).toBe(1)
    expect(result!.oldestDays).toBe(9)
  })

  it('count = only items matching criteria (not total items)', () => {
    const items = [
      makeItem('a', 'pending', 10), // OLD ✓
      makeItem('b', 'pending', 3), // recent ✗
      makeItem('c', 'processed', 20), // closed ✗
      makeItem('d', 'manual', 8), // OLD ✓
    ]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.count).toBe(2)
  })

  it('oldestDays = days since oldest unprocessed item', () => {
    const items = [
      makeItem('a', 'pending', 8),
      makeItem('b', 'manual', 14),
      makeItem('c', 'pending', 10),
    ]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.oldestDays).toBe(14)
  })

  it('mixed: some old + some recent → alert for old count only', () => {
    const items = [
      makeItem('a', 'pending', 15), // OLD ✓
      makeItem('b', 'pending', 2), // recent ✗
      makeItem('c', 'manual', 9), // OLD ✓
      makeItem('d', 'pending', 6), // recent ✗ (just under threshold)
    ]
    const result = getInboxAccumulationAlert(items)

    expect(result).not.toBeNull()
    expect(result!.count).toBe(2)
    expect(result!.oldestDays).toBe(15)
  })
})
