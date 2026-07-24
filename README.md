# 🌐 Izer Portfolio - Frontend Architecture

System architecture and client-side implementation for my personal portfolio website, designed for high performance, smooth motion design, and secure API integration.

---

## 🏗️ Architectural Overview

- **App Router Architecture**: Built with Next.js 15 (React 19) separating Server Components (fast initial load) and Client Components (interactive elements).
- **Motion Engine**: Powered by **GSAP (GreenSock)** for scroll-driven animations, custom cursor tracking, and layout transitions.
- **Cross-Domain Session Handling**: Configured with `credentials: 'include'` on client fetch requests to seamlessly send and receive HttpOnly authentication cookies across subdomains (`izerworks.my.id` ↔ `api.izerworks.my.id`).
- **Production Pipeline**: Served via Node.js managed by **PM2** behind an **Nginx Reverse Proxy**.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 / TypeScript
- **Styling**: Tailwind CSS
- **Animation**: GSAP
- **Runtime Manager**: PM2
