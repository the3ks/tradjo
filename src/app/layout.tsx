import type { Metadata } from "next";
import { GeistSans, GeistMono } from "geist/font";

import { PwaRegistrar } from "@/components/pwa-registrar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "A secure, mobile-friendly trading journal for synced exchange trades.",
  applicationName: "Trading Journal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trading Journal"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
