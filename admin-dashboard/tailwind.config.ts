import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#E8EEF7',
          100: '#C6D3EC',
          500: '#1565C0',
          700: '#0D2137',
          900: '#071424',
        },
        gold: {
          400: '#D4A853',
          500: '#C49240',
        },
      },
    },
  },
  plugins: [],
}

export default config
