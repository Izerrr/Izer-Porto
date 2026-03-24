document.addEventListener("DOMContentLoaded", () => {
  // --- 1. SMOOTH SCROLL (LENIS) ---
  const lenis = new Lenis({ lerp: 0.08 });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // --- 2. PRELOADER ENGINE ---
  let progress = 0;
  gsap.to(".preloader-text", { y: "0%", duration: 1.2, ease: "power4.out" });

  const progressInterval = setInterval(() => {
    progress += Math.random() * 8;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressInterval);
      gsap.to(".preloader", {
        y: "-100%",
        duration: 1.2,
        delay: 0.3,
        ease: "power4.inOut",
        onComplete: () => {
          document.body.classList.remove("loading");
          gsap.to(".hero-section", { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" });
          ScrollTrigger.refresh();
        },
      });
    }
    document.querySelector(".preloader-progress").style.width = progress + "%";
    document.querySelector(".preloader-percent").textContent = Math.round(progress) + "%";
  }, 50);

  // --- 3. SCROLL PROGRESS BAR ---
  gsap.to(".scroll-progress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { scrub: 0.3, trigger: "body", start: "top top", end: "bottom bottom" },
  });

  // --- 4. MAGNETIC CURSOR ---
  const cursor = document.querySelector(".cursor-follower");
  document.addEventListener("mousemove", (e) => {
    gsap.to(cursor, { x: e.clientX - cursor.offsetWidth / 2, y: e.clientY - cursor.offsetHeight / 2, duration: 0.15 });
  });

  const mTargets = document.querySelectorAll(".magnetic-target");
  mTargets.forEach((t) => {
    t.addEventListener("mousemove", (e) => {
      const { left, top, width, height } = t.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) / 4;
      const y = (e.clientY - top - height / 2) / 4;
      gsap.to(t, { x: x, y: y, duration: 0.3, ease: "power3.out" });
      gsap.to(cursor, { scale: 3, opacity: 0.3, duration: 0.2 });
    });
    t.addEventListener("mouseleave", () => {
      gsap.to(t, { x: 0, y: 0, duration: 0.5, ease: "power3.out" });
      gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.2 });
    });
  });

  // --- 5. KINETIC TYPOGRAPHY ---
  const kineticTitles = document.querySelectorAll(".kinetic-reveal");
  kineticTitles.forEach((title) => {
    const text = title.textContent;
    title.textContent = "";
    [...text].forEach((char) => {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      title.appendChild(span);
    });
    gsap.from(title.querySelectorAll("span"), {
      scrollTrigger: { trigger: title, start: "top 85%" },
      y: 30,
      opacity: 0,
      filter: "blur(5px)",
      stagger: 0.02,
      duration: 0.8,
      ease: "power3.out",
    });
  });

  // --- 6. BACKGROUND PARALLAX ---
  gsap.to(".shape-1", { scrollTrigger: { scrub: 1 }, y: -150 });
  gsap.to(".shape-2", { scrollTrigger: { scrub: 1 }, y: -250 });

  // --- 7. GSAP PINNING HORIZONTAL SCROLL (WORKS) ---
  const worksContainer = document.getElementById("works-scroll-container");
  const worksSection = document.getElementById("works");

  if (worksContainer && worksSection) {
    let scrollAmount = () => -(worksContainer.scrollWidth - window.innerWidth + 80);

    let tween = gsap.to(worksContainer, {
      x: scrollAmount,
      ease: "none",
      scrollTrigger: {
        trigger: worksSection,
        start: "center center",
        end: () => "+=" + worksContainer.scrollWidth,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    const arrowLeft = document.querySelector(".arrow-left");
    const arrowRight = document.querySelector(".arrow-right");
    if (arrowLeft && arrowRight) {
      arrowLeft.addEventListener("click", () => {
        lenis.scrollTo(window.scrollY - window.innerWidth * 0.8);
      });
      arrowRight.addEventListener("click", () => {
        lenis.scrollTo(window.scrollY + window.innerWidth * 0.8);
      });
    }
  }

  // --- 8. HERO PARALLAX ---
  const hBox = document.querySelector(".hero-visual-box");
  const hImg = document.querySelector(".parallax-img");
  if (hBox && hImg) {
    hBox.addEventListener("mousemove", (e) => {
      const { width, height } = hBox.getBoundingClientRect();
      const x = (e.clientX - width / 2) / 150;
      const y = (e.clientY - height / 2) / 150;
      gsap.to(hImg, { x: x, y: y, duration: 0.5, ease: "power2.out" });
    });
    hBox.addEventListener("mouseleave", () => {
      gsap.to(hImg, { x: 0, y: 0, duration: 0.8, ease: "power3.out" });
    });
  }

  gsap.to(".hero-watermark", {
    y: 150,
    opacity: 0.3,
    scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom top", scrub: 1 },
  });

  // --- 9. TYPEWRITER & THEME ---
  const typewriterText = document.getElementById("typewriter-text");
  const words = ["Rayhan Fahrezi Setiawan.", "IZER."];
  let wIdx = 0,
    cIdx = 0,
    isDel = false;
  function type() {
    if (!typewriterText) return;
    const curr = words[wIdx];
    typewriterText.textContent = isDel ? curr.substring(0, cIdx--) : curr.substring(0, cIdx++);
    let speed = isDel ? 40 : 80;
    if (!isDel && cIdx === curr.length) {
      speed = 2500;
      isDel = true;
    } else if (isDel && cIdx === 0) {
      isDel = false;
      wIdx = (wIdx + 1) % words.length;
      speed = 600;
    }
    setTimeout(type, speed);
  }
  type();

  document.getElementById("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isL = document.body.classList.contains("light-mode");
    gsap.to(":root", { "--hero-floor": isL ? "rgba(255,255,255,0.8)" : "rgba(10,17,32,1)", duration: 0.5 });
  });

  // --- 10. MOBILE MENU ELEGANT OVERLAY TENTATIVE ---
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu-overlay");
  // Ambil link nav desktop DAN mobile buat logic klik
  const allNavItems = document.querySelectorAll(".nav-item, .mobile-nav-item");

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    mobileMenu.classList.toggle("active");
  });

  allNavItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      // Tutup menu overlay kalau lagi di mobile
      hamburger.classList.remove("active");
      mobileMenu.classList.remove("active");

      const targetId = this.getAttribute("href");
      lenis.scrollTo(targetId, { offset: -100 });
    });
  });

  // Image slider di section About
  const aboutImages = document.querySelectorAll(".about-img");
  let currentImageIndex = 0;
  if (aboutImages.length > 1) {
    setInterval(() => {
      aboutImages[currentImageIndex].classList.remove("active");
      currentImageIndex = (currentImageIndex + 1) % aboutImages.length;
      aboutImages[currentImageIndex].classList.add("active");
    }, 4000);
  }

  // --- 11. ACTIVE NAV ON SCROLL (Desktop & Mobile Strikethrough) ---
  const sections = document.querySelectorAll("section, footer");
  const navLinksArr = document.querySelectorAll(".nav-links a, .mobile-nav-links a");

  sections.forEach((sec) => {
    const id = sec.getAttribute("id");
    if (!id) return;

    ScrollTrigger.create({
      trigger: sec,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (self) => {
        if (self.isActive) {
          navLinksArr.forEach((link) => {
            if (link.getAttribute("href") === `#${id}`) {
              link.classList.add("active");
            } else {
              link.classList.remove("active");
            }
          });
        }
      },
    });
  });
});
