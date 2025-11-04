// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'dialog': '20px',
        'card': '16px',
        'section': '12px',
        'btn': '10px',
        'input': '10px',
      },
      boxShadow: {
        // Shadows corporativos del proyecto
        'corporate': '0 2px 8px rgba(71, 85, 105, 0.06)',
        'material': '0 4px 12px rgba(71, 85, 105, 0.08)',
        'hover': '0 6px 16px rgba(71, 85, 105, 0.12)',
        'elevated': '0 8px 24px rgba(71, 85, 105, 0.15)',
        'purple': '0 4px 12px rgba(139, 92, 246, 0.3)',
        'purple-lg': '0 6px 20px rgba(139, 92, 246, 0.5)',
        'dialog': '0 20px 40px rgba(71, 85, 105, 0.2)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [],
};
