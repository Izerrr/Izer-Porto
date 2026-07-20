"use client";
import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    /* Lenis Smooth Scroll Engine Setup */
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const handleScroll = (e: any) => lenis.scrollTo(e.detail, { duration: 1.5 });
    window.addEventListener("lenis-scroll", handleScroll);

    /* Device Detection Blocker */
    const checkIsMobile = () => {
      return window.innerWidth <= 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0;
    };

    /* 💡 CACHE DOM ELEMENT ONCE (Fix High CPU Load) */
    const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;

    /* 💡 GSAP QUICKTO INITIALIZATION (Fix Solitaire Artifacting / Ghosting) */
    let xTo: ((value: number) => void) | null = null;
    let yTo: ((value: number) => void) | null = null;

    if (targetCursor) {
      // Force GPU Rendering Layer to avoid repaint trails
      gsap.set(targetCursor, { opacity: 0, force3D: true });

      // Highly-optimized quick setters for high polling rate / virtual mice
      xTo = gsap.quickTo(targetCursor, "x", { duration: 0.15, ease: "power2.out" });
      yTo = gsap.quickTo(targetCursor, "y", { duration: 0.15, ease: "power2.out" });
    }

    let isCursorVisible = false;

    /* Cursor Movement Handler */
    const moveCursor = (e: MouseEvent) => {
      if (!targetCursor || checkIsMobile()) {
        if (targetCursor) gsap.set(targetCursor, { opacity: 0 });
        return;
      }

      // Update position via ultra-fast quickTo
      if (xTo && yTo) {
        xTo(e.clientX);
        yTo(e.clientY);
      }

      // Smooth fade in once cursor moves
      if (!isCursorVisible) {
        gsap.to(targetCursor, { opacity: 1, duration: 0.1, overwrite: "auto" });
        isCursorVisible = true;
      }
    };

    /* Cursor Hide Handler */
    const hideCursor = () => {
      if (targetCursor) {
        gsap.to(targetCursor, { opacity: 0, duration: 0.1, overwrite: "auto" });
        isCursorVisible = false;
      }
    };

    /* Event Delegation Hover Handlers */
    const handleOver = (e: MouseEvent) => {
      if (checkIsMobile() || !targetCursor) return;

      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");

      if (target) {
        if (target.classList.contains("work-link-wrapper")) {
          gsap.to(targetCursor, { scale: 1.5, opacity: 0.4, duration: 0.3, overwrite: "auto" });
        } else {
          gsap.to(targetCursor, { scale: 3.5, opacity: 0.3, duration: 0.3, ease: "back.out(1.7)", overwrite: "auto" });
        }
      }
    };

    const handleOut = (e: MouseEvent) => {
      if (checkIsMobile() || !targetCursor) return;

      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");
      if (target) {
        gsap.to(targetCursor, { scale: 1, opacity: 1, duration: 0.3, overwrite: "auto" });
      }
    };

    /* Scroll Progress Bar Tracking */
    const progressAnimation = gsap.to(".scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });

    /* Event Listeners Initialization */
    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseleave", hideCursor);
    window.addEventListener("touchstart", hideCursor);
    window.addEventListener("mouseover", handleOver);
    window.addEventListener("mouseout", handleOut);

    /* Garbage Collection and Memory Cleanup */
    return () => {
      window.removeEventListener("lenis-scroll", handleScroll);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("touchstart", hideCursor);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);

      lenis.destroy();
      progressAnimation.scrollTrigger?.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return <>{children}</>;
}
