import { DefaultTheme } from "@pegada/shared/themes/themes";

/**
 * Landing colors are CSS variables holding RGB channels (see `globals.css`),
 * so they flip with `prefers-color-scheme` and still take Tailwind's opacity
 * modifiers (`bg-ink/10`).
 */
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    // Every `hover:` only applies under `(hover: hover) and (pointer: fine)`,
    // so a tap on a phone never leaves a button stuck in its hover state.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    fontFamily: {
      sans: ["var(--font-gilroy)", "system-ui", "sans-serif"],
      gilroy: ["var(--font-gilroy)", "system-ui", "sans-serif"],
      mono: ["var(--font-mono)", "ui-monospace", "monospace"],
    },
    colors: {
      ...DefaultTheme.colors,
      // Brand constants, the same in both schemes.
      pink: "#EE6AA7",
      navy: "#172448",
      yellow: "#F6D34D",
      // Semantic, flip in dark mode.
      page: channel("page"),
      paper: channel("paper"),
      ink: channel("ink"),
      "ink-muted": channel("ink-muted"),
      field: channel("field"),
      blush: channel("blush"),
      "pink-ink": channel("pink-ink"),
    },
    extend: {
      fontSize: {
        display: [
          "clamp(2.75rem, 3.2vw + 1.875rem, 5.75rem)",
          { lineHeight: "0.95", letterSpacing: "-0.035em", fontWeight: "800" },
        ],
        title: [
          "clamp(2.25rem, 2.2vw + 1.625rem, 3.75rem)",
          { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        lede: [
          "clamp(1.125rem, 0.5vw + 1rem, 1.375rem)",
          { lineHeight: "1.45" },
        ],
        body: ["1.0625rem", { lineHeight: "1.55" }],
        label: [
          "0.65625rem",
          { lineHeight: "1.2", letterSpacing: "0.1em", fontWeight: "700" },
        ],
      },
      spacing: {
        section: "clamp(5.5rem, 10vw, 10rem)",
        gutter: "clamp(1.25rem, 5vw, 4rem)",
      },
      maxWidth: {
        page: "80rem",
      },
      borderRadius: {
        card: "24px",
        id: "22px",
        button: "16px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        print: "var(--shadow-print)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        drawer: "var(--ease-drawer)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
