import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const COVERS_DIR = path.join(process.cwd(), "public", "Resources", "works_covers");

async function ensureDir() {
  try {
    await fs.mkdir(COVERS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

function normalizeTargetUrl(rawUrl: string): string {
  let clean = rawUrl.trim();
  // Extract original URL if wrapped in thum.io
  const thumMatch = clean.match(/image\.thum\.io\/get\/.*?(https?:\/\/.+)$/i);
  if (thumMatch && thumMatch[1]) {
    clean = thumMatch[1];
  }
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
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
      return Buffer.from(await ytRes.arrayBuffer());
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
      if (screenshotUrl) {
        const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          return Buffer.from(await imgRes.arrayBuffer());
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
        const buf = Buffer.from(await msRes.arrayBuffer());
        // Avoid tiny placeholder GIFs returned while mShots queues
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
      return Buffer.from(await thumRes.arrayBuffer());
    }
  }

  throw new Error("Unable to capture snapshot from target website.");
}

async function generateAndSaveWebP(targetUrl: string, forceRefresh = false): Promise<{ publicPath: string; filePath: string; buffer: Buffer }> {
  await ensureDir();
  const normalizedUrl = normalizeTargetUrl(targetUrl);
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
      // File does not exist yet, proceed to capture
    }
  }

  const rawBuffer = await fetchWebsiteSnapshotBuffer(normalizedUrl);

  const webpBuffer = await sharp(rawBuffer)
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

  try {
    const { buffer } = await generateAndSaveWebP(rawUrl, refresh);
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
  try {
    const body = await req.json();
    const rawUrl = body?.url;
    const forceRefresh = Boolean(body?.forceRefresh);

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ status: "error", message: "Valid website URL is required." }, { status: 400 });
    }

    const { publicPath, buffer } = await generateAndSaveWebP(rawUrl, forceRefresh);
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

