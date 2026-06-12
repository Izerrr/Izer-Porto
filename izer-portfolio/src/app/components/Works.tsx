"use client";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  id: number;
  title: string;
  category: string;
  image_url: string;
  project_url: string; // Link External
  video_url: string; // Link Video
}

export default function Works() {
  const [works, setWorks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/works.php`)
      .then((res) => res.json())
      .then((data) => {
        setWorks(data);
        setLoading(false);
        cache: "no-store";
      });
  }, []);

  useEffect(() => {
    if (loading || works.length === 0) return;
    let ctx = gsap.context(() => {
      gsap.to(scrollRef.current, {
        x: () => -((scrollRef.current as any).scrollWidth - window.innerWidth + 80),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "center center",
          end: () => "+=" + (scrollRef.current as any).scrollWidth,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [loading, works]);

  return (
    <section id="works" ref={sectionRef}>
      <div className="section-container">
        <div className="section-header works-header">
          <h2 className="section-title kinetic-reveal">Selected Works.</h2>
        </div>
      </div>

      <div className="works-horizontal-scroll" ref={scrollRef}>
        {loading ? (
          <p style={{ color: "white", padding: "5vw" }}>Loading...</p>
        ) : (
          works.map((item) => (
            <a key={item.id} href={item.project_url || "#"} target="_blank" className="work-link-wrapper">
              <div className="glass-card elegant-work-card">
                {item.video_url ? (
                  <video src={item.video_url} autoPlay muted loop playsInline className="work-video-bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="work-image-bg" style={{ backgroundImage: `url('${item.image_url}')` }}></div>
                )}
                <div className="work-content">
                  <span className="work-category">{item.category}</span>
                  <h3 className="elegant-heading">{item.title}</h3>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
