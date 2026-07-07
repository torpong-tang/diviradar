import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiviRadar",
  description: "Dividend Radar for Thai dividend stock investors"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
