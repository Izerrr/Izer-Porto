"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // 1. GSAP Parallax, Subtle 3D Specular Tilt & Watermark Scroll (zero-re-render, quickTo)
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hBox = document.querySelector(".hero-visual-box") as HTMLElement | null;
    const hImg = document.querySelector(".parallax-img") as HTMLElement | null;

    if (hBox && !prefersReduced) {
      gsap.set(hBox, { transformPerspective: 1000, transformStyle: "preserve-3d" });
    }

    const xImgTo = hImg ? gsap.quickTo(hImg, "x", { duration: 0.6, ease: "power2.out" }) : null;
    const yImgTo = hImg ? gsap.quickTo(hImg, "y", { duration: 0.6, ease: "power2.out" }) : null;
    const rotXTo = hBox ? gsap.quickTo(hBox, "rotationX", { duration: 0.6, ease: "power2.out" }) : null;
    const rotYTo = hBox ? gsap.quickTo(hBox, "rotationY", { duration: 0.6, ease: "power2.out" }) : null;

    const handleMove = (e: MouseEvent) => {
      if (
        !hBox ||
        prefersReduced ||
        window.matchMedia("(hover: none), (pointer: coarse)").matches
      ) {
        return;
      }
      const { left, top, width, height } = hBox.getBoundingClientRect();
      const relX = (e.clientX - left - width / 2) / (width / 2);
      const relY = (e.clientY - top - height / 2) / (height / 2);

      if (xImgTo && yImgTo) {
        xImgTo(relX * 14);
        yImgTo(relY * 14);
      }
      if (rotXTo && rotYTo) {
        rotYTo(relX * 2.5);
        rotXTo(-relY * 2.5);
      }
    };

    const handleLeave = () => {
      xImgTo?.(0);
      yImgTo?.(0);
      rotXTo?.(0);
      rotYTo?.(0);
    };

    const ctx = gsap.context(() => {
      if (hBox && !prefersReduced) {
        hBox.addEventListener("mousemove", handleMove, { passive: true });
        hBox.addEventListener("mouseleave", handleLeave);
      }

      if (!prefersReduced) {
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
      }
    });

    return () => {
      if (hBox) {
        hBox.removeEventListener("mousemove", handleMove);
        hBox.removeEventListener("mouseleave", handleLeave);
      }
      ctx.revert();
    };
  }, []);

  // 2. Imperative Typewriter (0 React re-renders at 20Hz)
  useEffect(() => {
    const el = typewriterRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = "Rayhan Fahrezi Setiawan.";
      return;
    }

    const words = ["Rayhan Fahrezi Setiawan.", "IZER."];
    let wIdx = 0;
    let cIdx = words[0].length;
    let isDel = true;
    let tOut: ReturnType<typeof setTimeout>;

    const type = () => {
      const curr = words[wIdx];
      el.textContent = curr.substring(0, cIdx);

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
      <div className="tech-grid" aria-hidden="true"></div>

      <div className="hero-visual-box glass-card">
        <div className="hero-watermark-wrapper" aria-hidden="true">
          <span className="hero-watermark">IZER</span>
        </div>
        <img src="/Resources/Hero/hero.svg" alt="Rayhan Fahrezi Setiawan" className="hero-photo parallax-img" />
      </div>

      <div className="hero-branding">
        <h1 className="hero-name">
          <span ref={typewriterRef} className="typewriter-text">Rayhan Fahrezi Setiawan.</span>
          <span className="typing-cursor" aria-hidden="true">|</span>
        </h1>
        <p className="hero-role reveal-text">Crafting Digital Solutions with Creative Edge.</p>
      </div>

      <a href="#about" onClick={handleScrollExplore} className="scroll-indicator magnetic-target" aria-label="Scroll to About section">
        <div className="mouse-icon" aria-hidden="true">
          <div className="mouse-wheel"></div>
        </div>
        <span className="scroll-text">Scroll to explore</span>
      </a>
    </section>
  );
}
