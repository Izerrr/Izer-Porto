"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Experience from "./components/Experience";
import Works from "./components/Works";
import Footer from "./components/Footer";

export default function Home() {
  useEffect(() => {
    document.body.classList.add("loading");
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    const ctx = gsap.context(() => {
      // PRELOADER LOGIC
      let progress = 0;
      const pBar = document.querySelector(".preloader-progress") as HTMLElement;
      const pPct = document.querySelector(".preloader-percent") as HTMLElement;

      // Animasiin teks IZER muncul dari bawah (Reveal)
      gsap.to(".preloader-text", {
        y: "0%",
        duration: 1.2,
        ease: "power4.out",
        delay: 0.2,
      });

      progressInterval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 100) {
          progress = 100;
          if (progressInterval) clearInterval(progressInterval);

          gsap.to(".preloader", {
            y: "-100%",
            duration: 1.2,
            delay: 0.4,
            ease: "power4.inOut",
            onComplete: () => {
              document.body.classList.remove("loading");
              ScrollTrigger.refresh();
            },
          });
        }
        if (pBar) pBar.style.width = progress + "%";
        if (pPct) pPct.textContent = Math.round(progress) + "%";
      }, 45);

      // KINETIC REVEAL (Idempotent untuk semua judul seksi)
      const kineticTitles = document.querySelectorAll(".kinetic-reveal");
      kineticTitles.forEach((title) => {
        if (!title.getAttribute("data-kinetic")) {
          const text = title.textContent || "";
          title.innerHTML = "";
          [...text].forEach((char) => {
            const span = document.createElement("span");
            span.textContent = char === " " ? "\u00A0" : char;
            span.style.display = "inline-block";
            title.appendChild(span);
          });
          title.setAttribute("data-kinetic", "true");
        }

        gsap.fromTo(
          title.querySelectorAll("span"),
          { y: 30, opacity: 0, filter: "blur(5px)" },
          {
            scrollTrigger: { trigger: title, start: "top 85%" },
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            stagger: 0.02,
            duration: 0.8,
            ease: "power3.out",
          },
        );
      });
    });

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      document.body.classList.remove("loading");
      ctx.revert();
    };
  }, []);

  return (
    <main>
      <div className="preloader">
        <div className="preloader-content">
          <div className="preloader-text-wrapper">
            <h1 className="preloader-text">IZER</h1>
          </div>
          <div className="preloader-bar">
            <div className="preloader-progress"></div>
          </div>
          <span className="preloader-percent">0%</span>
        </div>
      </div>

      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Experience />
      <Works />
      <Footer />
    </main>
  );
}
