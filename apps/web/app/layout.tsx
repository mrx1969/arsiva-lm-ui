import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Arsiva-LM", template: "%s · Arsiva-LM" },
  description: "Sistem kearsipan internal Lembaga Management FEB UI",
  icons: { icon: "/brand/lm-mark.png", apple: "/brand/lm-mark.png" },
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
