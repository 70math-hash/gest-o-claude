import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QT GESTÃO", template: "%s · QT GESTÃO" },
  description: "Sistema de gestão e controladoria do QT Pizza Bar",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icone.svg", apple: "/icone.svg" },
  appleWebApp: { capable: true, title: "QT GESTÃO", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#efecec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
