import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopBar } from "@/components/TopBar";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Milea Estate KPI Dashboard",
  description: "Comprehensive business intelligence platform for Milea Estate Vineyard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Milea Estate Dashboard"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#a92020" },
    { media: "(prefers-color-scheme: dark)", color: "#731f1f" }
  ]
};

// Theme script to prevent flash
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.add(theme);
    } catch (e) {
      console.log('Theme script error:', e);
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <TopBar />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
