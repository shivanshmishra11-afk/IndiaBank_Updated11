/**
 * Safe Storage utility that works seamlessly in restricted, partitioned,
 * or sandboxed iframes where direct window.localStorage access may throw
 * a SecurityError or DOMException.
 */

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        const value = window.localStorage.getItem(key);
        if (value !== null) return value;
      }
    } catch {
      // Storage access blocked or restricted in iframe
    }
    return memoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      memoryStore[key] = value;
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage access blocked or restricted in iframe
    }
  },

  removeItem: (key: string): void => {
    try {
      delete memoryStore[key];
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access blocked or restricted in iframe
    }
  },
};
