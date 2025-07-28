/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  safelist: [
    { pattern: /bg-(wine|amber)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    {
      pattern: /text-(wine|amber)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern:
        /border-(wine|amber)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Wine Industry Colors
        wine: {
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#f9cdcd",
          300: "#f4a9a9",
          400: "#ec7878",
          500: "#df4f4f",
          600: "#cc3333",
          700: "#a92020",
          800: "#8b1f1f",
          900: "#731f1f",
          950: "#3e0d0d",
        },
        gold: {
          50: "#fffdf0",
          100: "#fffadb",
          200: "#fff3b8",
          300: "#ffe885",
          400: "#ffd951",
          500: "#ffc82a",
          600: "#eda711",
          700: "#cc840c",
          800: "#a3650f",
          900: "#865313",
          950: "#4f2c07",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      backgroundImage: {
        "wine-gradient":
          "linear-gradient(135deg, #cc3333 0%, #a92020 50%, #731f1f 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #ffc82a 0%, #eda711 50%, #cc840c 100%)",
        "luxury-gradient": "linear-gradient(135deg, #cc3333 0%, #eda711 100%)",
        "hero-pattern":
          'url(\'data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffd951" fill-opacity="0.03"%3E%3Cpath d="M0 40L40 0H20L0 20M40 40V20L20 40"/%3E%3C/g%3E%3C/svg%3E\')',
      },
      boxShadow: {
        wine: "0 4px 14px 0 rgba(169, 32, 32, 0.15)",
        gold: "0 4px 14px 0 rgba(237, 167, 17, 0.15)",
        luxury:
          "0 10px 40px rgba(169, 32, 32, 0.2), 0 4px 10px rgba(237, 167, 17, 0.1)",
        card: "0 2px 8px rgba(15, 23, 42, 0.08)",
        elegant: "0 8px 32px rgba(15, 23, 42, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "bounce-gentle": "bounceGentle 2s infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite alternate",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        pulseGold: {
          "0%": { boxShadow: "0 0 0 0 rgba(237, 167, 17, 0.4)" },
          "100%": { boxShadow: "0 0 0 10px rgba(237, 167, 17, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
