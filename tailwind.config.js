/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0B1E36',
        surface: '#0E2238',
        'surface-2': '#16304C',
        ink: {
          DEFAULT: '#EEF3F9',
          muted: '#9FB0C4',
          faint: '#5D7290',
        },
        // 'emr' kept as the token name; now Certuity azure (was emerald).
        emr: {
          DEFAULT: '#5B9BD5',
          bright: '#7FB8E8',
          deep: '#3A6E9E',
        },
        // 'gld' now champagne gold.
        gld: {
          DEFAULT: '#C9A86A',
          bright: '#E2C88C',
          deep: '#9C8350',
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
