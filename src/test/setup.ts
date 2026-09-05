import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// store.ts avisa falhas de mutation com window.alert (UX simples, sem
// toast) — jsdom não implementa alert de verdade e lançaria "Not
// implemented" em todo teste de falha se não fosse abafado aqui.
beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})
