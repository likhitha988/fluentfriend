/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -8px rgba(16,24,40,0.10)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        ring: { '0%': { transform: 'scale(1)', opacity: '0.45' }, '100%': { transform: 'scale(1.7)', opacity: '0' } },
        talk: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        fadeup: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        dots: { '0%,80%,100%': { opacity: '0.2' }, '40%': { opacity: '1' } },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        ring: 'ring 1.6s ease-out infinite',
        talk: 'talk 0.9s ease-in-out infinite',
        fadeup: 'fadeup 0.35s ease-out both',
        dots: 'dots 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
