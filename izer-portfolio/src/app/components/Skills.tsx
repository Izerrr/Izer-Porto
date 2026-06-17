"use client";
import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Skills() {
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [techIcons, setTechIcons] = useState<any[]>([]); // State baru untuk list icon logo
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Data Capabilities Text
    const fetchCapabilities = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=skills`)
      .then((res) => res.json())
      .then((data) => {
        setCapabilities(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Gagal ambil capabilities:", err));

    // 2. Fetch Data Tech Icons Logo
    const fetchIcons = fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=tech_icons`)
      .then((res) => res.json())
      .then((data) => {
        setTechIcons(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Gagal ambil tech icons:", err));

    // Eksekusi berbarengan, setelah selesai semua baru loading di-turn off & refresh GSAP
    Promise.all([fetchCapabilities, fetchIcons]).then(() => {
      setLoading(false);
      setTimeout(() => ScrollTrigger.refresh(), 500);
    });
  }, []);

  return (
    <section id="skills" className="section-container scroll-reveal">
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">Capabilities.</h2>
      </div>

      {/* --- BOX CAPABILITIES TEXT --- */}
      <div className="skills-grid">
        {loading ? (
          <p style={{ opacity: 0.5, gridColumn: "1/-1", textAlign: "center" }}>Loading capabilities...</p>
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

      {/* --- TOOLS & TECH DYNAMIC WRAPPER --- */}
      <div className="skills-icons-wrapper glass-card">
        <p className="icons-title">Tools & Technologies</p>
        <div className="icons-flex">
          {loading ? (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>Loading assets...</p>
          ) : techIcons.length > 0 ? (
            techIcons.map((icon, idx) => <img key={icon.id || idx} src={icon.image_url} alt={icon.title || "Tech Icon"} className="tech-icon" />)
          ) : (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>Belum ada icon di gudang admin.</p>
          )}
        </div>
      </div>
    </section>
  );
}
