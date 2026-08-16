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
  video_url: string | null;
  auto_thumbnail?: string;
}

/* Helper: Force HTTPS untuk cegah Mixed Content "Not Secure" di Instagram */
const ensureHttps = (url: string | null | undefined): string => {
  if (!url || url.trim() === "") return "";
  return url.trim().replace(/^http:\/\//i, "https://");
};

/* Helper: Check embeddable live website */
const isLiveWebsite = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === "") return false;
  const socialDomains = ["github.com", "behance.net", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com"];
  return !socialDomains.some((domain) => url.toLowerCase().includes(domain));
};

/* Component Sub-Item per Card untuk mengelola Hover State secara terisolasi */
function WorkCardItem({ item, setActiveProject }: { item: Project; setActiveProject: (p: Project) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const isDirectVideo = item.video_url && (item.video_url.endsWith(".mp4") || item.video_url.endsWith(".webm") || !item.video_url.includes("youtu"));
  const canEmbedLiveIframe = isLiveWebsite(item.project_url);

  return (
    <a
      href={item.project_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="work-link-wrapper group"
      style={{ flexShrink: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.preventDefault();
        setActiveProject(item);
      }}
    >
      <div className="glass-card elegant-work-card" style={{ position: "relative", overflow: "hidden" }}>
        {/* Direct Video Background */}
        {item.video_url && isDirectVideo ? (
          <video
            src={item.video_url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="work-video-bg"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
            }}
          >
            {/* Static Thumbnail */}
            <div
              className="work-image-bg"
              style={{
                backgroundImage: `url('${item.auto_thumbnail}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "absolute",
                inset: 0,
                zIndex: 1,
                opacity: isHovered && canEmbedLiveIframe ? 0 : 1,
                transition: "opacity 0.4s ease",
              }}
            />

            {/* ⚡ OPTIMIZATION: Iframe CUMA di-render saat kartu di-HOVER! */}
            {canEmbedLiveIframe && isHovered && (
              <iframe
                src={item.project_url}
                title={item.title}
                className="work-live-iframe"
                loading="lazy"
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
                  opacity: 1,
                  transition: "opacity 0.4s ease",
                }}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(5, 10, 20, 0.1), rgba(5, 10, 20, 0.75))",
            zIndex: 3,
          }}
        />

        {/* Card Content */}
        <div
          className="work-content"
          style={{
            zIndex: 4,
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
          }}
        >
          <span className="work-category">{item.category}</span>
          <h3 className="elegant-heading">{item.title}</h3>
        </div>
      </div>
    </a>
  );
}

export default function Works() {
  const [works, setWorks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [mounted, setMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  /* Fetch data, Auto-Upgrade HTTPS, and generate thumbnails */
  useEffect(() => {
    setMounted(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/works.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const processedData = data.map((item: Project) => {
            // Force HTTPS di semua URL bawaan DB
            const projectUrl = ensureHttps(item.project_url);
            let thumb = item.image_url ? ensureHttps(item.image_url) : null;
            let video = ensureHttps(item.video_url || null);

            // 1. YouTube video thumbnail fallback
            if (video && (video.includes("youtube.com") || video.includes("youtu.be"))) {
              const match = video.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
              if (match && match[2].length === 11) {
                thumb = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
              }
            }
            // 2. Instant website screenshot fallback
            else if (!thumb && isLiveWebsite(projectUrl)) {
              thumb = `https://image.thum.io/get/width/1024/crop/800/${projectUrl}`;
            }

            // 3. Default image fallback
            if (!thumb) {
              thumb = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
            }

            return {
              ...item,
              project_url: projectUrl,
              image_url: thumb,
              video_url: video,
              auto_thumbnail: thumb,
            };
          });

          setWorks(processedData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load API:", err);
        setLoading(false);
      });
  }, []);

  /* GSAP Horizontal Scroll Setup */
  useEffect(() => {
    if (loading || works.length === 0 || !scrollRef.current || !sectionRef.current) return;

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const scrollContainer = scrollRef.current as HTMLElement;
      const getScrollAmount = () => -(scrollContainer.scrollWidth - window.innerWidth);

      gsap.to(scrollContainer, {
        x: getScrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + (scrollContainer.scrollWidth - window.innerWidth),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => {
      clearTimeout(timer);
      mm.revert();
    };
  }, [loading, works]);

  /* Lock body scroll when modal is open */
  useEffect(() => {
    document.body.style.overflow = activeProject ? "hidden" : "";
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
    return ensureHttps(url);
  };

  return (
    <>
      <section
        id="works"
        ref={sectionRef}
        className="relative w-full min-h-screen flex flex-col justify-center overflow-hidden z-10"
        style={{
          opacity: loading ? 0.3 : 1,
          transition: "opacity 0.4s",
          paddingTop: "4vh",
          paddingBottom: "4vh",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          <div className="section-header works-header" style={{ textAlign: "center", marginBottom: 0 }}>
            <h2 className="section-title kinetic-reveal" style={{ margin: 0 }}>
              Selected Works.
            </h2>
          </div>
        </div>

        <div className="works-horizontal-scroll" ref={scrollRef} style={{ display: "flex", flexWrap: "nowrap" }}>
          {loading ? <p style={{ color: "white", padding: "5vw" }}>Loading...</p> : works.map((item) => <WorkCardItem key={item.id} item={item} setActiveProject={setActiveProject} />)}
        </div>
      </section>

      {/* Modal Overlay Portal */}
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
                <div
                  style={{
                    padding: "1.5rem 2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <h2 style={{ fontSize: "1.3rem", fontWeight: "600" }}>{activeProject.title}</h2>
                  <button
                    onClick={() => setActiveProject(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      fontSize: "1.5rem",
                      cursor: "pointer",
                      opacity: 0.5,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Media Container */}
                <div
                  style={{
                    width: "100%",
                    height: "clamp(240px, 55vh, 520px)",
                    background: "#000",
                  }}
                >
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
                      <video
                        src={activeProject.video_url}
                        controls
                        autoPlay
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    )
                  ) : isLiveWebsite(activeProject.project_url) ? (
                    <iframe
                      src={activeProject.project_url}
                      title={activeProject.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        background: "#fff",
                      }}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  ) : (
                    <img
                      src={activeProject.auto_thumbnail || activeProject.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}
                      alt={activeProject.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    padding: "1.2rem 2rem",
                    display: "flex",
                    justifyContent: "flex-end",
                    background: "rgba(0,0,0,0.3)",
                  }}
                >
                  <a
                    href={activeProject.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#fff",
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.08)",
                      padding: "0.6rem 1.5rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontWeight: "600",
                    }}
                  >
                    Buka Link Asli ↗
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
