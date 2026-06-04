const themeTokens = require('./src/constants/themeTokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // habilita toggle manual via setColorScheme (ThemeContext)
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}', './__tests__/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: themeTokens.light,
        'app-dark': themeTokens.dark,
      },
      borderRadius: {
        app: '20px',
        card: '28px',
      },
    },
  },
  plugins: [],
};
