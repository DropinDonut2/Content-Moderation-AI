/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: '#09090b', // zinc-950
                    secondary: '#18181b', // zinc-900
                    card: '#000000', // pure black
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#a1a1aa', // zinc-400
                }
            },
            fontFamily: {
                mono: ['"DM Mono"', 'monospace'],
                sans: ['"DM Mono"', 'monospace'], // Force monospace for everything
            },
            boxShadow: {
                'card': '0 0 0 1px rgba(255,255,255,0.1)',
                'card-hover': '0 0 0 1px rgba(255,255,255,0.3)',
            }
        },
    },
    plugins: [],
}
