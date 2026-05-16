/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        heading: ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          primary:    '#020209',
          secondary:  '#07071a',
          tertiary:   '#0b0b22',
          card:       'rgba(7,7,26,0.8)',
        },
        brand: {
          violet:  '#6366f1',
          violet2: '#818cf8',
          violet3: '#c4b5fd',
          cyan:    '#06b6d4',
          cyan2:   '#22d3ee',
          purple:  '#a855f7',
          purple2: '#d946ef',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1, #06b6d4)',
        'gradient-text':  'linear-gradient(90deg, #818cf8, #22d3ee)',
        'gradient-card':  'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.06))',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan':       'scan 3s ease-in-out infinite',
        'float':      'float 4s ease-in-out infinite',
        'fade-up':    'fadeUp 0.3s ease forwards',
        'ticker':     'ticker 25s linear infinite',
        'glow':       'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        scan:      { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        ticker:    { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        glowPulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      backdropBlur: { xl: '24px', '2xl': '32px' },
      boxShadow: {
        glow:    '0 0 20px rgba(99,102,241,0.35), 0 0 60px rgba(99,102,241,0.12)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.1)',
        'glow-sm':   '0 0 12px rgba(99,102,241,0.3)',
      },
    },
  },
  plugins: [],
}
