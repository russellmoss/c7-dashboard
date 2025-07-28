import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { TopBar } from "@/components/TopBar";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Milea Estate KPI Dashboard",
  description: "Comprehensive business intelligence platform for Milea Estate Vineyard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TopBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
