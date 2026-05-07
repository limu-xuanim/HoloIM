/** @type {import('tailwindcss').Config} */
module.exports = {
    corePlugins: {
        preflight: false,
    },
    content: [
        './app/views/**/*.{html,js,jsx,ts,tsx}',
        './app/components/**/*.{html,js,jsx,ts,tsx}',
        './app/entries/**/*.{html,js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            aspectRatio: {
                '4/3': '4 / 3'
            }
        },
    },
    plugins: [],
    darkMode: ['selector', '[data-theme-scheme="dark"]'],
    prefix: '-'
};
