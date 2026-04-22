import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D&D Companion",
  description: "Campaign memory and table support for D&D groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

