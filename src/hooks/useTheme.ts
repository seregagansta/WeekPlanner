import { useEffect, useState } from 'react'
export function useTheme() {
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('weekplanner.theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('weekplanner.theme', theme)
  }, [theme])
  return { theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}
