import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import net from "net";
import dns from "dns/promises";
import sharp from "sharp";

const COVERS_DIR = path.join(process.cwd(), "public", "Resources", "works_covers");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap to prevent OOM

async function ensureDir() {
  try {
    await fs.mkdir(COVERS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

function normalizeTargetUrl(rawUrl: string): string {
  let clean = rawUrl.trim();
  const thumMatch = clean.match(/image\.thum\.io\/get\/.*?(https?:\/\/.+)$/i);
  if (thumMatch && thumMatch[1]) {
    clean = thumMatch[1];
  }
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

function isPrivateIpAddress(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");

  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10/8, 127/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast & reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const clean = ip.toLowerCase();
    if (clean === "::1" || clean === "::") return true;
    if (clean.startsWith("fe80:") || clean.startsWith("fc") || clean.startsWith("fd")) return true;
    return false;
  }

  return true;
}

async function isSafePublicUrl(urlStr: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) return false;

  const blockedSuffixes = [".local", ".internal", ".localhost", ".arpa"];
  if (
    hostname === "localhost" ||
    blockedSuffixes.some((suffix) => hostname.endsWith(suffix))
  ) {
    return false;
  }

  if (net.isIP(hostname)) {
    return !isPrivateIpAddress(hostname);
  }

  try {
    const resolved = await dns.lookup(hostname, { all: true });
    if (!resolved || resolved.length === 0) return false;
    return resolved.every((entry) => !isPrivateIpAddress(entry.address));
  } catch {
    return false;
  }
}

async function isAuthenticatedAdmin(req: NextRequest): Promise<boolean> {
  const token =
    req.cookies.get("admin_token")?.value ||
    req.headers.get("x-admin-token") ||
    "";
  if (!token) return false;

  const apiBase = process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return false;

  try {
    const res = await fetch(`${apiBase}/auth_check.php`, {
      method: "GET",
      headers: {
        "X-Admin-Token": token,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function canonicalHostPath(urlStr: string): string {
  try {
    const u = new URL(normalizeTargetUrl(urlStr));
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return "";
  }
}

async function isKnownProjectUrl(targetUrl: string): Promise<boolean> {
  const apiBase = process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return false;

  const targetKey = canonicalHostPath(targetUrl);
  if (!targetKey) return false;

  try {
    const res = await fetch(`${apiBase}/works.php`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{
      project_url?: string;
      video_url?: string;
    }>;
    if (!Array.isArray(rows)) return false;

    return rows.some((row) => {
      const pKey = row.project_url ? canonicalHostPath(row.project_url) : "";
      const vKey = row.video_url ? canonicalHostPath(row.video_url) : "";
      return targetKey === pKey || targetKey === vKey;
    });
  } catch {
    return false;
  }
}

async function readBoundedBuffer(res: Response): Promise<Buffer> {
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && parseInt(lenHeader, 10) > MAX_IMAGE_BYTES) {
    throw new Error("Remote image exceeds maximum allowed size.");
  }
  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Remote image exceeds maximum allowed size.");
  }
  return Buffer.from(arrayBuf);
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
}

async function fetchWebsiteSnapshotBuffer(targetUrl: string): Promise<Buffer> {
  // 1. Check if YouTube URL
  const ytId = extractYouTubeId(targetUrl);
  if (ytId) {
    const ytRes = await fetch(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`, {
      signal: AbortSignal.timeout(8000),
    });
    if (ytRes.ok) {
      return await readBoundedBuffer(ytRes);
    }
  }

  // 2. Tier 1: Microlink Headless Chromium Screenshot API (1280x800 viewport)
  try {
    const microlinkApi = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&viewport.width=1280&viewport.height=800`;
    const mlRes = await fetch(microlinkApi, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (mlRes.ok) {
      const mlJson = await mlRes.json();
      const screenshotUrl = mlJson?.data?.screenshot?.url || mlJson?.data?.image?.url;
      if (screenshotUrl && (await isSafePublicUrl(screenshotUrl))) {
        const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          return await readBoundedBuffer(imgRes);
        }
      }
    }
  } catch {
    // Fallback to Tier 2
  }

  // 3. Tier 2: WordPress mShots Service
  try {
    const mshotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1280&h=800`;
    const msRes = await fetch(mshotsUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (msRes.ok) {
      const contentType = msRes.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) {
        const buf = await readBoundedBuffer(msRes);
        if (buf.length > 8000) {
          return buf;
        }
      }
    }
  } catch {
    // Fallback to Tier 3
  }

  // 4. Tier 3: Thum.io Direct Stream
  const thumUrl = `https://image.thum.io/get/width/1280/crop/800/noanimate/${targetUrl}`;
  const thumRes = await fetch(thumUrl, { signal: AbortSignal.timeout(12000) });
  if (thumRes.ok) {
    const contentType = thumRes.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      return await readBoundedBuffer(thumRes);
    }
  }

  throw new Error("Unable to capture snapshot from target website.");
}

async function generateAndSaveWebP(
  normalizedUrl: string,
  forceRefresh = false,
): Promise<{ publicPath: string; filePath: string; buffer: Buffer }> {
  await ensureDir();
  const hash = crypto.createHash("md5").update(normalizedUrl).digest("hex").slice(0, 12);
  const fileName = `cover-${hash}.webp`;
  const filePath = path.join(COVERS_DIR, fileName);
  const publicPath = `/Resources/works_covers/${fileName}`;

  if (!forceRefresh) {
    try {
      const existingBuffer = await fs.readFile(filePath);
      if (existingBuffer.length > 1000) {
        return { publicPath, filePath, buffer: existingBuffer };
      }
    } catch {
      // Cache miss, proceed below
    }
  }

  const rawBuffer = await fetchWebsiteSnapshotBuffer(normalizedUrl);

  const webpBuffer = await sharp(rawBuffer, { limitInputPixels: 25_000_000 })
    .resize(1280, 800, {
      fit: "cover",
      position: "north",
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  await fs.writeFile(filePath, webpBuffer);
  return { publicPath, filePath, buffer: webpBuffer };
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";

  if (!rawUrl) {
    return NextResponse.redirect(new URL("/Resources/thumbnail-sharing.png", req.url));
  }

  const normalizedUrl = normalizeTargetUrl(rawUrl);
  if (!(await isSafePublicUrl(normalizedUrl))) {
    return NextResponse.json({ status: "error", message: "Forbidden target URL." }, { status: 400 });
  }

  // Only authenticated admins can force-refresh cached covers
  if (refresh && !(await isAuthenticatedAdmin(req))) {
    return NextResponse.json({ status: "error", message: "Unauthorized refresh request." }, { status: 401 });
  }

  // For unauthenticated requests, serve cached files or allow capture only for registered portfolio URLs
  const hash = crypto.createHash("md5").update(normalizedUrl).digest("hex").slice(0, 12);
  const cachedPath = path.join(COVERS_DIR, `cover-${hash}.webp`);
  let isCached = false;
  try {
    const stat = await fs.stat(cachedPath);
    isCached = stat.size > 1000;
  } catch {
    isCached = false;
  }

  if (!isCached && !refresh) {
    const [isAdmin, isKnown] = await Promise.all([
      isAuthenticatedAdmin(req),
      isKnownProjectUrl(normalizedUrl),
    ]);
    if (!isAdmin && !isKnown) {
      return NextResponse.redirect(new URL("/Resources/thumbnail-sharing.png", req.url));
    }
  }

  try {
    const { buffer } = await generateAndSaveWebP(normalizedUrl, refresh);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/Resources/thumbnail-sharing.png", req.url));
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedAdmin(req))) {
    return NextResponse.json({ status: "error", message: "Unauthorized access." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawUrl = body?.url;
    const forceRefresh = Boolean(body?.forceRefresh);

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ status: "error", message: "Valid website URL is required." }, { status: 400 });
    }

    const normalizedUrl = normalizeTargetUrl(rawUrl);
    if (!(await isSafePublicUrl(normalizedUrl))) {
      return NextResponse.json(
        { status: "error", message: "Blocked or invalid target URL." },
        { status: 400 },
      );
    }

    const { publicPath, buffer } = await generateAndSaveWebP(normalizedUrl, forceRefresh);
    const sizeKb = Math.round((buffer.length / 1024) * 10) / 10;

    return NextResponse.json({
      status: "success",
      image_url: publicPath,
      size_kb: sizeKb,
      message: `Instant WebP cover generated (${sizeKb} KB)!`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate cover from URL.";
    return NextResponse.json(
      {
        status: "error",
        message: errorMsg,
      },
      { status: 500 },
    );
  }
}
