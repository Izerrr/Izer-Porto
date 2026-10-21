"use client";
import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const [typewriter, setTypewriter] = useState("Rayhan Fahrezi Setiawan.");
  const [localTime, setLocalTime] = useState("");

  // 1. Live WIB Timezone Clock
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setLocalTime(`${formatter.format(now)} WIB`);
      } catch {
        setLocalTime("GMT+7");
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  // 2. GSAP Parallax & Watermark Scroll
  useEffect(() => {
    const hBox = document.querySelector(".hero-visual-box") as HTMLElement | null;
    const hImg = document.querySelector(".parallax-img") as HTMLElement | null;

    const handleMove = (e: MouseEvent) => {
      if (!hBox || !hImg || window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
      const { left, top, width, height } = hBox.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) / 30;
      const y = (e.clientY - top - height / 2) / 30;
      gsap.to(hImg, { x, y, duration: 0.6, ease: "power2.out", overwrite: "auto" });
    };

    const handleLeave = () => {
      if (!hImg) return;
      gsap.to(hImg, { x: 0, y: 0, duration: 1, ease: "power3.out", overwrite: "auto" });
    };

    const ctx = gsap.context(() => {
      if (hBox && hImg) {
        hBox.addEventListener("mousemove", handleMove, { passive: true });
        hBox.addEventListener("mouseleave", handleLeave);
      }

      gsap.to(".hero-watermark", {
        y: 150,
        opacity: 0.1,
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    return () => {
      if (hBox) {
        hBox.removeEventListener("mousemove", handleMove);
        hBox.removeEventListener("mouseleave", handleLeave);
      }
      ctx.revert();
    };
  }, []);

  // 3. Typewriter Logic
  useEffect(() => {
    const words = ["Rayhan Fahrezi Setiawan.", "IZER."];
    let wIdx = 0;
    let cIdx = words[0].length;
    let isDel = true;
    let tOut: ReturnType<typeof setTimeout>;

    const type = () => {
      const curr = words[wIdx];
      setTypewriter(curr.substring(0, cIdx));

      let speed = isDel ? 35 : 75;

      if (!isDel && cIdx === curr.length) {
        speed = 2600;
        isDel = true;
      } else if (isDel && cIdx === 0) {
        isDel = false;
        wIdx = (wIdx + 1) % words.length;
        speed = 500;
      } else {
        cIdx += isDel ? -1 : 1;
      }

      tOut = setTimeout(type, speed);
    };

    tOut = setTimeout(type, 2500);
    return () => clearTimeout(tOut);
  }, []);

  const handleScrollExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: "#about" }));
  };

  return (
    <section id="hero" className="hero-section section-container" style={{ position: "relative", overflow: "hidden" }}>
      <div className="tech-grid"></div>

      <div className="hero-visual-box glass-card">
        <div className="hero-watermark-wrapper">
          <h1 className="hero-watermark">IZER</h1>
        </div>
        <img src="/Resources/Hero/hero.svg" alt="Rayhan Fahrezi Setiawan" className="hero-photo parallax-img" />
      </div>

      <div className="hero-branding">
        <div className="availability-pill">
          <span className="status-dot"></span>
          <span className="status-text">
            Available for Projects {localTime ? `• ID (${localTime})` : "• Indonesia"}
          </span>
        </div>

        <h2 className="hero-name">
          <span className="typewriter-text">{typewriter}</span>
          <span className="typing-cursor">|</span>
        </h2>
        <p className="hero-role reveal-text">Crafting Digital Solutions with Creative Edge.</p>
      </div>

      <a href="#about" onClick={handleScrollExplore} className="scroll-indicator magnetic-target" aria-label="Scroll to About section">
        <div className="mouse-icon">
          <div className="mouse-wheel"></div>
        </div>
        <span className="scroll-text">Scroll to explore</span>
      </a>
    </section>
  );
}
