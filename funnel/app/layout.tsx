import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body style={{ position: "relative", zIndex: 1 }}>
        {children}
      </body>
    </html>
  );
}
