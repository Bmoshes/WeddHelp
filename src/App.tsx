import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { useSeatingStore } from './store/seatingStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SeatingState } from './types';

function App() {
    const { guests, tables, conflicts, groups, importData } = useSeatingStore();

    // Sync with localStorage
    const [storedData, setStoredData] = useLocalStorage<SeatingState>(
        'wedding-seating-data',
        { guests: [], tables: [], conflicts: [], groups: {} },
        500 // 500ms debounce
    );

    // Load from localStorage on mount
    useEffect(() => {
        if (storedData && (storedData.guests.length > 0 || storedData.tables.length > 0)) {
            importData(storedData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // Save to localStorage whenever state changes
    useEffect(() => {
        setStoredData({ guests, tables, conflicts, groups });
    }, [guests, tables, conflicts, groups, setStoredData]);

    return <Dashboard />;
}

export default App;
