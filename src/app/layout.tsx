import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dossier Location Facile",
  description: "Récupérez vos dossiers de location en toute simplicité",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
