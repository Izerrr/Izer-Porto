"use client";
import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const [typewriter, setTypewriter] = useState("");

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Parallax Mouse (Foto ikutin mouse)
      const hBox = document.querySelector(".hero-visual-box");
      const hImg = document.querySelector(".parallax-img");
      if (hBox && hImg) {
        hBox.addEventListener("mousemove", (e: any) => {
          const { left, top, width, height } = hBox.getBoundingClientRect();
          // Pake koordinat relatif box biar lebih presisi
          const x = (e.clientX - left - width / 2) / 30;
          const y = (e.clientY - top - height / 2) / 30;
          gsap.to(hImg, { x, y, duration: 0.6, ease: "power2.out" });
        });
        hBox.addEventListener("mouseleave", () => gsap.to(hImg, { x: 0, y: 0, duration: 1, ease: "power3.out" }));
      }

      // 2. Parallax Watermark pas di-scroll
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
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    // 3. Typewriter Logic
    const words = ["Rayhan Fahrezi Setiawan.", "IZER."];
    let wIdx = 0,
      cIdx = 0,
      isDel = false;
    let tOut: any;

    const type = () => {
      const curr = words[wIdx];
      setTypewriter(isDel ? curr.substring(0, cIdx--) : curr.substring(0, cIdx++));
      let speed = isDel ? 40 : 80;

      if (!isDel && cIdx === curr.length + 1) {
        speed = 2500;
        isDel = true;
      } else if (isDel && cIdx === 0) {
        isDel = false;
        wIdx = (wIdx + 1) % words.length;
        speed = 600;
      }
      tOut = setTimeout(type, speed);
    };
    tOut = setTimeout(type, 1000);
    return () => clearTimeout(tOut);
  }, []);

  return (
    <section id="hero" className="hero-section section-container" style={{ position: "relative", overflow: "hidden" }}>
      {/* 4. TECH GRID: Dipindah ke sini biar cuma ada di Hero */}
      <div className="tech-grid"></div>

      <div className="hero-visual-box glass-card scroll-reveal">
        <div className="hero-watermark-wrapper">
          <h1 className="hero-watermark">IZER</h1>
        </div>
        <img src="/Resources/hero.svg" alt="Rayhan Rezi" className="hero-photo parallax-img" />
      </div>

      <div className="hero-branding scroll-reveal">
        <h2 className="hero-name">
          <span>{typewriter}</span>
          <span className="typing-cursor">|</span>
        </h2>
        <p className="hero-role reveal-text">Crafting Digital Solutions with Creative Edge.</p>
      </div>

      <div className="scroll-indicator">
        <div className="mouse-icon">
          <div className="mouse-wheel"></div>
        </div>
        <span className="scroll-text">Scroll to explore</span>
      </div>
    </section>
  );
}
