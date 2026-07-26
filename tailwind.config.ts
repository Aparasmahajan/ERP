import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #2563eb)',
        secondary: 'var(--secondary-color, #7c3aed)',
      },
    },
  },
  plugins: [],
}
export default config
