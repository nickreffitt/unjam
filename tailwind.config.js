/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./extension/**/*.{js,ts,jsx,tsx}",
    "./dashboard/**/*.{js,ts,jsx,tsx}",
    "./common/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: 'unjam-',
  theme: {
    extend: {},
  },
  plugins: [],
}