"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface CapabilityItem {
  id?: number;
  title: string;
  description: string;
}

interface TechIconItem {
  id?: number;
  title?: string;
  image_url: string;
}

export default function Skills() {
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [techIcons, setTechIcons] = useState<TechIconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCapabilities = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=skills`)
      .then((res) => res.json())
      .then((data) => {
        setCapabilities(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Gagal ambil capabilities:", err));

    const fetchIcons = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=tech_icons`)
      .then((res) => res.json())
      .then((data) => {
        setTechIcons(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Gagal ambil tech icons:", err));

    Promise.all([fetchCapabilities, fetchIcons]).then(() => {
      setLoading(false);
      setTimeout(() => ScrollTrigger.refresh(), 400);
    });
  }, []);

  useEffect(() => {
    if (loading || capabilities.length === 0 || !gridRef.current) return;

    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll(".skill-box");
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 24 },
          {
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 85%",
            },
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power2.out",
          },
        );
      }
    }, gridRef);

    return () => ctx.revert();
  }, [loading, capabilities]);

  return (
    <section id="skills" className="section-container">
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">Capabilities.</h2>
      </div>

      {/* --- BOX CAPABILITIES TEXT --- */}
      <div className="skills-grid" ref={gridRef}>
        {loading ? (
          <p style={{ opacity: 0.5, gridColumn: "1/-1", textAlign: "center", padding: "2rem 0" }}>Loading capabilities...</p>
        ) : capabilities.length > 0 ? (
          capabilities.map((s, i) => (
            <div key={s.id || i} className="glass-card skill-box">
              <span className="skill-number">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))
        ) : (
          <p style={{ opacity: 0.5, gridColumn: "1/-1", textAlign: "center" }}>Belum ada data skill di gudang.</p>
        )}
      </div>

      {/* --- TOOLS & TECH DYNAMIC MARQUEE WRAPPER --- */}
      <div className="skills-icons-wrapper glass-card">
        <p className="icons-title">Tools & Technologies</p>

        {loading ? (
          <p style={{ opacity: 0.4, fontSize: "0.8rem", textAlign: "center" }}>Loading assets...</p>
        ) : techIcons.length > 0 ? (
          <div className="marquee-track">
            <div className="animate-marquee">
              {[...techIcons, ...techIcons, ...techIcons, ...techIcons].map((icon, idx) => (
                <div key={`${icon.id || idx}-${idx}`} className="tech-icon-wrapper">
                  <img
                    src={icon.image_url}
                    alt={icon.title || "Tech Icon"}
                    className="tech-icon"
                    loading="lazy"
                    decoding="async"
                  />
                  {icon.title && <span className="tech-tooltip">{icon.title}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ opacity: 0.4, fontSize: "0.8rem", textAlign: "center" }}>Belum ada icon di gudang admin.</p>
        )}
      </div>
    </section>
  );
}
