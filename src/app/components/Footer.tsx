"use client";
import { useState } from "react";

export default function Footer() {
  const [copied, setCopied] = useState(false);
  const email = "rayhanfahrezisetiawan@gmail.com";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <footer id="contact" className="lando-footer">
      <div className="footer-content">
        <h2 className="footer-heading kinetic-reveal">Let's collaborate.</h2>
        <p className="footer-sub">Terbuka untuk ngobrolin project IT, kolaborasi multimedia, atau sekadar lari bareng pagi-pagi.</p>
        <div className="footer-action" style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <a href={`mailto:${email}`} className="btn-primary magnetic-target">
            Get in touch
          </a>
          <button
            type="button"
            onClick={handleCopyEmail}
            className={`btn-copy-email magnetic-target ${copied ? "copied" : ""}`}
            aria-label="Copy email address to clipboard"
          >
            {copied ? "✓ Email Copied!" : "Copy Email"}
          </button>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-links">
          <a href="https://instagram.com/rayizerrr/" target="_blank" rel="noopener noreferrer" className="magnetic-target">
            Instagram
          </a>
          <a href="https://linkedin.com/in/rayhan-fahrezi-setiawan/" target="_blank" rel="noopener noreferrer" className="magnetic-target">
            LinkedIn
          </a>
          <a href="https://github.com/Izerrr/" target="_blank" rel="noopener noreferrer" className="magnetic-target">
            GitHub
          </a>
        </div>
        <p className="copyright">&copy; 2026 IZER. CRAFTED WITH PROFESSIONALISM.</p>
      </div>
    </footer>
  );
}
