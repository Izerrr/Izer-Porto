"use client";
import { useEffect, useState } from "react";

interface ExpItem {
  id: number;
  title: string;
  date_range: string;
  description: string;
}

export default function Experience() {
  const [experiences, setExperiences] = useState<ExpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Pastiin URL-nya bener: http://localhost/izer-api/experience.php
    fetch("http://localhost/izer-api/experience.php")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal akses API");
        return res.json();
      })
      .then((data) => {
        setExperiences(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal ambil data experience:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <section id="experience" className="section-container scroll-reveal">
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">Experience.</h2>
      </div>
      <div className="experience-list">
        {loading ? (
          <p style={{ color: "var(--text-dim)", textAlign: "center" }}>Loading experiences...</p>
        ) : error ? (
          <p style={{ color: "red", textAlign: "center" }}>Gagal memuat data. Cek XAMPP lo, Zi!</p>
        ) : (
          experiences.map((exp) => (
            <div key={exp.id} className="exp-row">
              <div className="exp-left">
                <span className="exp-date">{exp.date_range}</span>
                <h3 className="elegant-heading">{exp.title}</h3>
              </div>
              <div className="exp-right">
                <p>{exp.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
