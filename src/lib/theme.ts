export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'taco-theme'

export const themeColors: Record<Theme, string> = {
  light: '#f4f6f9',
  dark: '#09111e',
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(storage?: Pick<Storage, 'getItem'>): Theme {
  try {
    const value = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : 'light'
  } catch {
    return 'light'
  }
}

export function getAppliedTheme(root: HTMLElement = document.documentElement): Theme {
  return isTheme(root.dataset.theme) ? root.dataset.theme : 'light'
}

export function applyTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
  themeColorMeta: HTMLMetaElement | null = document.querySelector('meta[name="theme-color"]'),
): void {
  root.dataset.theme = theme
  root.style.colorScheme = theme
  themeColorMeta?.setAttribute('content', themeColors[theme])
}

export function storeTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}
