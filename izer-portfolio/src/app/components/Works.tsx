"use client";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  id: number;
  title: string;
  category: string;
  image_url: string;
  project_url: string;
  video_url: string;
  auto_thumbnail?: string;
}

export default function Works() {
  const [works, setWorks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [mounted, setMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  /* Fetch Data and Process Thumbnails */
  useEffect(() => {
    setMounted(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/works.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const processedData = data.map((item: Project) => {
            // 💥 FIX 1: Bersihkan string kosong agar terbaca benar-benar kosong (null)
            let thumb = item.image_url && item.image_url.trim() !== "" ? item.image_url : null;
            let video = item.video_url && item.video_url.trim() !== "" ? item.video_url : null;
            let projectUrl = item.project_url && item.project_url.trim() !== "" ? item.project_url : null;

            // 1. OPSI A: Jika ada video YouTube, convert jadi thumbnail YT
            if (video && (video.includes("youtube.com") || video.includes("youtu.be"))) {
              const match = video.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
              if (match && match[2].length === 11) {
                thumb = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
              }
            }

            // 2. OPSI B: Jika gambar kosong, tapi ada link website operasional (seperti OSIS SMA ASB Solo lo)
            else if (!thumb && projectUrl && !(projectUrl.includes("github.com") || projectUrl.includes("behance.net"))) {
              // Penjinak URL: Pastikan selalu diawali https://
              let cleanUrl = projectUrl.trim();
              if (!/^https?:\/\//i.test(cleanUrl)) {
                cleanUrl = `https://${cleanUrl}`;
              }

              // 💥 FIX 2: Menggunakan Thum.io (API Screenshot instan, gratis, tanpa ribet token untuk portofolio)
              thumb = `https://image.thum.io/get/width/1024/crop/800/${cleanUrl}`;
            }

            // 3. OPSI C: Fallback terakhir jika benar-bener tidak ada link apa pun
            if (!thumb) {
              thumb = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
            }

            return { ...item, auto_thumbnail: thumb };
          });

          setWorks(processedData);
        }
        setLoading(false);
      })
      .catch((err) => console.error("Gagal load API:", err));
  }, []);

  /* Advanced GSAP Responsive Multi-Device Handling */
  useEffect(() => {
    if (loading || works.length === 0 || !scrollRef.current || !sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const scrollContainer = scrollRef.current as HTMLElement;

      gsap.to(scrollContainer, {
        x: () => -(scrollContainer.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + scrollContainer.scrollWidth,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => {
      mm.revert();
    };
  }, [loading, works]);

  /* Background Scroll Lock Configuration */
  useEffect(() => {
    if (activeProject) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeProject]);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(ytRegExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
    }
    return url;
  };

  return (
    <>
      <div ref={spacerRef} style={{ width: "100%", overflow: "hidden", position: "relative" }}>
        <section id="works" ref={sectionRef} style={{ opacity: loading ? 0.3 : 1, transition: "opacity 0.4s" }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: "2vh", paddingBottom: "0vh" }}>
            <div className="section-header works-header" style={{ textAlign: "center", marginBottom: 0 }}>
              <h2 className="section-title kinetic-reveal" style={{ margin: 0 }}>
                Selected Works.
              </h2>
            </div>
          </div>

          <div className="works-horizontal-scroll" ref={scrollRef}>
            {loading ? (
              <p style={{ color: "white", padding: "5vw" }}>Loading...</p>
            ) : (
              works.map((item) => {
                const isDirectVideo = item.video_url && (item.video_url.endsWith(".mp4") || item.video_url.endsWith(".webm") || !item.video_url.includes("youtu"));

                /* Identifikasi link website asli */
                const isLiveSite = item.project_url && !(item.project_url.includes("github.com") || item.project_url.includes("behance.net"));

                // Buat state lokal khusus untuk nge-track hover per kartu
                // Menggunakan pendekatan CSS-in-JS bawaan React agar tidak ribet bikin useState array
                return (
                  <a
                    key={item.id}
                    href={item.project_url || "#"}
                    target="_blank"
                    className="work-link-wrapper group" /* Tambah class 'group' untuk trigger hover */
                    style={{ flexShrink: 0 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveProject(item);
                    }}
                  >
                    <div className="glass-card elegant-work-card" style={{ position: "relative", overflow: "hidden" }}>
                      {/* OPSI 1: VIDEO ASLI */}
                      {item.video_url && isDirectVideo ? (
                        <video src={item.video_url} autoPlay muted loop playsInline className="work-video-bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
                      ) : (
                        /* KOTAK CONTAINER PREVIEW */
                        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
                          {/* 💥 DEFAULT: Tampilkan Gambar Statis Ringan Dahulu */}
                          <div
                            className="work-image-bg"
                            style={{
                              backgroundImage: `url('${item.auto_thumbnail}')`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              position: "absolute",
                              inset: 0,
                              zIndex: 1,
                            }}
                          />

                          {/* 💥 DIBUAT CONDITIONAL: Iframe disembunyikan di bawah CSS, tapi siap menyala */}
                          {isLiveSite && (
                            <iframe
                              src={item.project_url}
                              title={item.title}
                              className="work-live-iframe" /* Kita panggil via class CSS global untuk handle hover opacity */
                              style={{
                                width: "300%",
                                height: "300%",
                                border: "none",
                                position: "absolute",
                                inset: 0,
                                transform: "scale(0.33333)",
                                transformOrigin: "top left",
                                pointerEvents: "none",
                                zIndex: 2,
                                opacity: 0 /* Default mati/transparan */,
                                transition: "opacity 0.4s ease",
                              }}
                              sandbox="allow-scripts allow-same-origin"
                            />
                          )}
                        </div>
                      )}

                      {/* Lapisan Shading / Gradasi Gelap Global */}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5, 10, 20, 0.1), rgba(5, 10, 20, 0.75))", zIndex: 3 }} />

                      {/* TEKS DEPAN KARTU */}
                      <div className="work-content" style={{ zIndex: 4, position: "absolute", bottom: 0, left: 0, width: "100%" }}>
                        <span className="work-category">{item.category}</span>
                        <h3 className="elegant-heading">{item.title}</h3>
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Modal Overlay Portal Wrapper */}
      {mounted &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: activeProject ? "flex" : "none",
              background: "rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(20px)",
              padding: "clamp(1rem, 3vw, 2rem)",
            }}
            onClick={() => setActiveProject(null)}
          >
            {activeProject && (
              <div
                className="glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: "1000px",
                  borderRadius: "20px",
                  background: "rgba(10, 10, 10, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                  color: "#fff",
                  boxShadow: "0 30px 60px -12px rgba(0,0,0,0.8)",
                  margin: "auto",
                }}
              >
                <div style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: "600" }}>{activeProject.title}</h2>
                  <button onClick={() => setActiveProject(null)} style={{ background: "none", border: "none", color: "inherit", fontSize: "1.5rem", cursor: "pointer", opacity: 0.5 }}>
                    ✕
                  </button>
                </div>

                {/* Responsive Height Engine for Media Frame */}
                <div style={{ width: "100%", height: "clamp(240px, 55vh, 520px)", background: "#000" }}>
                  {activeProject.video_url ? (
                    activeProject.video_url.includes("youtube.com") || activeProject.video_url.includes("youtu.be") ? (
                      <iframe
                        src={getEmbedUrl(activeProject.video_url)}
                        title={activeProject.title}
                        style={{ width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={activeProject.video_url} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    )
                  ) : activeProject.project_url && !(activeProject.project_url.includes("github.com") || activeProject.project_url.includes("behance.net")) ? (
                    <iframe src={activeProject.project_url} title={activeProject.title} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} sandbox="allow-scripts allow-same-origin allow-popups" />
                  ) : (
                    <img src={activeProject.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} alt={activeProject.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  )}
                </div>

                <div style={{ padding: "1.2rem 2rem", display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.3)" }}>
                  <a
                    href={activeProject.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#fff", textDecoration: "none", background: "rgba(255,255,255,0.08)", padding: "0.6rem 1.5rem", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.1)", fontWeight: "600" }}
                  >
                    Buka Situs Asli ↗
                  </a>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
