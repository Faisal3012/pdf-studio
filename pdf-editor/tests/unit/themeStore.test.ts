import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '@/store/themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useThemeStore.setState({ theme: 'system', resolvedTheme: 'light' })
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('defaults to system theme', () => {
    const { theme } = useThemeStore.getState()
    expect(theme).toBe('system')
  })

  it('setTheme to light removes dark class', () => {
    document.documentElement.classList.add('dark')
    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(useThemeStore.getState().theme).toBe('light')
    expect(useThemeStore.getState().resolvedTheme).toBe('light')
  })

  it('setTheme to dark adds dark class', () => {
    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
  })

  it('setTheme to system resolves based on matchMedia', () => {
    // matchMedia mock in setup.ts returns matches: false (light)
    useThemeStore.getState().setTheme('system')
    expect(useThemeStore.getState().theme).toBe('system')
    expect(useThemeStore.getState().resolvedTheme).toBe('light')
  })

  it('all three theme values are accepted', () => {
    const store = useThemeStore.getState()
    store.setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
    store.setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    store.setTheme('system')
    expect(useThemeStore.getState().theme).toBe('system')
  })
})
