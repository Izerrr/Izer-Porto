"use client";
import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "@studio-freight/lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Smooth Scroll Engine (Lenis)
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Listener buat Smooth Scroll (Dipicu Navbar)
    const handleScroll = (e: any) => lenis.scrollTo(e.detail, { duration: 1.5 });
    window.addEventListener("lenis-scroll", handleScroll);

    // 2. Immersive Cursor Logic
    const cursor = document.querySelector(".cursor-follower") as HTMLElement;
    if (!cursor) return;

    // Gerakan kursor dengan lag halus (duration 0.15)
    const moveCursor = (e: MouseEvent) => {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
    };
    window.addEventListener("mousemove", moveCursor);

    // 3. Hover Mentul (Event Delegation)
    const handleOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");
      if (target) gsap.to(cursor, { scale: 3.5, opacity: 0.3, duration: 0.3, ease: "back.out(1.7)" });
    };
    const handleOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");
      if (target) gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.3 });
    };

    // 4. Scroll Progress Bar
    gsap.to(".scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });

    window.addEventListener("mouseover", handleOver);
    window.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("lenis-scroll", handleScroll);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return <>{children}</>;
}
