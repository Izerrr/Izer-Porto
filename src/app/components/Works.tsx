"use client";
import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sound } from "../utils/sound";
import { copyToClipboard, showHudToast } from "../utils/clipboard";
import { extractDomainHost, resolveWorkDemoVideo } from "../data/works-demos";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  id: number;
  title: string;
  category: string;
  image_url: string;
  project_url: string;
  video_url: string | null;
  description?: string;
  auto_thumbnail?: string;
  tags?: string[];
}

type ModalViewMode = "demo" | "live" | "snapshot";

/* Helper: Force HTTPS untuk cegah Mixed Content */
const ensureHttps = (url: string | null | undefined): string => {
  if (!url || url.trim() === "") return "";
  return url.trim().replace(/^http:\/\//i, "https://");
};

/* Helper: Check embeddable live website */
const isLiveWebsite = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === "") return false;
  const socialDomains = [
    "github.com",
    "behance.net",
    "instagram.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "youtube.com",
    "youtu.be",
  ];
  return !socialDomains.some((domain) => url.toLowerCase().includes(domain));
};

/* Helper: Check YouTube link */
const isYouTubeUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
};

/* Helper: Extract or Infer Tech Stack tags */
export const getProjectTechTags = (item: Project): string[] => {
  const tags: string[] = [];
  const text = `${item.title} ${item.category} ${item.project_url} ${item.description || ""}`.toLowerCase();

  if (text.includes("next") || text.includes("react")) tags.push("Next.js / React");
  if (text.includes("type") || text.includes("ts")) tags.push("TypeScript");
  if (text.includes("php") || text.includes("laravel")) tags.push("PHP Native");
  if (text.includes("gsap") || text.includes("scrolltrigger") || text.includes("motion")) tags.push("GSAP");
  if (text.includes("video") || text.includes("premiere") || text.includes("after effects") || text.includes("reel")) {
    tags.push("Video Editing");
  }
  if (text.includes("design") || text.includes("figma") || text.includes("brand") || text.includes("ui/ux")) {
    tags.push("UI/UX Design");
  }
  if (text.includes("web") || text.includes("app")) tags.push("Web Architecture");

  if (tags.length === 0) {
    tags.push(item.category || "Creative Tech");
  }
  return Array.from(new Set(tags)).slice(0, 4);
};

