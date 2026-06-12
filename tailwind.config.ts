import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3b3bff",
          50: "#eef0ff",
          100: "#e0e3ff",
          500: "#3b3bff",
          600: "#2f2fe0",
          700: "#2525b3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
