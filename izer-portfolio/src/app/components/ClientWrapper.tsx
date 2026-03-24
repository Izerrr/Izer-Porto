"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

gsap.registerPlugin(ScrollTrigger);

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Smooth Scroll
    const lenis = new Lenis({ lerp: 0.1 });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. Optimized Cursor (QuickSetter fix snappy bug)
    const cursor = document.querySelector(".cursor-follower");
    const xTo = gsap.quickSetter(cursor, "x", "px");
    const yTo = gsap.quickSetter(cursor, "y", "px");

    const onMouseMove = (e: MouseEvent) => {
      xTo(e.clientX - 7.5);
      yTo(e.clientY - 7.5);
    };
    window.addEventListener("mousemove", onMouseMove);

    // 3. Global Scroll Progress
    gsap.to(".scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { scrub: 0.3, trigger: "body", start: "top top", end: "bottom bottom" },
    });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
