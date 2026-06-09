/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        stage: 'var(--bg-stage)',
        void: 'var(--bg-void)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-high': 'var(--surface-high)',
        chrome: 'var(--text-chrome)',
        silver: 'var(--text-silver)',
        muted: 'var(--text-muted)',
        cyan: 'var(--neon-cyan)',
        magenta: 'var(--neon-magenta)',
        violet: 'var(--neon-violet)',
        plasma: 'var(--plasma-blue)',
        'stroke-glass': 'var(--stroke-glass)',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        glass: '16px',
        pill: '9999px',
      },
      maxWidth: {
        container: '1280px',
      },
      boxShadow: {
        neon: '0 0 24px rgba(0, 229, 255, 0.35), 0 0 48px rgba(255, 43, 247, 0.2)',
        'neon-sm': '0 0 12px rgba(0, 229, 255, 0.25)',
      },
    },
  },
};
