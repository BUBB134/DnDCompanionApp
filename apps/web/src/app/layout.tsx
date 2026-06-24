import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { arcaneClerkAppearance } from "@/auth/appearance";
import { getAuthProvider, getClerkAuthConfig } from "@/auth/config";
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
  const clerkConfig =
    getAuthProvider() === "clerk" ? getClerkAuthConfig() : null;
  const body = (
    <>
      <AuthProvider initialSession={session}>{children}</AuthProvider>
      <Analytics />
      <SpeedInsights />
    </>
  );

  return (
    <html lang="en">
      <body>
        {clerkConfig ? (
          <ClerkProvider
            appearance={arcaneClerkAppearance}
            publishableKey={clerkConfig.publishableKey}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
          >
            {body}
          </ClerkProvider>
        ) : (
          body
        )}
      </body>
    </html>
  );
}

