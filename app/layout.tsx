import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./upgrades.css";
import "./pose-map.css";
import "./mode-pose-map.css";
import "./estefy.css";
import "./xuso.css";
import "./coop-fix.css";
import "./coop-ki.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080707",
};

const imageUrl = "https://benifaio-fighters-v2-3-1.kaleb-padberg93.chatgpt.site/og.png";

export const metadata: Metadata = {
  title: "Hardcore Fighters — Web Arcade Edition",
  description: "Hardcore Fighters, la recreativa de Central preparada para web, pantalla táctil y mandos.",
  applicationName: "Hardcore Fighters",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hardcore Fighters",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-180.png",
  },
  openGraph: {
    title: "Hardcore Fighters",
    description: "¿Quién domina Central? Maletilla, Vanessa y Josevictor entran en combate.",
    type: "website",
    images: [{ url: imageUrl, width: 1680, height: 945, alt: "Los luchadores de Hardcore Fighters en Central" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hardcore Fighters",
    description: "¿Quién domina Central? Maletilla, Vanessa y Josevictor entran en combate.",
    images: [imageUrl],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
