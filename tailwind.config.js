/** @type {import('tailwindcss').Config} */
const config = {
    content: [
          "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
          "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
          "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
        ],
        theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
                      100: "#dcfce7",
                      200: "#bbf7d0",
                      300: "#86efac",
                      400: "#4ade80",
                      500: "#22c55e",
                      600: "#16a34a",
                      700: "#15803d",
                      800: "#166534",
                      900: "#14532d",
            },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
          },
                boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
                  "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
          },
    },
    },
  plugins: [],
    };

module.exports = config;
