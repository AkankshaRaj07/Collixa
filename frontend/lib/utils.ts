// Form validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^\S+@\S+\.\S+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  return { valid: true, message: '' }
}

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Format utilities
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatDate = (date: Date | string, format = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return dateObj.toLocaleDateString()
}

export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return formatDate(dateObj, 'short')
}

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const truncate = (str: string, length: number): string => {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export const getLevelLabel = (level: number = 1): string => {
  const labels: Record<number, string> = {
    1: 'Nomad',
    2: 'Architect',
    3: 'Luminary',
    4: 'Oracle',
    5: 'Master'
  }
  return labels[level] || 'Nomad'
}

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Array utilities
export const chunk = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export const removeDuplicates = <T,>(arr: T[]): T[] => {
  return Array.from(new Set(arr))
}

export const sortByProperty = <T extends Record<string, any>>(
  arr: T[],
  property: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...arr].sort((a, b) => {
    if (order === 'asc') {
      return a[property] > b[property] ? 1 : -1
    }
    return a[property] < b[property] ? 1 : -1
  })
}

// Object utilities
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach((key) => {
    delete result[key]
  })
  return result
}

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    result[key] = obj[key]
  })
  return result
}

// API utilities
export const apiCall = async <T,>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

// Storage utilities
export const storage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  },
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },
  clear: () => {
    if (typeof window === 'undefined') return
    localStorage.clear()
  },
}

import { eventBus } from './events'

// Notification utilities (for toast messages)
export const notify = {
  success: (message: string) => eventBus.emitToast({ message, type: 'success' }),
  error: (message: string) => eventBus.emitToast({ message, type: 'error' }),
  info: (message: string) => eventBus.emitToast({ message, type: 'info' }),
  warning: (message: string) => eventBus.emitToast({ message, type: 'warning' }),
  credits: (amount: number) => eventBus.emitCredit({ amount }),
}
