import { useState, useEffect, useCallback } from 'react';

/**
 * Legacy hook kept for compatibility.
 * In strict online-only mode, this behaves as in-memory state only.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  void key;
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  useEffect(() => {
    // No persistence in strict online-only mode.
  }, [storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      return newValue;
    });
  }, []);

  return [storedValue, setValue];
}
