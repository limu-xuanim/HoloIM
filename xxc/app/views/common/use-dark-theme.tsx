import {useEffect, useState} from 'react';

export default function useDarkTheme() {
    const [darkTheme, setDarkTheme] = useState(document.body.classList.contains('theme-dark'));

    useEffect(() => {
        const {body} = document
        const observer = new MutationObserver(() => {
            setDarkTheme(body.classList.contains('theme-dark'));
        });
        observer.observe(body, {attributes: true});
        return () => {
            observer.disconnect();
        };
    }, []);

    return darkTheme;
}
