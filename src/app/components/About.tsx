"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const [images, setImages] = useState<string[]>([
    "/Resources/About_Image/profile3.JPG",
    "/Resources/About_Image/profile4.jpg",
    "/Resources/About_Image/profile5.webp",
    "/Resources/About_Image/profile6.webp",
  ]);
  const [imgIndex, setImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  const [aboutText, setAboutText] = useState<string>(
    "Memadukan kepemimpinan manajerial dari pengalaman memimpin OSIS dengan presisi teknis di dunia IT. Fokus gue ada pada penciptaan solusi digital yang nggak cuma fungsional, tapi juga ngasih pengalaman visual yang elegan.\n\nSebagai seorang jack of all trades, gue seneng mengeksplorasi banyak hal mulai dari ngoding, desain grafis, video editing, sampai main instrumen musik. Belakangan ini, gue juga lagi aktif lari buat ngelatih konsistensi, karena ngebangun endurance di jalanan ternyata nggak jauh beda sama ngerjain project kompleks.",
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
      .catch((err) => console.warn("Gagal ambil foto About:", err));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=about`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]?.description) {
          setAboutText(data[0].description);
        }
      })
      .catch((err) => console.warn("Gagal ambil teks About:", err));
  }, []);

  /* 2. Isolated Slider Timer with Hover, Focus & Reduced-Motion Pause */
  useEffect(() => {
    if (
      images.length <= 1 ||
      isHovered ||
      isFocused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const interval = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % images.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [images.length, isHovered, isFocused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(diff) > 40) {
      setImgIndex((prev) =>
        diff > 0 ? (prev + 1) % images.length : (prev - 1 + images.length) % images.length,
      );
    }
  };

  return (
    <section id="about" className="section-container" ref={sectionRef} style={{ minHeight: "60dvh" }}>
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">About Me.</h2>
      </div>

      <div className="glass-card about-combined">
        <div className="about-text">
          <h3 className="elegant-heading-small">Get to Know Me!</h3>
          {paragraphs.filter(Boolean).map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        {/* Wadah Visual Bersih Terkalibrasi */}
        <div
          className="about-visual-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((src, idx) => (
            <img
              key={`${src}-${idx}`}
              src={src}
              alt={`Rayhan Fahrezi Setiawan Profile ${idx + 1}`}
              className={`about-img ${idx === imgIndex ? "active" : ""}`}
            />
          ))}

          {images.length > 1 && (
            <div className="about-slider-dots" role="tablist" aria-label="Profile photos">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === imgIndex}
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
