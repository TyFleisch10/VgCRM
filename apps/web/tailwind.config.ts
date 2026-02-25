import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WaterSys brand colors — clean blue/teal water theme
        brand: {
          50:  "#eff8ff",
          100: "#dbeffe",
          200: "#bfe2fd",
          300: "#92cffc",
          400: "#5eb5f9",
          500: "#3897f5",
          600: "#2279ea",
          700: "#1b63d7",
          800: "#1d51af",
          900: "#1d468a",
          950: "#162b55",
        },
        water: {
          50:  "#f0fafb",
          100: "#d9f2f4",
          200: "#b7e5ea",
          300: "#84d0d9",
          400: "#49b3c1",
          500: "#2e97a7",
          600: "#29798d",
          700: "#276374",
          800: "#285260",
          900: "#254552",
          950: "#142d37",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
