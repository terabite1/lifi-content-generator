import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        lifi: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c7cbff',
          300: '#a5abff',
          400: '#8088ff',
          500: '#5C67FF',
          600: '#4B54F0',
          700: '#3B40D6',
          800: '#3034AD',
          900: '#2B2E89',
        },
        'lifi-pink': {
          50: '#fef5ff',
          100: '#fce8ff',
          200: '#F7C2FF',
          300: '#f3a6ff',
          400: '#ec7fff',
          500: '#dc52ff',
          600: '#c030e6',
          700: '#a023c4',
          800: '#831f9c',
          900: '#6b1c7f',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
