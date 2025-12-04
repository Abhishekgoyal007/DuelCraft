// tailwind.config.cjs
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#66c2ff",
        accent: "#7b61ff",
        darkbg: "#0f1724"
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
