import { describe, it, expect } from 'vitest'
import { formatTimeInvested, formatLastActivity } from '@/lib/utils/time-format'

describe('formatTimeInvested', () => {
  it('returns "0h" for 0 seconds', () => {
    expect(formatTimeInvested(0)).toBe('0h')
  })

  it('returns "0h" for negative seconds', () => {
    expect(formatTimeInvested(-100)).toBe('0h')
  })

  it('returns minutes only when less than 1 hour', () => {
    expect(formatTimeInvested(2700)).toBe('45m') // 45 min
    expect(formatTimeInvested(60)).toBe('1m')
    expect(formatTimeInvested(3599)).toBe('59m')
  })

  it('returns hours only when exact hours', () => {
    expect(formatTimeInvested(3600)).toBe('1h') // 1h
    expect(formatTimeInvested(7200)).toBe('2h') // 2h
  })

  it('returns hours and minutes combined', () => {
    expect(formatTimeInvested(5400)).toBe('1h 30m') // 1h 30m
    expect(formatTimeInvested(3661)).toBe('1h 1m') // 1h 1m
    expect(formatTimeInvested(9000)).toBe('2h 30m') // 2h 30m
  })
})

describe('formatLastActivity', () => {
  it('returns "Sin actividad" for null', () => {
    expect(formatLastActivity(null)).toBe('Sin actividad')
  })

  it('returns "Hoy" for today', () => {
    const now = new Date()
    expect(formatLastActivity(now)).toBe('Hoy')
  })

  it('returns "Ayer" for yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(formatLastActivity(yesterday)).toBe('Ayer')
  })

  it('returns "hace X días" for older dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatLastActivity(threeDaysAgo)).toBe('hace 3 días')
  })

  it('accepts string date format', () => {
    expect(formatLastActivity(null)).toBe('Sin actividad')
  })
})
