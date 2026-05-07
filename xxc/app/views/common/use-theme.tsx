import {useEffect, useState} from 'react';

export default function useTheme() {
    const [theme, setTheme] = useState(document.body.dataset.theme || '');

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'data-theme') {
                    setTheme(document.body.dataset.theme!);
                    return;
                }
            }
        });

        observer.observe(document.body, {attributeFilter: ['data-theme']});
        return () => observer.disconnect();
    }, []);

    return theme;
}
