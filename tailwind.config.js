/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        iter: {
          primary: 'rgb(var(--iter-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--iter-primary-hover) / <alpha-value>)',
          secondary: 'rgb(var(--iter-secondary) / <alpha-value>)',
          accent: 'rgb(var(--iter-accent) / <alpha-value>)',
          tertiary: 'rgb(var(--iter-tertiary) / <alpha-value>)',
          bg: 'rgb(var(--iter-background) / <alpha-value>)',
          'bg-alt': 'rgb(var(--iter-background-alt) / <alpha-value>)',
          surface: 'rgb(var(--iter-surface) / <alpha-value>)',
          'surface-alt': 'rgb(var(--iter-surface-alt) / <alpha-value>)',
          'surface-hover': 'rgb(var(--iter-surface-hover) / <alpha-value>)',
          border: 'rgb(var(--iter-border) / <alpha-value>)',
          'border-soft': 'rgb(var(--iter-border-soft) / <alpha-value>)',
          text: 'rgb(var(--iter-text) / <alpha-value>)',
          muted: 'rgb(var(--iter-text-muted) / <alpha-value>)',
          faint: 'rgb(var(--iter-text-faint) / <alpha-value>)',
          success: 'rgb(var(--iter-success) / <alpha-value>)',
          warning: 'rgb(var(--iter-warning) / <alpha-value>)',
          danger: 'rgb(var(--iter-danger) / <alpha-value>)',
          info: 'rgb(var(--iter-info) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(42 47 102 / 0.06), 0 1px 3px 0 rgb(42 47 102 / 0.06)',
        card: '0 2px 10px -2px rgb(42 47 102 / 0.08), 0 1px 2px 0 rgb(42 47 102 / 0.06)',
        popover: '0 16px 40px -8px rgb(42 47 102 / 0.18)',
        glow: '0 0 0 1px rgb(var(--iter-primary) / 0.35), 0 0 24px -6px rgb(var(--iter-primary) / 0.4)',
      },
      backgroundImage: {
        'iter-mesh':
          'radial-gradient(at 20% 0%, rgb(var(--iter-primary) / 0.10) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(var(--iter-secondary) / 0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgb(var(--iter-accent) / 0.06) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
