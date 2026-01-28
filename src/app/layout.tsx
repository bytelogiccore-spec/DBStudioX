import type { Metadata } from "next";
import { ClientProviders } from "@/components/providers/ClientProviders";
import "@/styles/fonts.css";
import "@/styles/globals.css";
// AG Grid uses new Theming API (no CSS imports needed)

export const metadata: Metadata = {
  title: "DBStudioX - SQLite Management Studio",
  description: "A modern, cross-platform SQLite database management tool powered by sqlite3x",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
