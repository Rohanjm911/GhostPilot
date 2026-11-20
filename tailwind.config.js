/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F4F0",
        ink: {
          DEFAULT: "#000000",
          charcoal: "#18181B",
          muted: "#52525B",
        },
        lime: {
          acid: "#B8FF00",
          glow: "#D4FF55",
        },
        yellow: {
          electric: "#FFD600",
        },
        cyan: {
          cyber: "#00E5FF",
        },
        coral: {
          danger: "#FF4D4D",
        },
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #000000',
        'neo': '4px 4px 0px #000000',
        'neo-lg': '6px 6px 0px #000000',
        'neo-xl': '8px 8px 0px #000000',
        'neo-yellow': '4px 4px 0px #FFD600',
        'neo-lime': '4px 4px 0px #B8FF00',
      },
      borderWidth: {
        'neo': '2.5px',
        '3': '3px',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
