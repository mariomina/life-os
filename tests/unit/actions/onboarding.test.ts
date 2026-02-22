import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkOnboardingStatus, saveOnboardingMethod } from '@/actions/onboarding'

// Mock the Supabase server client
const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
    })
  ),
}))

// Mock next/headers (required by createSupabaseServerClient internally)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ getAll: vi.fn(() => []), set: vi.fn() })),
}))

describe('checkOnboardingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns completed: false when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await checkOnboardingStatus()
    expect(result).toEqual({ completed: false })
  })

  it('returns completed: false for a new user with empty metadata', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
    })
    const result = await checkOnboardingStatus()
    expect(result).toEqual({ completed: false })
  })

  it('returns completed: false when onboarding_completed is false', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1', user_metadata: { onboarding_completed: false } },
      },
    })
    const result = await checkOnboardingStatus()
    expect(result).toEqual({ completed: false })
  })

  it('returns completed: true when onboarding_completed is true', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: { onboarding_completed: true, onboarding_method: 'questionnaire' },
        },
      },
    })
    const result = await checkOnboardingStatus()
    expect(result).toEqual({ completed: true })
  })
})

describe('saveOnboardingMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves questionnaire method successfully', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    const result = await saveOnboardingMethod('questionnaire')
    expect(result).toEqual({ error: null })
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { onboarding_method: 'questionnaire', onboarding_completed: false },
    })
  })

  it('saves upload method successfully', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    const result = await saveOnboardingMethod('upload')
    expect(result).toEqual({ error: null })
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { onboarding_method: 'upload', onboarding_completed: false },
    })
  })

  it('returns error message when updateUser fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Auth error' } })
    const result = await saveOnboardingMethod('questionnaire')
    expect(result).toEqual({ error: 'Auth error' })
  })
})
