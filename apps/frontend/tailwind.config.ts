import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          100: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          200: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          300: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          400: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          500: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          600: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
          700: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
          800: 'rgb(var(--border-rgb) / <alpha-value>)',
          900: 'rgb(var(--surface-rgb) / <alpha-value>)',
          950: 'rgb(var(--background-rgb) / <alpha-value>)',
        },
        cyan: {
          200: 'rgb(var(--primary-hover-rgb) / <alpha-value>)',
          300: 'rgb(var(--primary-rgb) / <alpha-value>)',
          400: 'rgb(var(--primary-rgb) / <alpha-value>)',
          500: 'rgb(var(--primary-rgb) / <alpha-value>)',
        },
      },
    }
  },
  plugins: []
};

export default config;
