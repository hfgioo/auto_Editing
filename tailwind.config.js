/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          bg: '#F5F5F5',
          surface: '#FAFAFA',
          border: '#E5E5E5',
          text: {
            primary: '#2D2D2D',
            secondary: '#6B6B6B',
            tertiary: '#9B9B9B',
          },
          accent: {
            primary: '#CC785C',
            hover: '#B86A4F',
            light: '#F5EBE7',
          },
        },
      },
      borderRadius: {
        claude: '8px',
      },
      boxShadow: {
        claude: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
