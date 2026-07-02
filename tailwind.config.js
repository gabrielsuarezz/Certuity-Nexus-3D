/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm parchment field + raised warm-white surfaces
        base: '#E9DFCC',
        surface: '#F4EEE1',
        'surface-2': '#FBF7EE',
        paper: '#FBF8F1',
        ink: {
          DEFAULT: '#22303F',
          muted: '#566472',
          faint: '#8A94A0',
        },
        // 'emr' kept as the token name; now a deep private-bank navy-blue.
        emr: {
          DEFAULT: '#2E5788',
          bright: '#3D6DA6',
          deep: '#1D3A5E',
        },
        // 'gld' — champagne gold, deepened to read on a light field.
        gld: {
          DEFAULT: '#9C7A34',
          bright: '#B8923F',
          deep: '#7A5E2A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass:
          '0 1px 0 0 rgba(255,255,255,0.7) inset, 0 24px 60px -28px rgba(72,58,30,0.4)',
        card: '0 18px 44px -24px rgba(72,58,30,0.35)',
        panel: '-30px 0 80px -40px rgba(72,58,30,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
