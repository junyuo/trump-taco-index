import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import {
  applyTheme,
  getAppliedTheme,
  isTheme,
  storeTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getAppliedTheme())
  const isDark = theme === 'dark'

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      setTheme(isTheme(event.newValue) ? event.newValue : 'light')
    }

    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
    storeTheme(nextTheme)
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-pressed={isDark}
      aria-label={`切換為${isDark ? '淺色' : '深色'}模式`}
      onClick={toggleTheme}
    >
      {isDark ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
      <span>{isDark ? '深色' : '淺色'}</span>
    </button>
  )
}
