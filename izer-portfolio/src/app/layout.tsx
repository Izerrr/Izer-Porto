import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "./components/ClientWrapper";

export const metadata: Metadata = {
  title: "IZER | Portfolio & IT Specialist", // Judul utama tab browser
  description: "Portfolio digital IZER. Memadukan kepemimpinan manajerial dengan presisi teknis di bidang IT Programming, Graphic Design, dan Media Production.",
  keywords: ["IZER", "Portfolio", "Web Developer", "IT Programming", "Graphic Design", "Ex-Ketua OSIS"],
  authors: [{ name: "Rezi" }],

  /* Open Graph (Pratinjau link pas di-share ke WhatsApp, Discord, atau sosmed) */
  openGraph: {
    title: "IZER | Portfolio & IT Specialist",
    description: "Crafting Digital Solutions with Creative Edge.",
    url: "https://portfolio-rezi.id", // Ganti dengan domain asli lo nanti pas udah hosting
    siteName: "IZER Portfolio",
    images: [
      {
        url: "/thumbnail-sharing.png", // Taruh file gambar preview di folder public/
        width: 1200,
        height: 630,
        alt: "IZER Portfolio Preview Image",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="loading">
        {/* Visual global statis - CUMA DI SINI, JANGAN DI PAGE.TSX */}
        <div className="cursor-follower"></div>
        <div className="ambient-glow"></div>
        <div className="scroll-progress"></div>

        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
