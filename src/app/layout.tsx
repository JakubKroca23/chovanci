import type { Metadata } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ChovanecStone",
  description: "Fantasy souboj s Chovanci — 1v1, decky a generátor karet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
