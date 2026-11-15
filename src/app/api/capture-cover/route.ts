import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import {
  isAuthenticatedAdmin,
  isKnownProjectUrl,
  isSafePublicUrl,
  normalizeTargetUrl,
  probeEmbedAllowed,
} from "@/app/lib/url-safety";

const COVERS_DIR = path.join(process.cwd(), "public", "Resources", "works_covers");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap to prevent OOM

async function ensureDir() {
  try {
    await fs.mkdir(COVERS_DIR, { recursive: true });
  } catch {
    // Directory already exists
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

    const [{ publicPath, buffer }, iframeAllowed] = await Promise.all([
      generateAndSaveWebP(normalizedUrl, forceRefresh),
      probeEmbedAllowed(normalizedUrl),
    ]);
    const sizeKb = Math.round((buffer.length / 1024) * 10) / 10;

    return NextResponse.json({
      status: "success",
      image_url: publicPath,
      size_kb: sizeKb,
      iframe_allowed: iframeAllowed,
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
