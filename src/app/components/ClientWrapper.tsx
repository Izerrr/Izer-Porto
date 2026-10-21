"use client";
import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    /* 1. Lenis Smooth Scroll Engine synced with GSAP Ticker */
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenis.on("scroll", ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const handleScroll = (e: any) => lenis.scrollTo(e.detail, { duration: 1.4 });
    window.addEventListener("lenis-scroll", handleScroll);

    /* 2. Accurate Pointer Detection (Avoid false positives on touchscreen laptops) */
    const checkIsTouchOnly = () => {
      return window.matchMedia("(hover: none), (pointer: coarse)").matches;
    };

    const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;

    let xTo: ((value: number) => void) | null = null;
    let yTo: ((value: number) => void) | null = null;

    if (targetCursor) {
      // Center follower on cursor tip and force GPU compositing
      gsap.set(targetCursor, { opacity: 0, xPercent: -50, yPercent: -50, force3D: true });

      xTo = gsap.quickTo(targetCursor, "x", { duration: 0.12, ease: "power2.out" });
      yTo = gsap.quickTo(targetCursor, "y", { duration: 0.12, ease: "power2.out" });
    }

    let isCursorVisible = false;

    const moveCursor = (e: MouseEvent) => {
      if (!targetCursor || checkIsTouchOnly()) {
        if (targetCursor) gsap.set(targetCursor, { opacity: 0 });
        return;
      }

      if (xTo && yTo) {
        xTo(e.clientX);
        yTo(e.clientY);
      }

      if (!isCursorVisible) {
        gsap.to(targetCursor, { opacity: 1, duration: 0.15, overwrite: "auto" });
        isCursorVisible = true;
      }
    };

    const hideCursor = () => {
      if (targetCursor) {
        gsap.to(targetCursor, { opacity: 0, duration: 0.15, overwrite: "auto" });
        isCursorVisible = false;
      }
    };

    const handleOver = (e: MouseEvent) => {
      if (checkIsTouchOnly() || !targetCursor) return;

      const el = e.target as HTMLElement;
      if (el.closest("input, textarea")) {
        gsap.to(targetCursor, { scale: 0.3, opacity: 0.2, duration: 0.2, overwrite: "auto" });
        return;
      }

      const target = el.closest("a, button, .magnetic-target");
      if (target) {
        if (target.classList.contains("work-link-wrapper")) {
          gsap.to(targetCursor, { scale: 2.2, opacity: 0.4, duration: 0.3, overwrite: "auto" });
        } else {
          gsap.to(targetCursor, { scale: 3.5, opacity: 0.3, duration: 0.3, ease: "back.out(1.7)", overwrite: "auto" });
        }
      }
    };

    const handleOut = (e: MouseEvent) => {
      if (checkIsTouchOnly() || !targetCursor) return;

      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target, input, textarea");
      if (target) {
        gsap.to(targetCursor, { scale: 1, opacity: 1, duration: 0.3, overwrite: "auto" });
      }
    };

    /* 3. Scroll Progress Bar Tracking */
    const progressAnimation = gsap.to(".scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2,
      },
    });

    window.addEventListener("mousemove", moveCursor, { passive: true });
    document.addEventListener("mouseleave", hideCursor);
    window.addEventListener("touchstart", hideCursor, { passive: true });
    window.addEventListener("mouseover", handleOver, { passive: true });
    window.addEventListener("mouseout", handleOut, { passive: true });

    return () => {
      window.removeEventListener("lenis-scroll", handleScroll);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("touchstart", hideCursor);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);

      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      progressAnimation.scrollTrigger?.kill();
      progressAnimation.kill();
    };
  }, []);

  return <>{children}</>;
}
