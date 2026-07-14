import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { connection } from "next/server";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { arcaneClerkAppearance } from "@/auth/appearance";
import { getAuthProvider, getClerkAuthConfig } from "@/auth/config";
import { AuthProvider } from "@/auth/provider";
import { getAuthSession } from "@/auth/server";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_MARK_PATH,
  PRODUCT_NAME,
  PRODUCT_ORIGIN,
  PRODUCT_SHORT_NAME,
} from "@/brand";
import { reportRuntimeEnvironmentIssues } from "@/env/runtime";
import "./globals.css";

const brandSans = Inter({
  subsets: ["latin"],
  variable: "--font-brand-sans",
});
const brandDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-brand-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCT_ORIGIN),
  applicationName: PRODUCT_NAME,
  title: {
    default: PRODUCT_NAME,
    template: `%s | ${PRODUCT_SHORT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PRODUCT_SHORT_NAME,
  },
  icons: {
    icon: [{ url: PRODUCT_MARK_PATH, type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: [PRODUCT_MARK_PATH],
  },
  openGraph: {
    description: PRODUCT_DESCRIPTION,
    locale: "en_GB",
    siteName: PRODUCT_NAME,
    title: PRODUCT_NAME,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description: PRODUCT_DESCRIPTION,
    title: PRODUCT_NAME,
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
    <html lang="en" className={`${brandSans.variable} ${brandDisplay.variable}`}>
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

