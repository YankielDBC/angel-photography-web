import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#c9a85c',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://angelphotographymiami.com'),
  title: {
    default: "Angel Photography Miami | Sesiones Fotográficas Profesionales",
    template: "%s | Angel Photography Miami",
  },
  description: "Fotografía profesional en Miami. Sesiones de newborn, niños, maternidad, bodas y eventos. Reserva tu sesión hoy. Entrega digital rápida.",
  keywords: ["fotografía Miami", "fotógrafo profesional Miami", "sesión de fotos newborn", "fotografía infantil Miami", "bodas Miami", "maternidad", "Angel Photography"],
  authors: [{ name: "Angel Photography" }],
  creator: "Angel Photography Miami",
  publisher: "Angel Photography Miami",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://angelphotographymiami.com",
    siteName: "Angel Photography Miami",
    title: "Angel Photography Miami | Sesiones Fotográficas Profesionales",
    description: "Fotografía profesional en Miami. Sesiones de newborn, niños, maternidad, bodas y eventos. Reserva tu sesión hoy.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Angel Photography Miami",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Angel Photography Miami",
    description: "Fotografía profesional en Miami. Reserva tu sesión hoy.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://angelphotographymiami.com",
    languages: {
      es: "https://angelphotographymiami.com",
      en: "https://angelphotographymiami.com",
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="font-sans antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
