/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#070A09',
        surface: '#0E1412',
        'surface-2': '#141C19',
        ink: {
          DEFAULT: '#E8EDEB',
          muted: '#93A099',
          faint: '#5C6862',
        },
        emr: {
          DEFAULT: '#10B981',
          bright: '#34D399',
          deep: '#0B7A57',
        },
        gld: {
          DEFAULT: '#D4AF37',
          bright: '#F5D58A',
          deep: '#9C7C2B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 20px 60px -20px rgba(0,0,0,0.7)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
