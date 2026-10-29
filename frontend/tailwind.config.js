// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
const a = (name) => `rgb(var(--a-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Admin panel tokens (defined in src/app/admin/admin.css, light + dark)
        a: {
          bg: a('bg'),
          panel: a('panel'),
          raised: a('raised'),
          hover: a('hover'),
          line: a('line'),
          text: a('text'),
          muted: a('muted'),
          faint: a('faint'),
          accent: a('accent'),
          'accent-fg': a('accent-fg'),
          good: a('good'),
          warn: a('warn'),
          bad: a('bad'),
          info: a('info'),
          violet: a('violet'),
        },
      },
      fontFamily: {
        display: ["'Chakra Petch'", "'Barlow'", 'sans-serif'],
      },
      boxShadow: {
        pop: '0 12px 40px -12px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(var(--a-line) / 0.9)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'slide-up': 'slide-up .2s cubic-bezier(.16,1,.3,1)',
        'slide-in-right': 'slide-in-right .25s cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
}
