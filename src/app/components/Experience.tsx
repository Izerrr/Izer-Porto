"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface TimelineItem {
  id?: number;
  title: string;
  date_range?: string;
  description?: string;
}

export default function Experience() {
  const [activeTab, setActiveTab] = useState<"experience" | "education">("experience");
  const [experienceData, setExperienceData] = useState<TimelineItem[]>([]);
  const [educationData, setEducationData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);

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

  // 2. ANIMASI SWITCH TOGGLE, SCROLL-DRIVEN TIMELINE RAIL & STAGGER REVEAL
  useEffect(() => {
    if (loading || !listRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const items = listRef.current?.querySelectorAll(".experience-item");

      if (items && items.length > 0) {
        if (prefersReduced) {
          gsap.set(items, { opacity: 1, y: 0 });
        } else {
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
        }
      } else {
        ScrollTrigger.refresh();
      }

      if (progressLineRef.current && items && items.length > 0) {
        if (prefersReduced) {
          gsap.set(progressLineRef.current, { scaleY: 1 });
        } else {
          gsap.fromTo(
            progressLineRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: listRef.current,
                start: "top 78%",
                end: "bottom 75%",
                scrub: 0.4,
              },
            },
          );
        }
      }
    }, listRef);

    return () => ctx.revert();
  }, [activeTab, loading]);

  const currentList = activeTab === "experience" ? experienceData : educationData;

  return (
    <section id="experience" className="section-container" ref={sectionRef} style={{ minHeight: "70dvh" }}>
      {/* HEADER SECTION */}
      <div className="section-header" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 className="section-title kinetic-reveal">Experience.</h2>

        {/* --- TOGGLE MENU --- */}
        <div role="tablist" aria-label="Experience Categories" className="exp-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "experience"}
            onClick={() => setActiveTab("experience")}
            className={`exp-tab-btn magnetic-target ${activeTab === "experience" ? "active" : ""}`}
          >
            Careers &amp; Ventures
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "education"}
            onClick={() => setActiveTab("education")}
            className={`exp-tab-btn magnetic-target ${activeTab === "education" ? "active" : ""}`}
          >
            Education
          </button>
        </div>
      </div>

      {/* --- TIMELINE LIST --- */}
      <div className="experience-list" ref={listRef} style={{ marginTop: "3.5rem" }}>
        {!loading && currentList.length > 0 && (
          <div className="exp-timeline-track" aria-hidden="true">
            <div ref={progressLineRef} className="exp-timeline-progress" />
          </div>
        )}

        {loading ? (
          <p className="exp-status-msg">Loading database...</p>
        ) : currentList.length > 0 ? (
          currentList.map((item, idx) => (
            <div key={item.id || idx} className="exp-row experience-item">
              <span className="exp-node" aria-hidden="true" />
              {/* SISI KIRI: Durasi & Posisi */}
              <div className="exp-left" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span className="exp-date">{item.date_range}</span>
                <h3 style={{ fontSize: "clamp(1.35rem, 3.5vw, 2.1rem)", fontWeight: "700", margin: 0, letterSpacing: "-0.5px" }}>{item.title}</h3>
              </div>

              {/* SISI KANAN: Deskripsi */}
              {item.description && (
                <div className="exp-right" style={{ fontSize: "1rem", lineHeight: "1.7" }}>
                  <p className="exp-description" style={{ margin: 0 }}>{item.description}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="exp-status-msg">Belum ada data di sub-kategori ini.</p>
        )}
      </div>
    </section>
  );
}
