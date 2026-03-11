/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a5276",
          light: "#2980b9",
          dark: "#0e2f44",
        },
      },
    },
  },
  plugins: [],
}
