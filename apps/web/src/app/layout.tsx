import type { Metadata } from "next";
import { AuthProvider } from "@/auth/provider";
import { getAuthSession } from "@/auth/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "D&D Companion",
  description: "Campaign memory and table support for D&D groups.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();

  return (
    <html lang="en">
      <body>
        <AuthProvider initialSession={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}

