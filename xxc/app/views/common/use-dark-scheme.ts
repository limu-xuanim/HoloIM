import {useEffect, useState} from 'react';

export default function useDarkScheme() {
    const [darkMode, setDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

    useEffect(() => {
        const prefersDarkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (event: MediaQueryListEvent) => {
            setDarkMode(event.matches);
        };
        prefersDarkSchemeQuery.addEventListener('change', listener);

        return () => {
            prefersDarkSchemeQuery.removeEventListener('change', listener);
        };
    }, []);

    return darkMode;
}
