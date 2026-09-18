const mem: Record<string, string> = {}

export const Store = {
  get(key: string): string | null {
    try {
      const v = localStorage.getItem(key)
      return v !== null ? v : key in mem ? mem[key] : null
    } catch {
      return key in mem ? mem[key] : null
    }
  },
  set(key: string, v: string) {
    mem[key] = v
    try {
      localStorage.setItem(key, v)
    } catch {
      /* quota / private mode: memory only */
    }
  },
  del(key: string) {
    delete mem[key]
    try {
      localStorage.removeItem(key)
    } catch {
      /* noop */
    }
  },
}

export function esc(s: unknown): string {
  return String(s == null ? '' : s)
}

export function randId(prefix = 'ep'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}
