const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        garda: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          card: 'var(--color-card)',
          input: 'var(--color-input)',
          border: 'var(--color-border)',
          'border-hover': 'var(--color-border-hover)',
          cyan: 'var(--color-cyan)',
          pink: 'var(--color-pink)',
          amber: 'var(--color-amber)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      borderRadius: {
        'garda-card': '12px',
        'garda-input': '8px',
        'garda-button': '8px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
