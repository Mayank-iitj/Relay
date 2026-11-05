/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: "#0C0D0E",
        },
        surface: {
          elevated: "#151718",
          border: "#26292B",
          hover: "#1F2123",
        },
        text: {
          high: "#ECEDEE",
          low: "#8B8D98",
        },
        status: {
          pass: {
            bg: "#0F2E1B",
            border: "#1B5430",
            text: "#4ADE80",
          },
          alert: {
            bg: "#382800",
            border: "#6E4F00",
            text: "#FACC15",
          },
          critical: {
            bg: "#381212",
            border: "#682323",
            text: "#F87171",
          },
          neutral: {
            bg: "#1E2022",
            border: "#323539",
            text: "#9DA1A7",
          },
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
