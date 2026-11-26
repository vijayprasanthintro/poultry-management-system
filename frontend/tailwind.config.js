/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9ee',
          100: '#fcf0d6',
          200: '#f9e0aa',
          300: '#f5cb74',
          400: '#f1b43f',
          500: '#e99d1d',
          600: '#d98313',
          700: '#b46513',
          800: '#904f16',
          900: '#754116',
        },
        egg: {
          50: '#fdf5f0',
          100: '#fbe5d8',
          200: '#f6c7ad',
          300: '#f09f7b',
          400: '#e97449',
          500: '#df582c',
          600: '#c24221',
          700: '#a0351d',
          800: '#812d1d',
          900: '#692a1b',
        },
      },
      fontFamily: {
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};