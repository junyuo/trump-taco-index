import { describe, expect, it } from 'vitest'
import {
  applyTheme,
  getAppliedTheme,
  isTheme,
  readStoredTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from './theme'

describe('theme preferences', () => {
  it('defaults to light for missing, invalid, or failed storage reads', () => {
    expect(readStoredTheme({ getItem: () => null })).toBe('light')
    expect(readStoredTheme({ getItem: () => 'system' })).toBe('light')
    expect(readStoredTheme({ getItem: () => { throw new Error('blocked') } })).toBe('light')
  })

  it('accepts only supported themes', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('system')).toBe(false)
    expect(readStoredTheme({ getItem: () => 'dark' })).toBe('dark')
  })

  it('applies the theme and matching browser color', () => {
    const root = document.createElement('html')
    const meta = document.createElement('meta')

    applyTheme('dark', root, meta)

    expect(getAppliedTheme(root)).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
    expect(meta.content).toBe('#09111e')
  })

  it('stores the selection and tolerates blocked writes', () => {
    let storedKey = ''
    let storedValue = ''
    expect(storeTheme('dark', {
      setItem: (key, value) => {
        storedKey = key
        storedValue = value
      },
    })).toBe(true)
    expect(storedKey).toBe(THEME_STORAGE_KEY)
    expect(storedValue).toBe('dark')
    expect(storeTheme('light', { setItem: () => { throw new Error('blocked') } })).toBe(false)
  })
})
