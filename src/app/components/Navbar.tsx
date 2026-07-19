"use client";
import { useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  const navItems = ["About", "Skills", "Experience", "Works", "Contact"];

  useEffect(() => {
    let ctx = gsap.context(() => {
      // 1. Akurasi Active Nav (Pake center biar gak meleset)
      const sections = document.querySelectorAll("section, footer");
      sections.forEach((sec) => {
        const id = sec.getAttribute("id");
        if (!id) return;
        ScrollTrigger.create({
          trigger: sec,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActiveSection(id);
          },
        });
      });
      ScrollTrigger.refresh();

      // 2. Immersive Magnetic Pull
      const mTargets = document.querySelectorAll(".magnetic-target");
      mTargets.forEach((t: any) => {
        t.addEventListener("mousemove", (e: MouseEvent) => {
          const { left, top, width, height } = t.getBoundingClientRect();
          const x = (e.clientX - left - width / 2) * 0.4;
          const y = (e.clientY - top - height / 2) * 0.4;
          gsap.to(t, { x, y, duration: 0.3, ease: "power2.out" });
        });
        t.addEventListener("mouseleave", () => {
          gsap.to(t, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
        });
      });
    });

    return () => ctx.revert(); // Cleanup total
  }, []);

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: `#${id}` }));
  };

  // Logic Toggle Theme dengan Animasi Mentul
  const toggleTheme = () => {
    const newTheme = !isLight;
    setIsLight(newTheme);

    // 1. ANIMASI IKON (Muter & Mentul)
    // Kita targetin SVG di dalam tombol theme-btn
    gsap.fromTo(
      ".theme-btn svg",
      { rotation: 0, scale: 0.5, opacity: 0 },
      {
        rotation: 360,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "back.out(1.7)", // Efek mentul-mentul khas Rezi
      },
    );

    // 2. Logic Theme & Hero Floor
    if (newTheme) {
      document.body.classList.add("light-mode");
      gsap.to(":root", { "--hero-floor": "rgba(255,255,255,0.8)", duration: 0.5 });
    } else {
      document.body.classList.remove("light-mode");
      gsap.to(":root", { "--hero-floor": "rgba(10,17,32,1)", duration: 0.5 });
    }
  };

  return (
    <>
      <nav className="glass-navbar">
        <a href="#hero" onClick={(e) => handleNavClick(e, "hero")} className="logo-container magnetic-target">
          <img src="/Resources/logo-dark.svg" alt="IZR" className="nav-logo logo-dark" />
          <img src="/Resources/logo-light.svg" alt="IZR" className="nav-logo logo-light" />
        </a>

        <ul className="nav-links">
          {navItems.map((item) => {
            const id = item.toLowerCase();
            return (
              <li key={item}>
                <a href={`#${id}`} onClick={(e) => handleNavClick(e, id)} className={`nav-item magnetic-target ${activeSection === id ? "active" : ""}`}>
                  {item}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav-controls">
          <button onClick={toggleTheme} className="theme-btn magnetic-target">
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

      {/* MOBILE MENU */}
      <div className={`mobile-menu-overlay ${isOpen ? "active" : ""}`}>
        <div className="mobile-menu-inner">
          <ul className="mobile-nav-links">
            {navItems.map((item) => {
              const id = item.toLowerCase();
              return (
                <li key={item}>
                  <a href={`#${id}`} onClick={(e) => handleNavClick(e, id)} className={`mobile-nav-item ${activeSection === id ? "active" : ""}`}>
                    {item}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
