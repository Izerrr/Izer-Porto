"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Experience() {
  const [activeTab, setActiveTab] = useState<"experience" | "education">("experience");
  const [experienceData, setExperienceData] = useState<any[]>([]);
  const [educationData, setEducationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 1. FETCH DATA PARALLEL (Careers & Education)
  useEffect(() => {
    const fetchExp = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=experience`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setExperienceData(data);
      })
      .catch((err) => console.error("Gagal ambil data experience:", err));

    const fetchEdu = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=education`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEducationData(data);
      })
      .catch((err) => console.error("Gagal ambil data education:", err));

    Promise.all([fetchExp, fetchEdu]).then(() => {
      setLoading(false);
    });
  }, []);

  // 2. ANIMASI SWITCH TOGGLE & SCROLL REVEAL (GSAP STAGGER)
  useEffect(() => {
    if (loading || !listRef.current) return;

    const ctx = gsap.context(() => {
      const items = listRef.current?.querySelectorAll(".experience-item");

      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            onComplete: () => {
              ScrollTrigger.refresh();
            },
          },
        );
      } else {
        ScrollTrigger.refresh();
      }
    }, listRef);

    return () => ctx.revert();
  }, [activeTab, loading]);

  const currentList = activeTab === "experience" ? experienceData : educationData;

  return (
    <section id="experience" className="section-container" ref={sectionRef} style={{ minHeight: "70vh" }}>
      {/* HEADER SECTION */}
      <div className="section-header" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 className="section-title kinetic-reveal">Experience.</h2>

        {/* --- TOGGLE MENU --- */}
        <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("experience")}
            className="magnetic-target"
            style={{
              background: "none",
              border: "none",
              paddingBottom: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              color: "inherit",
              opacity: activeTab === "experience" ? 1 : 0.4,
              borderBottom: "2px solid",
              borderColor: activeTab === "experience" ? "currentColor" : "transparent",
              transition: "opacity 0.3s ease, border-color 0.3s ease",
            }}
          >
            Careers & Ventures
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("education")}
            className="magnetic-target"
            style={{
              background: "none",
              border: "none",
              paddingBottom: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              color: "inherit",
              opacity: activeTab === "education" ? 1 : 0.4,
              borderBottom: "2px solid",
              borderColor: activeTab === "education" ? "currentColor" : "transparent",
              transition: "opacity 0.3s ease, border-color 0.3s ease",
            }}
          >
            Education
          </button>
        </div>
      </div>

      {/* --- TIMELINE LIST --- */}
      <div className="experience-list" ref={listRef} style={{ marginTop: "3.5rem" }}>
        {loading ? (
          <p style={{ textAlign: "center", opacity: 0.5, padding: "2rem 0" }}>Loading database...</p>
        ) : currentList.length > 0 ? (
          currentList.map((item, idx) => (
            <div key={item.id || idx} className="exp-row experience-item">
              {/* SISI KIRI: Durasi & Posisi */}
              <div className="exp-left" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.date_range}</span>
                <h3 style={{ fontSize: "clamp(1.35rem, 3.5vw, 2.1rem)", fontWeight: "700", margin: 0, letterSpacing: "-0.5px" }}>{item.title}</h3>
              </div>

              {/* SISI KANAN: Deskripsi */}
              {item.description && (
                <div className="exp-right" style={{ fontSize: "1rem", lineHeight: "1.7", opacity: 0.85 }}>
                  <p className="exp-description" style={{ margin: 0 }}>{item.description}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", opacity: 0.4, padding: "4rem 0" }}>Belum ada data di sub-kategori ini.</p>
        )}
      </div>
    </section>
  );
}
