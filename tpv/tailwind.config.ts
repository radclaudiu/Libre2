import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fde6e6',
          200: '#fbd0d0',
          300: '#f7abab',
          400: '#f17878',
          500: '#e74c3c',
          600: '#d42f1f',
          700: '#b22518',
          800: '#932218',
          900: '#7a221b',
        },
      },
    },
  },
  plugins: [],
};
export default config;
