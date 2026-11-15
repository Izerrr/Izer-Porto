"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { sound } from "../utils/sound";
import { copyToClipboard, showHudToast, type HudToastDetail } from "../utils/clipboard";

const emptySubscribe = () => () => {};

export default function Footer() {
  const [copied, setCopied] = useState(false);
  const [hudToast, setHudToast] = useState<HudToastDetail | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncementRef = useRef("");
  const email = "rayhanfahrezisetiawan@gmail.com";

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<HudToastDetail>;
      if (!customEvent.detail?.title) return;

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

      let nextTitle = customEvent.detail.title;
      // Append non-breaking space when repeating so screen readers re-announce
      if (nextTitle === lastAnnouncementRef.current) {
        nextTitle = `${nextTitle}\u00A0`;
      }
      lastAnnouncementRef.current = nextTitle;

      setHudToast({
        title: nextTitle,
        subtitle: customEvent.detail.subtitle,
      });

      toastTimerRef.current = setTimeout(() => {
        setHudToast(null);
      }, 2500);
    };

    window.addEventListener("izer-hud-toast", handleToast);
    return () => {
      window.removeEventListener("izer-hud-toast", handleToast);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleCopyEmail = async () => {
    sound.playAction();
    const ok = await copyToClipboard(email);
    if (ok) {
      setCopied(true);
      showHudToast({
        title: "Email Copied to Clipboard",
        subtitle: email,
      });
      setTimeout(() => setCopied(false), 2500);
    } else {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <footer id="contact" className="lando-footer">
      <div className="footer-content">
        <h2 className="footer-heading kinetic-reveal">Let&apos;s collaborate.</h2>
        <p className="footer-sub">Terbuka untuk ngobrolin project IT, kolaborasi multimedia, atau sekadar lari bareng pagi-pagi.</p>
        <div className="footer-action" style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <a href={`mailto:${email}`} className="btn-primary magnetic-target">
            Get in touch
          </a>
          <button type="button" onClick={handleCopyEmail} className={`btn-copy-email magnetic-target ${copied ? "copied" : ""}`} aria-label="Copy email address to clipboard">
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
        <p className="copyright">&copy; 2026 IZERWORKS. FROM THE RIVER TO THE SEA.</p>
      </div>

      {hudToast &&
        isClient &&
        createPortal(
          <div className="macos-hud-toast" role="status" aria-live="polite">
            <div className="macos-hud-icon" aria-hidden="true">✓</div>
            <div className="macos-hud-content">
              <span className="macos-hud-title">{hudToast.title}</span>
              {hudToast.subtitle && (
                <span className="macos-hud-subtitle">{hudToast.subtitle}</span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </footer>
  );
}
