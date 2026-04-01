/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f6fb",
          100: "#e8ecf6",
          200: "#cbd4ea",
          700: "#334155",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        /** 리포트 제목·섹션 — 편집 디자인용 세리프 */
        report: ['"Noto Serif KR"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
