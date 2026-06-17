import type { Config } from "tailwindcss";

/**
 * Kaichecks design tokens.
 * Palette: island sand (beige), sage (light green), ocean (light + deep blue),
 * with coral and amber reserved for water-safety status states.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FBF7EF",
          100: "#F5ECD9",
          200: "#ECDDBE",
          300: "#E0C99B",
          400: "#D4B47A",
          500: "#C39E5C",
        },
        sage: {
          50: "#F0F6EC",
          100: "#DDEBD3",
          200: "#C2DBB2",
          300: "#9FC588",
          400: "#7DAE64",
          500: "#5E9047",
          600: "#497336",
        },
        ocean: {
          50: "#EAF7FC",
          100: "#CDECF7",
          200: "#A2DBEF",
          300: "#6FC4E4",
          400: "#3FA8D4",
          500: "#2389BC",
          600: "#176C99",
          700: "#11526F",
          800: "#0C3B50",
        },
        coral: {
          100: "#FBE0D8",
          300: "#F2A28C",
          400: "#E97C5F",
          500: "#DD5C3C",
          600: "#C2462A",
        },
        caution: {
          100: "#FBEFD0",
          300: "#F2D58C",
          400: "#E8BE5C",
          500: "#D9A23A",
        },
        foam: "#F7FCFD",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        panel: "0 18px 48px -24px rgba(12, 59, 80, 0.45)",
        "panel-sm": "0 10px 30px -18px rgba(12, 59, 80, 0.4)",
        pin: "0 6px 16px -4px rgba(12, 59, 80, 0.55)",
        glow: "0 0 0 6px rgba(63, 168, 212, 0.18)",
      },
      backgroundImage: {
        "ocean-depth":
          "linear-gradient(180deg, #EAF7FC 0%, #A2DBEF 38%, #3FA8D4 72%, #176C99 100%)",
        "sand-haze":
          "radial-gradient(120% 90% at 50% 0%, #FBF7EF 0%, #F5ECD9 55%, #ECDDBE 100%)",
      },
      keyframes: {
        "wave-x": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ripple: {
          "0%": { transform: "scale(0.6)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-480px 0" },
          "100%": { backgroundPosition: "480px 0" },
        },
        drift: {
          "0%": { transform: "translateX(-8%)" },
          "100%": { transform: "translateX(8%)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "wave-x": "wave-x 14s linear infinite",
        "wave-x-slow": "wave-x 22s linear infinite",
        "wave-x-fast": "wave-x 9s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        rise: "rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        ripple: "ripple 2.6s ease-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        drift: "drift 18s ease-in-out infinite alternate",
        "spin-slow": "spin-slow 3.2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
