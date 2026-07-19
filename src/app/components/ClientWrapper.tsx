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

    /* Initial Cursor State */
    const cursor = document.querySelector(".cursor-follower") as HTMLElement;
    if (cursor) {
      gsap.set(cursor, { opacity: 0 });
    }

    /* Device Detection Blocker */
    const checkIsMobile = () => {
      return window.innerWidth <= 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0;
    };

    /* Cursor Movement Handler */
    const moveCursor = (e: MouseEvent) => {
      const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;
      if (!targetCursor) return;

      if (checkIsMobile()) {
        gsap.set(targetCursor, { opacity: 0 });
        return;
      }

      gsap.to(targetCursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: "power2.out",
        opacity: 1,
      });
    };

    /* Cursor Hide Handler */
    const hideCursor = () => {
      const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;
      if (targetCursor) {
        gsap.to(targetCursor, { opacity: 0, duration: 0.1 });
      }
    };

    /* Event Delegation Hover Handlers */
    /* Event Delegation Hover Handlers */
    const handleOver = (e: MouseEvent) => {
      if (checkIsMobile()) return;

      const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;
      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");

      if (target && targetCursor) {
        /* Cek jika kursor menyentuh kartu portfolio utama */
        if (target.classList.contains("work-link-wrapper")) {
          gsap.to(targetCursor, { scale: 1.5, opacity: 0.4, duration: 0.3 });
        } else {
          /* Skala balon besar untuk tombol/menu kecil standar */
          gsap.to(targetCursor, { scale: 3.5, opacity: 0.3, duration: 0.3, ease: "back.out(1.7)" });
        }
      }
    };

    const handleOut = (e: MouseEvent) => {
      if (checkIsMobile()) return;

      const targetCursor = document.querySelector(".cursor-follower") as HTMLElement;
      const target = (e.target as HTMLElement).closest("a, button, .magnetic-target");
      if (target && targetCursor) {
        gsap.to(targetCursor, { scale: 1, opacity: 1, duration: 0.3 });
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
