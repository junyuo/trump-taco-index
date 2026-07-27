import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { THEME_STORAGE_KEY } from '../lib/theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
  document.body.innerHTML = ''
})

describe('ThemeToggle', () => {
  it('toggles the DOM, storage, visible label, and aria state', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    act(() => root.render(<ThemeToggle />))
    const button = container.querySelector('button')!
    expect(button.textContent).toContain('淺色')
    expect(button.getAttribute('aria-pressed')).toBe('false')

    act(() => button.click())
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(button.textContent).toContain('深色')
    expect(button.getAttribute('aria-pressed')).toBe('true')

    act(() => root.unmount())
  })

  it('syncs a valid cross-tab storage event and resets cleared storage to light', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    act(() => root.render(<ThemeToggle />))
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: 'dark',
    })))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(container.textContent).toContain('深色')

    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: null,
    })))
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => root.unmount())
  })
})
