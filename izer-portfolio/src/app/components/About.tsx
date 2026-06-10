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

  // 1 Slot State String Tunggal, diisi langsung dengan teks asli bawaan lo
  const [aboutText, setAboutText] = useState<string>(
    "Memadukan kepemimpinan manajerial dari pengalaman memimpin OSIS dengan presisi teknis di dunia IT. Fokus gue ada pada penciptaan solusi digital yang nggak cuma fungsional, tapi juga ngasih pengalaman visual yang elegan.\n\nSebagai seorang jack of all trades, gue seneng mengeksplorasi banyak hal mulai dari ngoding, desain grafis, video editing, sampai main instrumen musik. Belakangan ini, gue juga lagi aktif lari buat ngelatih konsistensi—karena ngebangun endurance di jalanan ternyata nggak jauh beda sama ngerjain project kompleks.",
  );

  // Kita pecah teksnya berdasarkan Double Enter di sini (menghasilkan array)
  const paragraphs = aboutText.split("\n\n");

  // 1. Fetch data foto & teks dari database secara pararel
  useEffect(() => {
    setIsMounted(true);

    // FOTO: 100% Tetap pakai file lama lo (about.php) biar placeholder lo masuk sempurna
    fetch("http://localhost/izer-api/about.php")
      .then((res) => res.json())
      .then((data) => {
        setImages(data);
        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 500);
      })
      .catch((err) => console.error("Gagal ambil foto About:", err));

    // TEKS: Ambil dari 1 slot row di database
    fetch("http://localhost/izer-api/get_data.php?category=about")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]?.description) {
          setAboutText(data[0].description);
        }
      })
      .catch((err) => console.error("Gagal ambil teks About:", err));
  }, []);

  // 2. Logika Slider & GSAP (100% Original bawaan lo, gak disentuh)
  useEffect(() => {
    if (!isMounted || images.length === 0) return;

    const interval = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % images.length);
    }, 4000);

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

  return (
    <section id="about" className="section-container" ref={sectionRef} style={{ minHeight: "60vh" }}>
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">About Me.</h2>
      </div>

      {/* STRUKTUR UTAMA ELEMEN: 100% Kaku dan Identik dengan kode lama lo */}
      {isMounted && (
        <div className="glass-card about-combined">
          <div className="about-text">
            <h3 className="elegant-heading-small">Get to Know Me!</h3>

            {/* KUNCI SAKTI: Dua tag <p> dikunci mati secara struktural tanpa array .map() */}
            {/* Fallback ke spasi kosong (\u00A0) biar tinggi baris gak ambyar kalau data belum keload */}
            <p>{paragraphs[0] || "\u00A0"}</p>
            <p>{paragraphs[1] || "\u00A0"}</p>
          </div>

          <div className="about-visual-wrapper">
            {images.length > 0 ? (
              images.map((src, idx) => <img key={idx} src={src} alt={`Profile ${idx + 1}`} className={`about-img ${idx === imgIndex ? "active" : ""}`} />)
            ) : (
              <div style={{ width: "100%", height: "100%", background: "var(--bg-surface)" }}></div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
