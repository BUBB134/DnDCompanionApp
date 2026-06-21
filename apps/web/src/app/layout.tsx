import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/auth/provider";
import { getAuthSession } from "@/auth/server";
import { reportRuntimeEnvironmentIssues } from "@/env/runtime";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "D&D Companion",
  title: "D&D Companion",
  description: "Campaign memory and table support for D&D groups.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "D&D Companion",
  },
  icons: {
    icon: [{ url: "/brand-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: ["/brand-mark.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#17161f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  reportRuntimeEnvironmentIssues();

  const session = await getAuthSession();

  return (
    <html lang="en">
      <body>
        <AuthProvider initialSession={session}>{children}</AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

