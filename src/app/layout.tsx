import type { Metadata } from "next";
import { GeistSans, GeistMono } from "geist/font";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "A secure, mobile-friendly trading journal for synced exchange trades."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
