import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";

import { demoTenant } from "@/lib/demo-data";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: demoTenant.seoTitle,
    template: `%s | ${demoTenant.name}`,
  },
  description: demoTenant.seoDescription,
  openGraph: {
    title: demoTenant.seoTitle,
    description: demoTenant.seoDescription,
    siteName: demoTenant.name,
    locale: "es_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: demoTenant.seoTitle,
    description: demoTenant.seoDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: demoTenant.name,
    description: demoTenant.seoDescription,
    url: baseUrl,
    telephone: demoTenant.whatsapp,
  };

  return (
    <html lang="es">
      <body className={`${plusJakarta.variable} ${spaceMono.variable} ${cormorant.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
