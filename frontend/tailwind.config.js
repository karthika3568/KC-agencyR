/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navbar: {
          DEFAULT: '#171E2B',
          alt: '#1F2937',
        },
        gold: {
          DEFAULT: '#C9A227',
          soft: '#E8C766',
        },
        page: '#F6F2E8',
        card: '#FFFFFF',
        border: {
          soft: '#EAE3D3',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#6B7280',
          onnavy: '#F5F1E6',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#92400E',
          bg: '#FCE9C8',
        },
        danger: {
          DEFAULT: '#DC2626',
        },
        highlight: '#F0E6D2',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
};
