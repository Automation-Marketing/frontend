import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import ThemeProvider from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "FunnelAI – AI-Powered Campaign Generator",
  description: "Generate high-converting social media campaigns powered by your brand's real content and AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* Animated background orbs */}
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <Navbar />
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
