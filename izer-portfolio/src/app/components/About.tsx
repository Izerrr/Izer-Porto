"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const [images, setImages] = useState<string[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const sectionRef = useRef(null);

  // 1. Fetch data foto dari database
  useEffect(() => {
    setIsMounted(true);
    fetch("http://localhost/izer-api/about.php")
      .then((res) => res.json())
      .then((data) => setImages(data))
      .catch((err) => console.error("Gagal ambil foto About:", err));
  }, []);

  // 2. Logika Slider & GSAP (Hanya jalan setelah data ada)
  useEffect(() => {
    if (!isMounted || images.length === 0) return;

    // A. Logic Slider Otomatis
    const interval = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    // B. Logic Kinetic Reveal Khusus Seksi Ini (Biar nggak rebutan sama global)
    let ctx = gsap.context(() => {
      const title = document.querySelector("#about .kinetic-reveal");
      if (title && !title.getAttribute("data-activated")) {
        const text = title.textContent || "";
        title.innerHTML = "";
        [...text].forEach((char) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? "\u00A0" : char;
          span.style.display = "inline-block";
          title.appendChild(span);
        });
        title.setAttribute("data-activated", "true");

        gsap.from(title.querySelectorAll("span"), {
          scrollTrigger: { trigger: title, start: "top 85%" },
          y: 30,
          opacity: 0,
          filter: "blur(5px)",
          stagger: 0.02,
          duration: 0.8,
          ease: "power3.out",
        });
      }
    }, sectionRef);

    return () => {
      clearInterval(interval);
      ctx.revert();
    };
  }, [images, isMounted]);

  // Cek kalau belum mounted/loading buat hindari hydration error
  if (!isMounted) return null;

  return (
    <section id="about" className="section-container" ref={sectionRef}>
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">About Me.</h2>
      </div>
      <div className="glass-card about-combined">
        <div className="about-text">
          <h3 className="elegant-heading-small">Presisi & Ketahanan.</h3>
          <p>Memadukan kepemimpinan manajerial dari pengalaman memimpin OSIS dengan presisi teknis di dunia IT. Fokus gue ada pada penciptaan solusi digital yang nggak cuma fungsional, tapi juga ngasih pengalaman visual yang elegan.</p>
          <p>
            Sebagai seorang <i>jack of all trades</i>, gue seneng mengeksplorasi banyak hal mulai dari ngoding, desain grafis, video editing, sampai main instrumen musik. Belakangan ini, gue juga lagi aktif lari buat ngelatih
            konsistensi—karena ngebangun <i>endurance</i> di jalanan ternyata nggak jauh beda sama ngerjain project kompleks.
          </p>
        </div>
        <div className="about-visual-wrapper">
          {images.length > 0 ? (
            images.map((src, idx) => <img key={idx} src={src} alt={`Profile ${idx + 1}`} className={`about-img ${idx === imgIndex ? "active" : ""}`} />)
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--bg-surface)" }}></div>
          )}
        </div>
      </div>
    </section>
  );
}
