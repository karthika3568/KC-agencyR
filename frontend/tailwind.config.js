/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6F2DA8',
          hover: '#5C238C',
          soft: '#EEE5FF',
          light: '#F4EEFF',
        },
        sidebar: {
          DEFAULT: '#351442',
          active: '#8244AD',
          hover: '#451A55',
          text: '#D8CEE2',
          muted: '#A899B8',
        },
        lavender: {
          50: '#FAF8FF',
          100: '#F7F5FF',
          200: '#EEE5FF',
          300: '#DDD0FF',
          400: '#C4B5FD',
          500: '#8244AD',
          600: '#6F2DA8',
          900: '#351442',
        },
        navbar: {
          DEFAULT: '#FFFFFF',
          alt: '#F7F5FF',
          dark: '#351442',
        },
        gold: {
          DEFAULT: '#6F2DA8',
          soft: '#8244AD',
        },
        page: '#F7F5FF',
        card: '#FFFFFF',
        border: {
          DEFAULT: '#E5E7F5',
          soft: '#E5E7F5',
          subtle: '#EEE5FF',
        },
        ink: {
          DEFAULT: '#17233D',
          muted: '#697797',
          light: '#94A3B8',
          onnavy: '#F7F5FF',
        },
        success: {
          DEFAULT: '#10B981',
          bg: '#ECFDF5',
          border: '#A7F3D0',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#E11D48',
          bg: '#FFF1F2',
          border: '#FECDD3',
        },
        highlight: '#EEE5FF',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'soft': '0 2px 10px rgba(53, 20, 66, 0.04)',
        'soft-md': '0 4px 20px rgba(53, 20, 66, 0.08)',
        'soft-lg': '0 8px 30px rgba(53, 20, 66, 0.12)',
      },
    },
  },
  plugins: [],
};
