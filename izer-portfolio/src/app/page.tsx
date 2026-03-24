"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Experience from "./components/Experience";
import Works from "./components/Works";
import Footer from "./components/Footer";

export default function Home() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // PRELOADER LOGIC
      // --- BAGIAN PRELOADER SAJA ---
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

      const progressInterval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);

          // Animasi Keluar: Pastiin Selector-nya bener-bener ".preloader"
          gsap.to(".preloader", {
            y: "-100%",
            duration: 1.2,
            delay: 0.5,
            ease: "power4.inOut",
            onComplete: () => {
              document.body.classList.remove("loading");
              // ScrollTrigger refresh supaya Kinetic Reveal di bawahnya gak salah posisi
              ScrollTrigger.refresh();
            },
          });
        }
        if (pBar) pBar.style.width = progress + "%";
        if (pPct) pPct.textContent = Math.round(progress) + "%";
      }, 50);
      // --- END OF PRELOADER LOGIC ---

      // KINETIC REVEAL (Hanya untuk judul seksi)
      const kineticTitles = document.querySelectorAll(".kinetic-reveal");
      kineticTitles.forEach((title) => {
        const text = title.textContent || "";
        title.innerHTML = "";
        [...text].forEach((char) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? "\u00A0" : char;
          span.style.display = "inline-block";
          title.appendChild(span);
        });
        gsap.from(title.querySelectorAll("span"), {
          scrollTrigger: { trigger: title, start: "top 85%" },
          y: 30,
          opacity: 0,
          filter: "blur(5px)",
          stagger: 0.02,
          duration: 0.8,
          ease: "power3.out",
        });
      });
    });
    return () => ctx.revert();
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
