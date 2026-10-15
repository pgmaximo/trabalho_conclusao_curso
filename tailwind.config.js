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
        field: '14px',
        card: '20px',
      },
      // Vincula os identificadores das faces do IBM Plex Sans (carregadas via
      // @expo-google-fonts/ibm-plex-sans) ao padrão do Tailwind — ver src/app/_layout.tsx
      // para o mapeamento dinâmico peso→face aplicado a todo Text/TextInput.
      fontFamily: {
        sans: ['IBMPlexSans_400Regular', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
