import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./upgrades.css";
import "./pose-map.css";
import "./mode-pose-map.css";
import "./estefy.css";
import "./xuso.css";
import "./new-fighters-draft.css";
import "./coop-fix.css";
import "./coop-ki.css";
import "./orb-fix.css";
import "./phone-fit.css";
import "./coop-shoot-poses.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080707",
};

const imageUrl = "https://benifaio-fighters-v2-3-1.kaleb-padberg93.chatgpt.site/og-hardcore-fighters.png";

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
    images: [{ url: imageUrl, width: 1672, height: 941, alt: "Hardcore Fighters: Maletilla contra Vanessa en Benifaió" }],
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
      <body>{children}<script src="/presence.js?v=2.35.0" defer /></body>
    </html>
  );
}
