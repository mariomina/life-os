import { describe, it, expect } from 'vitest'
import { computeSkillLevel, getSkillProgress, SKILL_THRESHOLDS_SECONDS } from './level'

// ─── Story 7.4 — level.ts Tests ──────────────────────────────────────────────
// Pure logic tests for computeSkillLevel and getSkillProgress.
// Thresholds: beginner (0-50h), intermediate (50-200h), advanced (200-500h), expert (500h+)

describe('computeSkillLevel — pure logic', () => {
  it('returns beginner for 0 seconds', () => {
    expect(computeSkillLevel(0)).toBe('beginner')
  })

  it('returns beginner for < 50h (179999s)', () => {
    expect(computeSkillLevel(179999)).toBe('beginner')
  })

  it('returns intermediate for exactly 50h (180000s)', () => {
    expect(computeSkillLevel(SKILL_THRESHOLDS_SECONDS.intermediate)).toBe('intermediate')
  })

  it('returns intermediate for 100h', () => {
    expect(computeSkillLevel(100 * 3600)).toBe('intermediate')
  })

  it('returns advanced for exactly 200h (720000s)', () => {
    expect(computeSkillLevel(SKILL_THRESHOLDS_SECONDS.advanced)).toBe('advanced')
  })

  it('returns advanced for 350h', () => {
    expect(computeSkillLevel(350 * 3600)).toBe('advanced')
  })

  it('returns expert for exactly 500h (1800000s)', () => {
    expect(computeSkillLevel(SKILL_THRESHOLDS_SECONDS.expert)).toBe('expert')
  })

  it('returns expert for 1000h', () => {
    expect(computeSkillLevel(1000 * 3600)).toBe('expert')
  })
})

describe('getSkillProgress — pure logic', () => {
  it('beginner at 0h: progressPercent=0, nextLevel=intermediate, hoursToNextLevel=50', () => {
    const p = getSkillProgress(0)
    expect(p.currentLevel).toBe('beginner')
    expect(p.nextLevel).toBe('intermediate')
    expect(p.progressPercent).toBe(0)
    expect(p.hoursToNextLevel).toBe(50)
    expect(p.totalHours).toBe(0)
  })

  it('beginner at 25h: progressPercent=50, hoursToNextLevel=25', () => {
    const p = getSkillProgress(25 * 3600)
    expect(p.currentLevel).toBe('beginner')
    expect(p.progressPercent).toBe(50)
    expect(p.hoursToNextLevel).toBe(25)
  })

  it('exactly at intermediate threshold: progressPercent=0, nextLevel=advanced', () => {
    const p = getSkillProgress(SKILL_THRESHOLDS_SECONDS.intermediate)
    expect(p.currentLevel).toBe('intermediate')
    expect(p.progressPercent).toBe(0)
    expect(p.nextLevel).toBe('advanced')
  })

  it('expert level: progressPercent=100, nextLevel=null, hoursToNextLevel=null', () => {
    const p = getSkillProgress(SKILL_THRESHOLDS_SECONDS.expert)
    expect(p.currentLevel).toBe('expert')
    expect(p.progressPercent).toBe(100)
    expect(p.nextLevel).toBeNull()
    expect(p.hoursToNextLevel).toBeNull()
  })

  it('totalHours is always seconds / 3600', () => {
    const p = getSkillProgress(7200) // 2h
    expect(p.totalHours).toBe(2)
  })
})
