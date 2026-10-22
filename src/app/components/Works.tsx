"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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

/* Helper: Force HTTPS untuk cegah Mixed Content */
const ensureHttps = (url: string | null | undefined): string => {
  if (!url || url.trim() === "") return "";
  return url.trim().replace(/^http:\/\//i, "https://");
};

/* Helper: Check embeddable live website */
const isLiveWebsite = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === "") return false;
  const socialDomains = ["github.com", "behance.net", "instagram.com", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "youtube.com", "youtu.be"];
  return !socialDomains.some((domain) => url.toLowerCase().includes(domain));
};

/* Helper: Check direct video file */
const isDirectVideoFile = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === "") return false;
  return /\.(mp4|webm|ogg|mov)($|\?)/i.test(url.trim());
};

/* Component Sub-Item per Card dengan Smart Intent Hover & Memory Cleanup */
function WorkCardItem({ item, onSelect }: { item: Project; onSelect: (p: Project) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showLiveIframe, setShowLiveIframe] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isDirectVideo = isDirectVideoFile(item.video_url);
  const canEmbedLiveIframe = isLiveWebsite(item.project_url);
  const displayCategory = item.category && item.category.toLowerCase() !== "works" ? item.category : "Featured Project";

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (canEmbedLiveIframe && typeof window !== "undefined" && window.innerWidth > 768) {
      hoverTimerRef.current = setTimeout(() => {
        setShowLiveIframe(true);
      }, 420);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (iframeRef.current) {
      try {
        iframeRef.current.src = "about:blank";
      } catch {
        // Ignore cross-origin frame reset errors
      }
    }
    setShowLiveIframe(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <a
      href={item.project_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="work-link-wrapper"
      style={{ flexShrink: 0 }}
      draggable={false}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        e.preventDefault();
        onSelect(item);
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
            {/* Static WebP Cover Thumbnail */}
            <div
              className="work-image-bg"
              style={{
                backgroundImage: `url('${item.auto_thumbnail}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "absolute",
                inset: 0,
                zIndex: 1,
                opacity: showLiveIframe && canEmbedLiveIframe ? 0 : 1,
                transition: "opacity 0.4s ease",
              }}
            />

            {/* Smart Debounced Live Iframe (Only mounts on intentional hover > 420ms & cleans up on leave) */}
            {canEmbedLiveIframe && showLiveIframe && (
              <iframe
                ref={iframeRef}
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
                sandbox="allow-scripts allow-forms allow-popups"
              />
            )}
          </div>
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(5, 10, 20, 0.15), rgba(5, 10, 20, 0.82))",
            zIndex: 3,
          }}
        />

        {/* Preview Badge Cue */}
        <div className={`work-preview-badge ${isHovered ? "visible" : ""}`}>
          <span>Preview ↗</span>
        </div>

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
          <span className="work-category">{displayCategory}</span>
          <h3 className="elegant-heading">{item.title}</h3>
        </div>
      </div>
    </a>
  );
}

export default function Works() {
  const [works, setWorks] = useState<Project[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [modalViewMode, setModalViewMode] = useState<"live" | "snapshot">("live");

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const dragState = useRef({
    isDown: false,
    startX: 0,
    lastX: 0,
    movedDistance: 0,
  });
  const touchState = useRef({
    startX: 0,
    startY: 0,
    moved: false,
  });

  /* 1. Fetch data, Auto-Upgrade HTTPS, and route un-cached website covers to Local WebP Optimizer */
  useEffect(() => {
    setMounted(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/works.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const processedData = data.map((item: Project) => {
            const projectUrl = ensureHttps(item.project_url);
            let thumb = item.image_url ? ensureHttps(item.image_url) : null;
            const video = ensureHttps(item.video_url || null);

            // Normalize category if legacy "works" value exists
            let cleanCategory = item.category ? item.category.trim() : "Web Development";
            if (!cleanCategory || cleanCategory.toLowerCase() === "works") {
              if (item.title.toLowerCase().startsWith("video") || projectUrl.includes("/reel/")) {
                cleanCategory = "Video Production";
              } else if (projectUrl.includes("instagram.com")) {
                cleanCategory = "Creative & Branding";
              } else {
                cleanCategory = "Web Development";
              }
            }

            // Upgrade legacy external thum.io URLs to local cached WebP cover endpoint
            if (thumb && thumb.includes("image.thum.io")) {
              thumb = `/api/capture-cover?url=${encodeURIComponent(projectUrl || thumb)}`;
            }

            // 1. YouTube video thumbnail fallback
            if (video && (video.includes("youtube.com") || video.includes("youtu.be"))) {
              const match = video.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
              if (match && match[2].length === 11) {
                thumb = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
              }
            }
            // 2. Instant cached WebP website screenshot fallback
            else if (!thumb && isLiveWebsite(projectUrl)) {
              thumb = `/api/capture-cover?url=${encodeURIComponent(projectUrl)}`;
            }

            // 3. Default local image fallback
            if (!thumb) {
              thumb = "/Resources/thumbnail-sharing.png";
            }

            return {
              ...item,
              category: cleanCategory,
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

  /* Extract Dynamic Categories from Backend Data */
  const categories = useMemo(() => {
    const unique = Array.from(new Set(works.map((w) => w.category).filter(Boolean)));
    return ["All", ...unique];
  }, [works]);

  const filteredWorks = useMemo(() => {
    if (selectedCategory === "All") return works;
    return works.filter((w) => w.category === selectedCategory);
  }, [works, selectedCategory]);

  const currentModalIndex = useMemo(() => {
    if (!activeProject) return -1;
    return filteredWorks.findIndex((w) => w.id === activeProject.id);
  }, [activeProject, filteredWorks]);

  const handlePrevProject = useCallback(() => {
    if (filteredWorks.length === 0) return;
    const prevIdx = currentModalIndex > 0 ? currentModalIndex - 1 : filteredWorks.length - 1;
    setActiveProject(filteredWorks[prevIdx]);
  }, [currentModalIndex, filteredWorks]);

  const handleNextProject = useCallback(() => {
    if (filteredWorks.length === 0) return;
    const nextIdx = currentModalIndex < filteredWorks.length - 1 ? currentModalIndex + 1 : 0;
    setActiveProject(filteredWorks[nextIdx]);
  }, [currentModalIndex, filteredWorks]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    setMobileActiveIndex(0);
  };

  /* Track mobile horizontal scroll counter */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const cardWidth = card.offsetWidth + 16;
      const index = Math.round(el.scrollLeft / cardWidth);
      setMobileActiveIndex(Math.min(Math.max(0, index), filteredWorks.length - 1));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [filteredWorks.length]);

  /* 2. GSAP Horizontal Scroll Setup */
  useEffect(() => {
    if (loading || filteredWorks.length === 0 || !scrollRef.current || !sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const scrollContainer = scrollRef.current as HTMLElement;
      gsap.set(scrollContainer, { x: 0 });

      const getScrollAmount = () => {
        const diff = scrollContainer.scrollWidth - window.innerWidth;
        return diff > 0 ? -diff : 0;
      };

      const getScrollDistance = () => {
        const diff = scrollContainer.scrollWidth - window.innerWidth;
        return diff > 0 ? diff : 300;
      };

      gsap.to(scrollContainer, {
        x: getScrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + getScrollDistance(),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(timer);
      mm.revert();
    };
  }, [loading, filteredWorks]);

  /* 3. Desktop Mouse Grab-to-Scroll Handler */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth <= 768 || e.button !== 0) return;
    dragState.current.isDown = true;
    dragState.current.startX = e.clientX;
    dragState.current.lastX = e.clientX;
    dragState.current.movedDistance = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDown || window.innerWidth <= 768) return;
    const deltaX = dragState.current.lastX - e.clientX;
    dragState.current.lastX = e.clientX;
    dragState.current.movedDistance += Math.abs(deltaX);

    if (dragState.current.movedDistance > 6) {
      if (!isDragging) setIsDragging(true);
      window.scrollBy({ top: deltaX * 1.4, behavior: "instant" as ScrollBehavior });
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!dragState.current.isDown) return;
    dragState.current.isDown = false;
    setTimeout(() => {
      setIsDragging(false);
      dragState.current.movedDistance = 0;
    }, 80);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.moved = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const deltaX = Math.abs(e.touches[0].clientX - touchState.current.startX);
      const deltaY = Math.abs(e.touches[0].clientY - touchState.current.startY);
      if (deltaX > 8 || deltaY > 8) {
        touchState.current.moved = true;
      }
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      touchState.current.moved = false;
    }, 120);
  };

  const handleCardSelect = (project: Project) => {
    if (dragState.current.movedDistance > 6 || touchState.current.moved) return;
    setModalViewMode("live");
    setActiveProject(project);
  };

  const closeModal = useCallback(() => {
    if (modalIframeRef.current) {
      try {
        modalIframeRef.current.src = "about:blank";
      } catch {
        // Ignore
      }
    }
    setActiveProject(null);
  }, []);

  /* 4. Lock body scroll & Keyboard handler when modal is open */
  useEffect(() => {
    document.body.style.overflow = activeProject ? "hidden" : "";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeProject) return;
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowLeft") {
        handlePrevProject();
      } else if (e.key === "ArrowRight") {
        handleNextProject();
      }
    };

    if (activeProject) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProject, closeModal, handlePrevProject, handleNextProject]);

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
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            padding: "0 1.5rem",
          }}
        >
          <div className="section-header works-header" style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h2 className="section-title kinetic-reveal" style={{ margin: 0 }}>
              Selected Works.
            </h2>
          </div>

          {/* Dynamic Category Filter Tabs */}
          {categories.length > 1 && (
            <div className="works-filter-tabs">
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => handleCategorySelect(cat)} className={`works-filter-btn magnetic-target ${selectedCategory === cat ? "active" : ""}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`works-horizontal-scroll ${isDragging ? "dragging" : ""}`}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ display: "flex", flexWrap: "nowrap" }}
        >
          {loading ? <p style={{ color: "var(--text-dim)", padding: "5vw" }}>Loading works...</p> : filteredWorks.map((item) => <WorkCardItem key={item.id} item={item} onSelect={handleCardSelect} />)}
        </div>

        {/* Mobile Swipe Counter */}
        {!loading && filteredWorks.length > 1 && (
          <div className="works-mobile-counter">
            <span style={{ fontWeight: "700" }}>{String(mobileActiveIndex + 1).padStart(2, "0")}</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span style={{ opacity: 0.5 }}>{String(filteredWorks.length).padStart(2, "0")}</span>
          </div>
        )}
      </section>

      {/* Modal Overlay Portal */}
      {mounted &&
        createPortal(
          <div
            className={`works-modal-backdrop ${activeProject ? "open" : ""}`}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              pointerEvents: activeProject ? "auto" : "none",
              opacity: activeProject ? 1 : 0,
              transition: "opacity 0.3s ease",
              display: "flex",
              background: "rgba(0, 0, 0, 0.88)",
              backdropFilter: "blur(20px)",
              padding: "clamp(1rem, 3vw, 2rem)",
            }}
            onClick={closeModal}
          >
            {activeProject && (
              <div
                className="glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: "1000px",
                  borderRadius: "20px",
                  background: "rgba(10, 10, 10, 0.88)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  overflow: "hidden",
                  color: "#fff",
                  boxShadow: "0 30px 60px -12px rgba(0,0,0,0.8)",
                  margin: "auto",
                }}
              >
                <div
                  style={{
                    padding: "1.25rem 2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, display: "block", marginBottom: "0.2rem" }}>{activeProject.category}</span>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>{activeProject.title}</h2>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {/* View mode toggle for live websites */}
                    {(isLiveWebsite(activeProject.project_url) || (activeProject.project_url && activeProject.project_url.includes("/embed"))) && (
                      <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.08)", borderRadius: "8px", padding: "2px" }}>
                        <button
                          type="button"
                          onClick={() => setModalViewMode("live")}
                          style={{
                            background: modalViewMode === "live" ? "rgba(56, 189, 248, 0.25)" : "transparent",
                            color: modalViewMode === "live" ? "#38bdf8" : "var(--text-dim)",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          🌐 Live
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalViewMode("snapshot")}
                          style={{
                            background: modalViewMode === "snapshot" ? "rgba(56, 189, 248, 0.25)" : "transparent",
                            color: modalViewMode === "snapshot" ? "#38bdf8" : "var(--text-dim)",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          📸 Snapshot
                        </button>
                      </div>
                    )}

                    {filteredWorks.length > 1 && (
                      <>
                        <button type="button" onClick={handlePrevProject} aria-label="Previous project" className="modal-nav-btn" title="Previous (←)">
                          ←
                        </button>
                        <span style={{ fontSize: "0.75rem", opacity: 0.55, minWidth: "38px", textAlign: "center" }}>
                          {currentModalIndex + 1} / {filteredWorks.length}
                        </span>
                        <button type="button" onClick={handleNextProject} aria-label="Next project" className="modal-nav-btn" title="Next (→)">
                          →
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={closeModal}
                      aria-label="Close preview modal"
                      className="modal-nav-btn"
                      style={{ marginLeft: "0.25rem" }}
                    >
                      ✕
                    </button>
                  </div>
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
                        key={activeProject.id}
                        ref={modalIframeRef}
                        src={getEmbedUrl(activeProject.video_url)}
                        title={activeProject.title}
                        style={{ width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        key={activeProject.id}
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
                  ) : (isLiveWebsite(activeProject.project_url) || (activeProject.project_url && activeProject.project_url.includes("/embed"))) && modalViewMode === "live" ? (
                    <iframe
                      key={activeProject.id}
                      ref={modalIframeRef}
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
                      key={activeProject.id}
                      src={activeProject.auto_thumbnail || activeProject.image_url || "/Resources/thumbnail-sharing.png"}
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(0,0,0,0.4)",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", opacity: 0.45 }}>Press ← → to navigate, ESC to close</span>
                  <a
                    href={activeProject.project_url ? activeProject.project_url.replace(/\/embed\/?$/, "/") : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#fff",
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.1)",
                      padding: "0.6rem 1.5rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      border: "1px solid rgba(255,255,255,0.15)",
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
