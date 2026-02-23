import { describe, it, expect } from 'vitest'

// ─── Lógica pura de validación de proyectos ──────────────────────────────────
// Replicamos exactamente la lógica de validación de actions/projects.ts
// como funciones puras para testear sin conexión a DB ni auth.

interface CreateProjectData {
  title: string
  description?: string
  areaId: string
  okrId?: string | null
}

type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused'

interface Project {
  id: string
  status: ProjectStatus
  areaId: string | null
}

interface OKR {
  id: string
  areaId: string | null
  status: 'active' | 'completed' | 'cancelled' | 'paused'
  type: 'vision' | 'annual' | 'key_result'
}

function validateCreateProject(data: CreateProjectData): string | null {
  if (!data.title.trim()) return 'El título es requerido'
  if (!data.areaId) return 'El área es requerida'
  return null
}

function filterProjectsByStatus(projects: Project[], status: ProjectStatus): Project[] {
  return projects.filter((p) => p.status === status)
}

function filterKrsByArea(krs: OKR[], areaId: string): OKR[] {
  return krs.filter(
    (kr) => kr.areaId === areaId && kr.type === 'key_result' && kr.status === 'active'
  )
}

function formatLinkedKR(okr: OKR | null): string {
  if (!okr) return 'Sin KR vinculado'
  return `KR: ${okr.id}`
}

// ─── Tests: validación de creación ───────────────────────────────────────────

describe('validateCreateProject — título y área requeridos', () => {
  it('returns null when title and areaId are provided', () => {
    const result = validateCreateProject({ title: 'Mi proyecto', areaId: 'area-1' })
    expect(result).toBeNull()
  })

  it('returns error when title is empty string', () => {
    const result = validateCreateProject({ title: '', areaId: 'area-1' })
    expect(result).toBe('El título es requerido')
  })

  it('returns error when title is only whitespace', () => {
    const result = validateCreateProject({ title: '   ', areaId: 'area-1' })
    expect(result).toBe('El título es requerido')
  })

  it('returns error when areaId is empty string', () => {
    const result = validateCreateProject({ title: 'Mi proyecto', areaId: '' })
    expect(result).toBe('El área es requerida')
  })

  it('validates title before areaId (title check is first)', () => {
    const result = validateCreateProject({ title: '', areaId: '' })
    expect(result).toBe('El título es requerido')
  })

  it('accepts project with optional description', () => {
    const result = validateCreateProject({
      title: 'Proyecto con descripción',
      areaId: 'area-1',
      description: 'Una descripción detallada',
    })
    expect(result).toBeNull()
  })

  it('accepts project with okrId null', () => {
    const result = validateCreateProject({
      title: 'Proyecto sin KR',
      areaId: 'area-1',
      okrId: null,
    })
    expect(result).toBeNull()
  })

  it('accepts project with okrId set', () => {
    const result = validateCreateProject({
      title: 'Proyecto con KR',
      areaId: 'area-1',
      okrId: 'kr-1',
    })
    expect(result).toBeNull()
  })
})

// ─── Tests: filtro por estado ─────────────────────────────────────────────────

describe('filterProjectsByStatus — solo devuelve el estado correcto', () => {
  const projects: Project[] = [
    { id: '1', status: 'active', areaId: 'area-1' },
    { id: '2', status: 'active', areaId: 'area-2' },
    { id: '3', status: 'paused', areaId: 'area-1' },
    { id: '4', status: 'completed', areaId: 'area-3' },
    { id: '5', status: 'archived', areaId: 'area-1' },
  ]

  it('returns only active projects', () => {
    const result = filterProjectsByStatus(projects, 'active')
    expect(result).toHaveLength(2)
    expect(result.every((p) => p.status === 'active')).toBe(true)
  })

  it('returns only paused projects', () => {
    const result = filterProjectsByStatus(projects, 'paused')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('returns only completed projects', () => {
    const result = filterProjectsByStatus(projects, 'completed')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('returns only archived projects', () => {
    const result = filterProjectsByStatus(projects, 'archived')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('5')
  })

  it('returns empty array when no projects match status', () => {
    const result = filterProjectsByStatus([], 'active')
    expect(result).toHaveLength(0)
  })
})

// ─── Tests: filtro de KRs por área ────────────────────────────────────────────

describe('filterKrsByArea — solo KRs activos del área correcta', () => {
  const krs: OKR[] = [
    { id: 'kr-1', areaId: 'area-1', status: 'active', type: 'key_result' },
    { id: 'kr-2', areaId: 'area-1', status: 'active', type: 'key_result' },
    { id: 'kr-3', areaId: 'area-2', status: 'active', type: 'key_result' },
    { id: 'kr-4', areaId: 'area-1', status: 'cancelled', type: 'key_result' }, // no activo
    { id: 'okr-1', areaId: 'area-1', status: 'active', type: 'annual' }, // no es KR
  ]

  it('returns only KRs for the specified area', () => {
    const result = filterKrsByArea(krs, 'area-1')
    expect(result).toHaveLength(2)
    expect(result.map((kr) => kr.id)).toEqual(['kr-1', 'kr-2'])
  })

  it('does NOT include cancelled KRs', () => {
    const result = filterKrsByArea(krs, 'area-1')
    expect(result.some((kr) => kr.status === 'cancelled')).toBe(false)
  })

  it('does NOT include annual OKRs (only key_result type)', () => {
    const result = filterKrsByArea(krs, 'area-1')
    expect(result.some((kr) => kr.type === 'annual')).toBe(false)
  })

  it('returns empty array for area with no KRs', () => {
    const result = filterKrsByArea(krs, 'area-99')
    expect(result).toHaveLength(0)
  })

  it('returns only KRs for area-2', () => {
    const result = filterKrsByArea(krs, 'area-2')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('kr-3')
  })
})

// ─── Tests: formato de KR vinculado ──────────────────────────────────────────

describe('formatLinkedKR — texto legible para UI', () => {
  it('returns "Sin KR vinculado" when okr is null', () => {
    expect(formatLinkedKR(null)).toBe('Sin KR vinculado')
  })

  it('returns formatted string when okr exists', () => {
    const okr: OKR = { id: 'kr-abc', areaId: 'area-1', status: 'active', type: 'key_result' }
    expect(formatLinkedKR(okr)).toContain('KR:')
  })
})
