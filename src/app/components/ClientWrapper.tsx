"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sound } from "../utils/sound";

gsap.registerPlugin(ScrollTrigger);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminOrLogin = pathname?.startsWith("/admin") || pathname?.startsWith("/login");

  useEffect(() => {
    if (isAdminOrLogin) {
      document.body.classList.add("native-cursor");
      const targetCursor = document.querySelector(".cursor-follower") as HTMLElement | null;
      if (targetCursor) gsap.set(targetCursor, { opacity: 0, display: "none" });
      return () => {
        document.body.classList.remove("native-cursor");
      };
    }

    document.body.classList.remove("native-cursor");

    /* 1. Lenis Smooth Scroll Engine */
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
    gsap.ticker.lagSmoothing(500, 33);

    const handleScroll = (e: Event) => lenis.scrollTo((e as CustomEvent).detail, { duration: 1.4 });
    window.addEventListener("lenis-scroll", handleScroll);

    /* 2. Accurate Pointer Detection */
    const checkIsTouchOnly = () => {
      return window.matchMedia("(hover: none), (pointer: coarse)").matches;
    };

    const targetCursor = document.querySelector(".cursor-follower") as HTMLElement | null;

    let xTo: ((value: number) => void) | null = null;
    let yTo: ((value: number) => void) | null = null;

    if (targetCursor) {
      targetCursor.style.display = "";
      gsap.set(targetCursor, { opacity: 0, xPercent: -50, yPercent: -50, force3D: true });

      // Snappy duration (0.08s) eliminates the drag lag while preserving fluid movement
      xTo = gsap.quickTo(targetCursor, "x", { duration: 0.08, ease: "power2.out" });
      yTo = gsap.quickTo(targetCursor, "y", { duration: 0.08, ease: "power2.out" });
    }

    let isCursorVisible = false;

    const moveCursor = (e: MouseEvent) => {
      const card = (e.target as HTMLElement | null)?.closest(".glass-card, .skill-box, .ios-segmented-control") as HTMLElement | null;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      }
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

      const target = el.closest("a, button, .magnetic-target, [role='button'], .slider-dot");
      if (target) {
        sound.playHover();
        if (target.classList.contains("work-link-wrapper")) {
          gsap.to(targetCursor, { scale: 2.2, opacity: 0.4, duration: 0.3, overwrite: "auto" });
        } else {
          // Bouncy / elastic "mentul-mentul" feel with back.out(1.7)
          gsap.to(targetCursor, { scale: 3.5, opacity: 0.3, duration: 0.3, ease: "back.out(1.7)", overwrite: "auto" });
        }
      }
    };

    const handleOut = (e: MouseEvent) => {
      if (checkIsTouchOnly() || !targetCursor) return;

      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target, [role='button'], .slider-dot, input, textarea");
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
    const handleClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest("button, a, .magnetic-target, [role='button'], .slider-dot")) {
        sound.playAction();
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("mouseover", handleOver, { passive: true });
    window.addEventListener("mouseout", handleOut, { passive: true });

    return () => {
      window.removeEventListener("lenis-scroll", handleScroll);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("touchstart", hideCursor);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);

      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      progressAnimation.scrollTrigger?.kill();
      progressAnimation.kill();
    };
  }, [isAdminOrLogin]);

  return <>{children}</>;
}
