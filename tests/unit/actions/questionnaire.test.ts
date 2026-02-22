import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so mocks are available when vi.mock factories run
const { mockInsert, mockUpdate, mockSelect, mockUpdateUser } = vi.hoisted(() => {
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdateUser = vi.fn()
  return { mockInsert, mockUpdate, mockSelect, mockUpdateUser }
})

// Mock DB client BEFORE importing the action (avoids DATABASE_URL error)
vi.mock('@/lib/db/client', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}))

// Mock schema exports (values are only used as query references)
vi.mock('@/lib/db/schema', () => ({
  areas: { userId: 'userId', id: 'id' },
  areaScores: {},
}))

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ auth: { updateUser: mockUpdateUser } })
  ),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ getAll: vi.fn(() => []), set: vi.fn() })),
}))

// Mock questionnaire data
vi.mock('@/features/maslow/questionnaire', () => ({
  QUESTIONNAIRE: [
    {
      level: 1,
      group: 'd_needs',
      name: 'Fisiológica',
      defaultName: 'Fisiológica',
      weightMultiplier: '2.0',
      icon: '🏃',
      questions: ['q1', 'q2', 'q3', 'q4', 'q5'],
    },
    {
      level: 2,
      group: 'd_needs',
      name: 'Seguridad',
      defaultName: 'Seguridad',
      weightMultiplier: '2.0',
      icon: '🛡️',
      questions: ['q1', 'q2', 'q3', 'q4', 'q5'],
    },
  ],
}))

import { saveAreaScores, completeOnboarding } from '@/actions/questionnaire'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

describe('saveAreaScores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Chain: db.insert().values().onConflictDoNothing()
    mockInsert.mockReturnValue({
      values: vi
        .fn()
        .mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
    })
    // Chain: db.update().set().where()
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
  })

  it('returns { error: null } on success', async () => {
    const areaIds = { 1: 'area-uuid-1', 2: 'area-uuid-2' } as Record<MaslowLevel, string>
    const scores = { 1: 75, 2: 50 } as Record<MaslowLevel, number>

    const result = await saveAreaScores('user-1', areaIds, scores)
    expect(result).toEqual({ error: null })
  })

  it('returns { error: message } when db throws', async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    })

    const areaIds = { 1: 'area-uuid-1' } as Record<MaslowLevel, string>
    const scores = { 1: 75 } as Record<MaslowLevel, number>

    const result = await saveAreaScores('user-1', areaIds, scores)
    expect(result).toEqual({ error: 'DB connection failed' })
  })
})

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { error: null } on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    const result = await completeOnboarding()
    expect(result).toEqual({ error: null })
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { onboarding_completed: true } })
  })

  it('returns { error: message } when supabase fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Auth error' } })
    const result = await completeOnboarding()
    expect(result).toEqual({ error: 'Auth error' })
  })
})
