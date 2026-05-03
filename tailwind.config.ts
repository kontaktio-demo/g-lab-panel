import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        'bg-elev': '#14181d',
        'bg-elev-2': '#1b2128',
        border: '#262d36',
        'border-strong': '#323a46',
        text: '#e7ecf2',
        'text-muted': '#9aa3ad',
        accent: '#ff001e',
        'accent-hover': '#ff2238',
        'accent-2': '#ff5566',
        success: '#22c55e',
        danger: '#ef4444',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.28)',
        elev: '0 18px 40px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'grad-accent': 'linear-gradient(135deg, #ff001e 0%, #ff3a52 100%)',
        'grad-surface': 'linear-gradient(180deg, #161a20 0%, #11151a 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