/* Card Sub-Item: 0 KB video at rest, lazy hover-intent video showcase, Ken Burns fallback */
function WorkCardItem({ item, onSelect }: { item: Project; onSelect: (p: Project) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const demoVideoSrc = useMemo(
    () => resolveWorkDemoVideo(item.project_url, item.video_url),
    [item.project_url, item.video_url],
  );
  const displayCategory =
    item.category && item.category.toLowerCase() !== "works" ? item.category : "Featured Project";

  const activateHover = () => {
    setIsHovered(true);
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !demoVideoSrc) return;

    if (window.innerWidth > 768) {
      hoverTimerRef.current = setTimeout(() => {
        setVideoMounted(true);
        if (videoRef.current) {
          void videoRef.current.play().catch(() => {});
        }
      }, 150);
    }
  };

  const deactivateHover = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  useEffect(() => {
    if (videoMounted && isHovered && videoRef.current) {
      void videoRef.current.play().catch(() => {});
    }
  }, [videoMounted, isHovered]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const showKenBurns = isHovered && !demoVideoSrc;

  return (
    <a
      href={item.project_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="work-link-wrapper"
      style={{ flexShrink: 0 }}
      draggable={false}
      onMouseEnter={activateHover}
      onMouseLeave={deactivateHover}
      onFocus={() => setIsHovered(true)}
      onBlur={deactivateHover}
      onClick={(e) => {
        e.preventDefault();
        onSelect(item);
      }}
    >
      <div className="glass-card elegant-work-card" style={{ position: "relative", overflow: "hidden" }}>
        {/* Static WebP Cover Poster (Always rendered immediately at 0 video bandwidth) */}
        <div
          className={`work-image-bg ${showKenBurns ? "ken-burns-active" : ""}`}
          style={{
            backgroundImage: `url('${item.auto_thumbnail}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "absolute",
            inset: 0,
            zIndex: 0,
          }}
        />

        {/* Lazy Hover-Activated Showcase Video (Mounts strictly on hover intent, preloads nothing at rest) */}
        {demoVideoSrc && videoMounted && (
          <video
            ref={videoRef}
            width={1280}
            height={800}
            muted
            loop
            playsInline
            preload="none"
            poster={item.auto_thumbnail}
            aria-hidden="true"
            onCanPlay={() => {
              setVideoReady(true);
              if (isHovered && videoRef.current) {
                void videoRef.current.play().catch(() => {});
              }
            }}
            className="work-video-bg"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              opacity: isHovered && videoReady ? 1 : 0,
              transition: "opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
              pointerEvents: "none",
            }}
          >
            <source src={demoVideoSrc} />
          </video>
        )}

        {/* Midnight Vignette Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(5, 10, 20, 0.14), rgba(5, 10, 20, 0.84))",
            zIndex: 3,
            pointerEvents: "none",
          }}
        />

        {/* Preview Badge Cue */}
        <div className={`work-preview-badge ${isHovered ? "visible" : ""}`}>
          {demoVideoSrc ? (
            <>
              <span className="work-preview-dot" aria-hidden="true" />
              <span>Demo Preview</span>
            </>
          ) : (
            <span>Preview ↗</span>
          )}
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
  const [mediaLoading, setMediaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [modalViewMode, setModalViewMode] = useState<ModalViewMode>("snapshot");
  const [embedStatusMap, setEmbedStatusMap] = useState<Record<string, boolean>>({});
  const [copiedProjectLink, setCopiedProjectLink] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const modalCloseBtnRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

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
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/works.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const processedData = data.map((item: Project) => {
            const projectUrl = ensureHttps(item.project_url);
            let thumb = item.image_url ? ensureHttps(item.image_url) : null;
            const video = ensureHttps(item.video_url || null);

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

            if (thumb && thumb.includes("image.thum.io")) {
              thumb = `/api/capture-cover?url=${encodeURIComponent(projectUrl || thumb)}`;
            }

            if (video && isYouTubeUrl(video)) {
              const match = video.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
              if (match && match[2].length === 11) {
                thumb = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
              }
            } else if (!thumb && isLiveWebsite(projectUrl)) {
              thumb = `/api/capture-cover?url=${encodeURIComponent(projectUrl)}`;
            }

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
        console.warn("Failed to load API:", err);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(works.map((w) => w.category).filter(Boolean)));
    return ["All", ...unique];
  }, [works]);

  const filteredWorks = useMemo(() => {
    return works.filter((w) => selectedCategory === "All" || w.category === selectedCategory);
  }, [works, selectedCategory]);

  const currentModalIndex = useMemo(() => {
    if (!activeProject) return -1;
    return filteredWorks.findIndex((w) => w.id === activeProject.id);
  }, [activeProject, filteredWorks]);

  /* Resolve initial modal view mode safely & probe X-Frame-Options/CSP when needed */
  const resolveAndSetModalProject = useCallback(
    async (project: Project) => {
      setCopiedProjectLink(false);
      setMediaLoading(true);
      setActiveProject(project);

      const demoVideo = resolveWorkDemoVideo(project.project_url, project.video_url);
      const hasYt = isYouTubeUrl(project.video_url);

      if (demoVideo || hasYt) {
        setModalViewMode("demo");
        return;
      }

      if (project.project_url?.includes("/embed")) {
        setModalViewMode("live");
        return;
      }

      if (isLiveWebsite(project.project_url)) {
        const targetUrl = project.project_url;
        if (targetUrl in embedStatusMap) {
          setModalViewMode(embedStatusMap[targetUrl] ? "live" : "snapshot");
          return;
        }

        // Hold on snapshot immediately so a blocked site never flashes a broken frame while probing
        setModalViewMode("snapshot");
        try {
          const res = await fetch(`/api/probe-embed?url=${encodeURIComponent(targetUrl)}`);
          if (res.ok) {
            const json = (await res.json()) as { iframe_allowed?: boolean };
            const allowed = Boolean(json.iframe_allowed);
            setEmbedStatusMap((prev) => ({ ...prev, [targetUrl]: allowed }));
            if (allowed) {
              setActiveProject((current) => {
                if (current && current.id === project.id) {
                  setMediaLoading(true);
                  setModalViewMode("live");
                }
                return current;
              });
            }
          } else {
            setEmbedStatusMap((prev) => ({ ...prev, [targetUrl]: false }));
          }
        } catch {
          setEmbedStatusMap((prev) => ({ ...prev, [targetUrl]: false }));
        }
        return;
      }

      setModalViewMode("snapshot");
    },
    [embedStatusMap],
  );

  const handlePrevProject = useCallback(() => {
    if (filteredWorks.length === 0) return;
    const prevIdx = currentModalIndex > 0 ? currentModalIndex - 1 : filteredWorks.length - 1;
    void resolveAndSetModalProject(filteredWorks[prevIdx]);
  }, [currentModalIndex, filteredWorks, resolveAndSetModalProject]);

  const handleNextProject = useCallback(() => {
    if (filteredWorks.length === 0) return;
    const nextIdx = currentModalIndex < filteredWorks.length - 1 ? currentModalIndex + 1 : 0;
    void resolveAndSetModalProject(filteredWorks[nextIdx]);
  }, [currentModalIndex, filteredWorks, resolveAndSetModalProject]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = "scaleX(0)";
    }
    setMobileActiveIndex(0);
  };

  /* Sync physical sliding pill geometry inside iOS Segmented Control */
  useLayoutEffect(() => {
    const container = tablistRef.current;
    const activeBtn = tabRefs.current[selectedCategory];
    if (!container || !activeBtn) return;

    const updatePill = () => {
      container.style.setProperty("--pill-left", `${activeBtn.offsetLeft}px`);
      container.style.setProperty("--pill-width", `${activeBtn.offsetWidth}px`);
      container.style.setProperty("--pill-height", `${activeBtn.offsetHeight}px`);
      container.style.setProperty("--pill-top", `${activeBtn.offsetTop}px`);
      container.dataset.pillReady = "true";
    };

    updatePill();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updatePill);
    ro.observe(container);
    ro.observe(activeBtn);
    return () => ro.disconnect();
  }, [selectedCategory, categories]);

  /* Scrollability affordance fallback + mobile scroll counter */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const cardWidth = card.offsetWidth + 16;
      const index = Math.round(el.scrollLeft / cardWidth);
      setMobileActiveIndex(Math.min(Math.max(0, index), filteredWorks.length - 1));

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (progressFillRef.current && maxScroll > 0 && window.innerWidth <= 768) {
        progressFillRef.current.style.transform = `scaleX(${Math.min(1, el.scrollLeft / maxScroll)})`;
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    let io: IntersectionObserver | null = null;
    if (
      typeof CSS !== "undefined" &&
      !CSS.supports("animation-timeline", "scroll()") &&
      el.firstElementChild &&
      el.lastElementChild
    ) {
      const first = el.firstElementChild;
      const last = el.lastElementChild;
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === first) {
              el.classList.toggle("more-start", entry.intersectionRatio < 1);
            }
            if (entry.target === last) {
              el.classList.toggle("more-end", entry.intersectionRatio < 1);
            }
          }
        },
        { root: el, threshold: 1, rootMargin: "1px" },
      );
      io.observe(first);
      io.observe(last);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      io?.disconnect();
    };
  }, [filteredWorks.length]);

  /* 2. GSAP Horizontal Scroll Setup (Desktop) with live hairline progress update */
  useEffect(() => {
    if (loading || filteredWorks.length === 0 || !scrollRef.current || !sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const scrollContainer = scrollRef.current as HTMLElement;
      gsap.set(scrollContainer, { x: 0 });
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = "scaleX(0)";
      }

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
          onUpdate: (self) => {
            if (progressFillRef.current) {
              progressFillRef.current.style.transform = `scaleX(${self.progress})`;
            }
          },
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
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    sound.playModalOpen();
    void resolveAndSetModalProject(project);
  };

  const closeModal = useCallback(() => {
    sound.playModalClose();
    if (modalIframeRef.current) {
      try {
        modalIframeRef.current.src = "about:blank";
      } catch {
        // Ignore cross-origin cleanup error
      }
    }
    setCopiedProjectLink(false);
    setActiveProject(null);
    requestAnimationFrame(() => {
      lastTriggerRef.current?.focus();
    });
  }, []);

  /* 4. Lock body scroll, manage focus & Keyboard handler when modal is open */
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

    let focusRaf: number | null = null;
    if (activeProject) {
      window.addEventListener("keydown", handleKeyDown);
      focusRaf = requestAnimationFrame(() => {
        modalCloseBtnRef.current?.focus();
      });
    }

    return () => {
      if (focusRaf !== null) cancelAnimationFrame(focusRaf);
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

  const activeDemoVideo = activeProject
    ? resolveWorkDemoVideo(activeProject.project_url, activeProject.video_url)
    : null;
  const activeIsYouTube = activeProject ? isYouTubeUrl(activeProject.video_url) : false;
  const activeCanEmbed = activeProject
    ? isLiveWebsite(activeProject.project_url) || Boolean(activeProject.project_url?.includes("/embed"))
    : false;
  const activeEmbedExplicitlyAllowed = activeProject
    ? activeProject.project_url.includes("/embed") || embedStatusMap[activeProject.project_url] === true
    : false;
  const activeEmbedBlocked = activeProject
    ? !activeProject.project_url.includes("/embed") && embedStatusMap[activeProject.project_url] === false
    : false;
  const activeTags = activeProject ? getProjectTechTags(activeProject) : [];
  const activeDomain = activeProject ? extractDomainHost(activeProject.project_url) : "";

  const handleCopyProjectLink = async () => {
    if (!activeProject?.project_url) return;
    sound.playAction();
    const cleanUrl = activeProject.project_url.replace(/\/embed\/?$/, "/");
    const ok = await copyToClipboard(cleanUrl);
    if (ok) {
      setCopiedProjectLink(true);
      showHudToast({
        title: "Project Link Copied",
        subtitle: activeDomain || cleanUrl,
      });
      setTimeout(() => setCopiedProjectLink(false), 2200);
    }
  };

  return (
    <>
      <section
        id="works"
        ref={sectionRef}
        style={{
          opacity: loading ? 0.3 : 1,
          transition: "opacity 0.4s",
          paddingTop: "4dvh",
          paddingBottom: "4dvh",
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

          {/* iOS-Style Segmented Control with physical sliding pill */}
          {categories.length > 1 && (
            <div ref={tablistRef} className="ios-segmented-control" role="tablist" aria-label="Project categories">
              <div className="ios-segmented-pill" aria-hidden="true" />
              {categories.map((cat) => {
                const count = cat === "All" ? works.length : works.filter((w) => w.category === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    ref={(el) => {
                      tabRefs.current[cat] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      sound.playAction();
                      handleCategorySelect(cat);
                    }}
                    className={`ios-segment-btn magnetic-target ${isActive ? "active" : ""}`}
                  >
                    <span className="ios-segment-label">{cat}</span>
                    <span className="ios-segment-count">{count}</span>
                  </button>
                );
              })}
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
          {filteredWorks.map((p) => (
            <WorkCardItem key={p.id} item={p} onSelect={handleCardSelect} />
          ))}
        </div>

        {/* Minimal Horizontal Scroll Affordance Rail + Mobile Counter */}
        {!loading && filteredWorks.length > 1 && (
          <div className="works-scroll-affordance" aria-hidden="true">
            <div className="works-scroll-track">
              <div ref={progressFillRef} className="works-scroll-fill" />
            </div>
            <div className="works-mobile-counter">
              {String(mobileActiveIndex + 1).padStart(2, "0")}{" "}
              <span className="works-counter-dim">/ {String(filteredWorks.length).padStart(2, "0")}</span>
            </div>
          </div>
        )}
      </section>

      {/* --- QUICKLOOK PROJECT PREVIEW MODAL --- */}
      {isClient &&
        createPortal(
          <div
            className={`works-modal-backdrop ${activeProject ? "open" : ""}`}
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={activeProject ? "works-modal-title" : undefined}
          >
            {activeProject && (
              <div className="works-modal-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Mobile drag handle */}
                <div className="works-modal-drag-indicator" aria-hidden="true" />

                {/* Header */}
                <div className="works-modal-header">
                  <div>
                    <span className="works-modal-category">{activeProject.category}</span>
                    <h2 id="works-modal-title" className="works-modal-title">
                      {activeProject.title}
                    </h2>
                  </div>

                  <div className="works-modal-controls">
                    {(activeDemoVideo || activeIsYouTube || activeCanEmbed) && (
                      <div className="works-modal-view-mode" role="group" aria-label="Preview mode">
                        {(activeDemoVideo || activeIsYouTube) && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalViewMode("demo");
                              setMediaLoading(true);
                              sound.playAction();
                            }}
                            className={`works-modal-mode-btn ${modalViewMode === "demo" ? "active" : ""}`}
                          >
                            <svg
                              aria-hidden="true"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Demo</span>
                          </button>
                        )}

                        {activeCanEmbed && !activeEmbedBlocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalViewMode("live");
                              setMediaLoading(true);
                              sound.playAction();
                            }}
                            className={`works-modal-mode-btn ${modalViewMode === "live" ? "active" : ""}`}
                          >
                            <svg
                              aria-hidden="true"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M2 12h20" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>Live</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setModalViewMode("snapshot");
                            setMediaLoading(true);
                            sound.playAction();
                          }}
                          className={`works-modal-mode-btn ${modalViewMode === "snapshot" ? "active" : ""}`}
                        >
                          <svg
                            aria-hidden="true"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                            <circle cx="12" cy="13" r="3" />
                          </svg>
                          <span>Snapshot</span>
                        </button>
                      </div>
                    )}

                    {filteredWorks.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handlePrevProject();
                            sound.playAction();
                          }}
                          aria-label="Previous project"
                          className="modal-nav-btn magnetic-target"
                          title="Previous (←)"
                        >
                          ←
                        </button>
                        <span className="works-modal-counter">
                          {currentModalIndex + 1} / {filteredWorks.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleNextProject();
                            sound.playAction();
                          }}
                          aria-label="Next project"
                          className="modal-nav-btn magnetic-target"
                          title="Next (→)"
                        >
                          →
                        </button>
                      </>
                    )}
                    <button
                      ref={modalCloseBtnRef}
                      type="button"
                      onClick={closeModal}
                      aria-label="Close preview modal"
                      className="modal-nav-btn magnetic-target"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Media Container with Dark Navy Loading Skeleton */}
                <div className="works-modal-media-wrapper">
                  <div className={`works-modal-media-skeleton ${mediaLoading ? "" : "hidden"}`}>
                    <div className="works-modal-spinner" />
                    <span>Memuat pratinjau...</span>
                  </div>

                  {modalViewMode === "demo" && activeIsYouTube && activeProject.video_url ? (
                    <iframe
                      key={`${activeProject.id}-yt`}
                      ref={modalIframeRef}
                      src={getEmbedUrl(activeProject.video_url)}
                      title={activeProject.title}
                      style={{ width: "100%", height: "100%", border: "none", background: "#050a14" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setMediaLoading(false)}
                    />
                  ) : modalViewMode === "demo" && activeDemoVideo ? (
                    <video
                      key={`${activeProject.id}-vid`}
                      width={1280}
                      height={800}
                      poster={activeProject.auto_thumbnail || activeProject.image_url}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      onLoadedData={() => setMediaLoading(false)}
                      onCanPlay={() => setMediaLoading(false)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#050a14",
                      }}
                    >
                      <source src={activeDemoVideo} />
                    </video>
                  ) : modalViewMode === "live" && activeEmbedExplicitlyAllowed ? (
                    <iframe
                      key={`${activeProject.id}-live`}
                      ref={modalIframeRef}
                      src={activeProject.project_url}
                      title={activeProject.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        background: "#0a1120",
                      }}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      onLoad={() => setMediaLoading(false)}
                      onError={() => setMediaLoading(false)}
                    />
                  ) : (
                    <img
                      key={`${activeProject.id}-img`}
                      ref={(el) => {
                        if (el && el.complete) setMediaLoading(false);
                      }}
                      src={
                        activeProject.auto_thumbnail ||
                        activeProject.image_url ||
                        "/Resources/thumbnail-sharing.png"
                      }
                      alt={activeProject.title}
                      onLoad={() => setMediaLoading(false)}
                      onError={() => setMediaLoading(false)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>

                {/* Body: Case-Study Metadata Strip, Description & Tech Stack Pills */}
                <div className="works-modal-body">
                  <div className="works-modal-meta-strip">
                    <div className="works-modal-meta-cell">
                      <span className="works-modal-meta-label">Category</span>
                      <span className="works-modal-meta-value">{activeProject.category}</span>
                    </div>
                    <div className="works-modal-meta-cell">
                      <span className="works-modal-meta-label">Core Stack</span>
                      <span className="works-modal-meta-value">{activeTags.slice(0, 2).join(" · ")}</span>
                    </div>
                    <div className="works-modal-meta-cell">
                      <span className="works-modal-meta-label">Destination</span>
                      <span className="works-modal-meta-value">
                        {activeDomain || "Showcase Media"}
                        {activeEmbedBlocked && (
                          <span className="works-modal-safe-tag" title="Situs ini membatasi live iframe eksternal">
                            Safe Snapshot
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="works-modal-description">
                    {activeProject.description ||
                      "Solusi digital berkinerja tinggi yang dirancang dengan perpaduan keindahan visual, interaktivitas modern, dan arsitektur kode yang efisien."}
                  </p>
                  <div className="works-modal-tags">
                    {activeTags.map((tag, idx) => (
                      <span key={idx} className="works-modal-tag-pill">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="works-modal-footer">
                  <span className="works-modal-hint">Press ← → to navigate, ESC to close</span>
                  <div className="works-modal-footer-actions">
                    {activeProject.project_url && (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyProjectLink}
                          aria-label="Copy project URL"
                          className={`works-modal-copy-btn magnetic-target ${copiedProjectLink ? "copied" : ""}`}
                        >
                          {copiedProjectLink ? "✓ Copied" : "Copy Link"}
                        </button>
                        <a
                          href={activeProject.project_url.replace(/\/embed\/?$/, "/")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="works-modal-cta magnetic-target"
                        >
                          <span>Buka Link Asli</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
