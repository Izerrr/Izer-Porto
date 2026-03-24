import "./globals.css";
import ClientWrapper from "./components/ClientWrapper";

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
