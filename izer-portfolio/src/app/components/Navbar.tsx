"use client";
import { useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [activeSection, setActiveSection] = useState(""); // State buat deteksi section aktif

  // Logic Toggle Theme
  const toggleTheme = () => {
    const newTheme = !isLight;
    setIsLight(newTheme);
    if (newTheme) {
      document.body.classList.add("light-mode");
      gsap.to(":root", { "--hero-floor": "rgba(255,255,255,0.8)", duration: 0.5 });
    } else {
      document.body.classList.remove("light-mode");
      gsap.to(":root", { "--hero-floor": "rgba(10,17,32,1)", duration: 0.5 });
    }
  };

  // Logic Active Nav On Scroll (Yang hilang kemaren)
  useEffect(() => {
    const sections = document.querySelectorAll("section, footer");
    const triggers: ScrollTrigger[] = [];

    sections.forEach((sec) => {
      const id = sec.getAttribute("id");
      if (!id) return;

      const st = ScrollTrigger.create({
        trigger: sec,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) setActiveSection(id);
        },
      });
      triggers.push(st);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  const navItems = ["About", "Skills", "Experience", "Works", "Contact"];

  return (
    <>
      <nav className="glass-navbar">
        <a href="#hero" className="logo-container magnetic-target">
          <img src="/Resources/logo-dark.svg" alt="IZR" className="nav-logo logo-dark" />
          <img src="/Resources/logo-light.svg" alt="IZR" className="nav-logo logo-light" />
        </a>

        <ul className="nav-links">
          {navItems.map((item) => {
            const id = item.toLowerCase();
            return (
              <li key={item}>
                <a href={`#${id}`} className={`nav-item magnetic-target ${activeSection === id ? "active" : ""}`}>
                  {item}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav-controls">
          <button onClick={toggleTheme} className="theme-btn magnetic-target" aria-label="Toggle Theme">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isLight ? (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              ) : (
                <>
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </>
              )}
            </svg>
          </button>
          <div className={`hamburger magnetic-target ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)}>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${isOpen ? "active" : ""}`}>
        <div className="mobile-menu-inner">
          <div className="mobile-nav-spacer"></div>
          <ul className="mobile-nav-links">
            {navItems.map((item) => {
              const id = item.toLowerCase();
              return (
                <li key={item}>
                  <a href={`#${id}`} className={`mobile-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => setIsOpen(false)}>
                    {item}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mobile-menu-badge">
            <span className="badge-icon">IZER</span>
            <p>EST. 2026</p>
          </div>
          <div className="mobile-menu-footer">
            <a href="#contact" className="mobile-contact-link mobile-nav-item" onClick={() => setIsOpen(false)}>
              Business Enquiries
            </a>
            <div className="mobile-socials">
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
              <a href="#">YouTube</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
