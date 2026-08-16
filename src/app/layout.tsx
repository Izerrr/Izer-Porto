import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "./components/ClientWrapper";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  metadataBase: new URL("https://izerworks.my.id"),

  title: "IZER | Portfolio",
  description: "Portfolio digital IZER. Memadukan kepemimpinan manajerial dengan presisi teknis di bidang IT Programming, Graphic Design, dan Media Production.",
  keywords: ["IZER", "Portfolio", "Web Developer", "IT Programming", "Graphic Design", "Ex-Ketua OSIS"],
  authors: [{ name: "Izer" }],

  other: {
    "Content-Security-Policy": "upgrade-insecure-requests",
  },

  openGraph: {
    title: "IZER | Portfolio",
    description: "Crafting Digital Solutions with Creative Edge.",
    url: "https://izerworks.my.id",
    siteName: "IZER Portfolio",
    images: [
      {
        url: "/Resources/thumbnail-sharing.png?v=1",
        width: 1200,
        height: 630,
        alt: "IZER Portfolio Preview Image",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
};

// Load font Inter dan daftarkan sebagai variable
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*  Gabungkan inter.variable dan class loading bawaan */}
      <body className={`${inter.variable} loading`}>
        {/* Visual global statis  */}
        <div className="cursor-follower"></div>
        <div className="ambient-glow"></div>
        <div className="scroll-progress"></div>

        {/* Wrapper komponen client  */}
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
