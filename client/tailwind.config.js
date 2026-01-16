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
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    card: 'var(--bg-card)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
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
