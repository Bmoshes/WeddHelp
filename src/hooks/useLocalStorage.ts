import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for syncing state with localStorage
 * Automatically saves to localStorage on every state change with debouncing
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    debounceMs: number = 300
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Get from localStorage or use initial value
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading from localStorage (${key}):`, error);
            return initialValue;
        }
    });

    // Debounce timer
    const [timeoutId, setTimeoutId] = useState<number | null>(null);

    // Save to localStorage (debounced)
    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                // Allow value to be a function to match useState API
                const valueToStore = value instanceof Function ? value(storedValue) : value;

                // Save state
                setStoredValue(valueToStore);

                // Clear existing timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // Set new timeout for localStorage write
                const newTimeoutId = setTimeout(() => {
                    try {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                            console.error('LocalStorage quota exceeded!');
                            alert('שגיאה: אחסון המידע מלא. אנא ייצא את הנתונים ונקה את הדפדפן.');
                        } else {
                            console.error('Error saving to localStorage:', error);
                        }
                    }
                }, debounceMs);

                setTimeoutId(newTimeoutId);
            } catch (error) {
                console.error(`Error updating localStorage (${key}):`, error);
            }
        },
        [key, storedValue, timeoutId, debounceMs]
    );

    // Clear localStorage
    const clearValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error clearing localStorage (${key}):`, error);
        }
    }, [key, initialValue]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return [storedValue, setValue, clearValue];
}
