/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        halo: '0 24px 64px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'shell-glow':
          'radial-gradient(circle at top left, rgba(129, 140, 248, 0.25), transparent 32%), radial-gradient(circle at top right, rgba(56, 189, 248, 0.2), transparent 28%), linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(226,232,240,0.86) 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
