"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sound } from "../utils/sound";

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const isMuted = useSyncExternalStore(
    (callback) => {
      window.addEventListener("izer-sound-toggle", callback);
      return () => window.removeEventListener("izer-sound-toggle", callback);
    },
    () => sound.isMuted(),
    () => false,
  );

  const handleToggleSound = () => {
    sound.toggleMute();
  };
  const pathname = usePathname();
  const router = useRouter();

  const navItems = ["About", "Skills", "Experience", "Works", "Contact"];

  // 1. Restore saved theme on mount
  useEffect(() => {
    const isLightSaved = typeof window !== "undefined" && localStorage.getItem("izer_theme") === "light";
    if (isLightSaved) {
      document.body.classList.add("light-mode");
      gsap.set(":root", { "--hero-floor": "rgba(255,255,255,0.8)" });
    } else {
      document.body.classList.remove("light-mode");
      gsap.set(":root", { "--hero-floor": "rgba(10,17,32,1)" });
    }
    const rafId = requestAnimationFrame(() => setIsLight(isLightSaved));
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 2. Lock body scroll and handle ESC when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // 3. ScrollTrigger section tracking & Magnetic targets with clean listener removal
  useEffect(() => {
    const listeners: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = [];

    const ctx = gsap.context(() => {
      if (pathname === "/") {
        const sections = document.querySelectorAll("section, footer");
        sections.forEach((sec) => {
          const id = sec.getAttribute("id");
          if (!id) return;
          ScrollTrigger.create({
            trigger: sec,
            start: id === "contact" ? "top 85%" : "top center",
            end: id === "contact" ? "bottom bottom" : "bottom center",
            onToggle: (self) => {
              if (self.isActive) setActiveSection(id);
            },
          });
        });
        ScrollTrigger.refresh();
      }

      const mTargets = document.querySelectorAll(".magnetic-target");
      mTargets.forEach((el) => {
        const t = el as HTMLElement;
        const move = (e: MouseEvent) => {
          if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
          const { left, top, width, height } = t.getBoundingClientRect();
          const x = (e.clientX - left - width / 2) * 0.35;
          const y = (e.clientY - top - height / 2) * 0.35;
          gsap.to(t, { x, y, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        };
        const leave = () => {
          gsap.to(t, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)", overwrite: "auto" });
        };
        t.addEventListener("mousemove", move, { passive: true });
        t.addEventListener("mouseleave", leave);
        listeners.push({ el: t, move, leave });
      });
    });

    return () => {
      listeners.forEach(({ el, move, leave }) => {
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
      ctx.revert();
    };
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    sound.playAction();
    setIsOpen(false);

    if (pathname !== "/") {
      router.push(id === "hero" ? "/" : `/#${id}`);
      return;
    }

    window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: `#${id}` }));
  };

  const toggleTheme = () => {
    sound.playAction();
    const newTheme = !isLight;
    setIsLight(newTheme);
    localStorage.setItem("izer_theme", newTheme ? "light" : "dark");

    gsap.fromTo(
      ".theme-btn svg",
      { rotation: 0, scale: 0.5, opacity: 0 },
      {
        rotation: 360,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      },
    );

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
        <a href="#hero" onClick={(e) => handleNavClick(e, "hero")} className="logo-container magnetic-target" aria-label="Home">
          <img src="/Resources/Logo/logo-dark.svg" alt="IZR" className="nav-logo logo-dark" />
          <img src="/Resources/Logo/logo-light.svg" alt="IZR" className="nav-logo logo-light" />
        </a>

        <ul className="nav-links">
          {navItems.map((item) => {
            const id = item.toLowerCase();
            return (
              <li key={item}>
                <a href={`#${id}`} onClick={(e) => handleNavClick(e, id)} className={`nav-item magnetic-target ${pathname === "/" && activeSection === id ? "active" : ""}`}>
                  {item}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="nav-controls">
          <button
            onClick={handleToggleSound}
            className={`sound-btn magnetic-target ${isMuted ? "muted" : ""}`}
            aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
            title={isMuted ? "Sound: Off (Click to Enable)" : "Sound: On (Click to Mute)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMuted ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </>
              )}
            </svg>
          </button>
          <button onClick={toggleTheme} className="theme-btn magnetic-target" aria-label="Toggle theme">
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

          <div className={`hamburger magnetic-target ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)} role="button" aria-label="Toggle menu">
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
                  <a href={`#${id}`} onClick={(e) => handleNavClick(e, id)} className={`mobile-nav-item ${pathname === "/" && activeSection === id ? "active" : ""}`}>
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
