"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const [images, setImages] = useState<string[]>([
    "/Resources/About_Image/profile5.webp",
    "/Resources/About_Image/profile6.webp",
  ]);
  const [imgIndex, setImgIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const [aboutText, setAboutText] = useState<string>(
    "Memadukan kepemimpinan manajerial dari pengalaman memimpin OSIS dengan presisi teknis di dunia IT. Fokus gue ada pada penciptaan solusi digital yang nggak cuma fungsional, tapi juga ngasih pengalaman visual yang elegan.\n\nSebagai seorang jack of all trades, gue seneng mengeksplorasi banyak hal mulai dari ngoding, desain grafis, video editing, sampai main instrumen musik. Belakangan ini, gue juga lagi aktif lari buat ngelatih konsistensi—karena ngebangun endurance di jalanan ternyata nggak jauh beda sama ngerjain project kompleks.",
  );

  const paragraphs = aboutText.split("\n\n");

  /* 1. Fetch Dynamic Data from Backend */
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/about.php`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setImages(data);
          setImgIndex(0);
        }
        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 400);
      })
      .catch((err) => console.error("Gagal ambil foto About:", err));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=about`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]?.description) {
          setAboutText(data[0].description);
        }
      })
      .catch((err) => console.error("Gagal ambil teks About:", err));
  }, []);

  /* 2. Isolated Slider Timer */
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % images.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section id="about" className="section-container" ref={sectionRef} style={{ minHeight: "60vh" }}>
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">About Me.</h2>
      </div>

      <div className="glass-card about-combined">
        <div className="about-text">
          <h3 className="elegant-heading-small">Get to Know Me!</h3>
          <p>{paragraphs[0] || "\u00A0"}</p>
          <p>{paragraphs[1] || "\u00A0"}</p>
        </div>

        {/* Wadah Visual Bersih Terkalibrasi */}
        <div className="about-visual-wrapper">
          {images.map((src, idx) => (
            <img
              key={`${src}-${idx}`}
              src={src}
              alt={`Rayhan Fahrezi Setiawan Profile ${idx + 1}`}
              className={`about-img ${idx === imgIndex ? "active" : ""}`}
              style={{
                opacity: idx === imgIndex ? 1 : 0,
                zIndex: idx === imgIndex ? 2 : 1,
              }}
            />
          ))}

          {images.length > 1 && (
            <div className="about-slider-dots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImgIndex(idx)}
                  className={`slider-dot ${idx === imgIndex ? "active" : ""}`}
                  aria-label={`View photo ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
