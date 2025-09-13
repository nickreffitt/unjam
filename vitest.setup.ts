import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock timers for consistent testing
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})