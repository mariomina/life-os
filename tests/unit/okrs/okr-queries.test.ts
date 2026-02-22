import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getVision, getAnnualOKRs, countActiveAnnualOKRs } from '@/lib/db/queries/okrs'
import type { OKR } from '@/lib/db/schema/okrs'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock assertDatabaseUrl — no-op en tests
vi.mock('@/lib/db/client', () => ({
  assertDatabaseUrl: vi.fn(),
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

// Acceso al mock de db para configurar respuestas por test
import { db, assertDatabaseUrl } from '@/lib/db/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOKR(overrides: Partial<OKR> = {}): OKR {
  return {
    id: 'okr-1',
    userId: 'user-1',
    type: 'vision',
    parentId: null,
    areaId: null,
    title: 'Mi visión',
    description: null,
    year: null,
    quarter: null,
    progress: 0,
    krType: null,
    targetValue: null,
    targetUnit: null,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

// Builder de cadena fluente para mocks de Drizzle (select → from → where → limit)
function buildSelectMock(returnValue: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(returnValue)
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock, then: undefined })
  // Para queries sin .limit(), whereMock debe ser thenable
  Object.assign(whereMock(), {
    then: (resolve: (v: unknown) => void) => resolve(returnValue),
  })
  const fromMock = vi.fn().mockReturnValue({ where: whereMock })
  return { selectMock: vi.fn().mockReturnValue({ from: fromMock }), whereMock, limitMock }
}

// ─── getVision ────────────────────────────────────────────────────────────────

describe('getVision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no vision exists', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getVision('user-1')
    expect(result).toBeNull()
  })

  it('returns the vision OKR when it exists', async () => {
    const vision = makeOKR({ type: 'vision', title: 'Libertad financiera' })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([vision]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getVision('user-1')
    expect(result).toEqual(vision)
    expect(result?.type).toBe('vision')
  })

  it('returns only the first record even if multiple exist', async () => {
    const vision1 = makeOKR({ id: 'v1', type: 'vision' })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([vision1]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getVision('user-1')
    expect(result?.id).toBe('v1')
  })

  it('calls assertDatabaseUrl', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getVision('user-1')
    expect(assertDatabaseUrl).toHaveBeenCalledOnce()
  })
})

// ─── getAnnualOKRs ────────────────────────────────────────────────────────────

describe('getAnnualOKRs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no annual OKRs exist', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getAnnualOKRs('user-1', 2026)
    expect(result).toEqual([])
  })

  it('returns annual OKRs for the given year', async () => {
    const okr1 = makeOKR({ id: 'a1', type: 'annual', year: 2026, status: 'active' })
    const okr2 = makeOKR({ id: 'a2', type: 'annual', year: 2026, status: 'completed' })
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([okr1, okr2]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await getAnnualOKRs('user-1', 2026)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('annual')
    expect(result[1].type).toBe('annual')
  })

  it('calls assertDatabaseUrl', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getAnnualOKRs('user-1', 2026)
    expect(assertDatabaseUrl).toHaveBeenCalledOnce()
  })
})

// ─── countActiveAnnualOKRs ────────────────────────────────────────────────────

describe('countActiveAnnualOKRs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when no active annual OKRs exist', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 0 }]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await countActiveAnnualOKRs('user-1', 2026)
    expect(result).toBe(0)
  })

  it('returns the count of active annual OKRs', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 2 }]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await countActiveAnnualOKRs('user-1', 2026)
    expect(result).toBe(2)
  })

  it('returns 3 when Buffett limit is reached', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 3 }]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await countActiveAnnualOKRs('user-1', 2026)
    expect(result).toBe(3)
  })

  it('returns 0 when result row is missing (fallback)', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    const result = await countActiveAnnualOKRs('user-1', 2026)
    expect(result).toBe(0)
  })

  it('calls assertDatabaseUrl', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 0 }]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    await countActiveAnnualOKRs('user-1', 2026)
    expect(assertDatabaseUrl).toHaveBeenCalledOnce()
  })
})
