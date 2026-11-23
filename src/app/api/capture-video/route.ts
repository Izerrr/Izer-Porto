import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";
import sharp from "sharp";
import {
  isAuthenticatedAdmin,
  isSafePublicUrl,
  normalizeTargetUrl,
} from "@/app/lib/url-safety";

const execFileAsync = promisify(execFile);

const DEMOS_DIR = path.join(process.cwd(), "public", "Resources", "works_demos");
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DEMO_FILE_REGEX = /^demo-[a-f0-9]{12}\.mp4$/;

async function ensureDemosDir() {
  try {
    await fs.mkdir(DEMOS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function readBoundedBuffer(res: Response): Promise<Buffer> {
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && parseInt(lenHeader, 10) > MAX_IMAGE_BYTES) {
    throw new Error("Remote snapshot exceeds maximum allowed size.");
  }
  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Remote snapshot exceeds maximum allowed size.");
  }
  return Buffer.from(arrayBuf);
}

interface PlaywrightChromium {
  launch(options?: Record<string, unknown>): Promise<{
    newContext(options?: Record<string, unknown>): Promise<{
      newPage(): Promise<{
        goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
        waitForTimeout(ms: number): Promise<void>;
        evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg?: A): Promise<R>;
        video(): { path(): Promise<string> } | null;
      }>;
      close(): Promise<void>;
    }>;
    close(): Promise<void>;
  }>;
}

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<{
  chromium?: PlaywrightChromium;
  default?: { chromium?: PlaywrightChromium };
}>;

async function loadPlaywrightChromium(): Promise<PlaywrightChromium | null> {
  const candidates = [
    path.join(
      /*turbopackIgnore: true*/ os.homedir(),
      ".gemini",
      "config",
      "skills",
      "video-demo",
      "node_modules",
      "playwright",
      "index.mjs",
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(/*turbopackIgnore: true*/ candidate)) {
      try {
        const mod = await dynamicImport(pathToFileURL(candidate).href);
        const chromium = mod?.chromium || mod?.default?.chromium;
        if (chromium) return chromium;
      } catch {
        // Continue to next candidate
      }
    }
  }

  try {
    const mod = await dynamicImport("playwright");
    const chromium = mod?.chromium || mod?.default?.chromium;
    if (chromium) return chromium;
  } catch {
    // Playwright not installed in standard path
  }

  return null;
}

async function resolveFfmpegBinary(): Promise<string> {
  const customFfmpeg = process.env.FFMPEG_PATH;
  if (customFfmpeg && existsSync(/*turbopackIgnore: true*/ customFfmpeg)) {
    return customFfmpeg;
  }
  return "ffmpeg";
}

/**
 * Tier 1: Antigravity-style live headless browser recording with smooth cursor & scroll choreography.
 */
async function recordLiveBrowserDemo(
  targetUrl: string,
  tmpDir: string,
  outMp4Path: string,
): Promise<boolean> {
  const chromium = await loadPlaywrightChromium();
  if (!chromium) return false;

  const ffmpegBin = await resolveFfmpegBinary();
  let browser: Awaited<ReturnType<PlaywrightChromium["launch"]>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: tmpDir,
        size: { width: 1280, height: 800 },
      },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 18000,
    });
    await page.waitForTimeout(1000);

    // Run smooth cursor + cosine scroll choreography inside the live page (~4.4s)
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Inject visual cursor spotlight indicator
      const cursor = document.createElement("div");
      cursor.id = "__izer_demo_cursor";
      cursor.style.cssText = [
        "position:fixed",
        "top:0",
        "left:0",
        "width:22px",
        "height:22px",
        "margin-left:-11px",
        "margin-top:-11px",
        "border-radius:9999px",
        "background:rgba(56,189,248,0.28)",
        "border:2px solid rgba(255,255,255,0.92)",
        "box-shadow:0 0 18px rgba(56,189,248,0.65),0 4px 12px rgba(0,0,0,0.35)",
        "pointer-events:none",
        "z-index:2147483647",
        "transform:translate3d(640px,400px,0)",
        "transition:transform 420ms cubic-bezier(0.22,1,0.36,1)",
      ].join(";");
      document.documentElement.appendChild(cursor);

      const moveCursor = async (x: number, y: number, waitMs: number) => {
        cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
        await sleep(waitMs);
      };

      await moveCursor(460, 290, 460);
      await moveCursor(820, 340, 460);
      await moveCursor(640, 440, 320);

      const maxScroll = Math.max(
        0,
        Math.min(
          (document.documentElement.scrollHeight || document.body.scrollHeight || 1600) -
            window.innerHeight,
          1200,
        ),
      );

      if (maxScroll > 40) {
        const downSteps = 48;
        for (let i = 1; i <= downSteps; i++) {
          const p = i / downSteps;
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
          window.scrollTo(0, Math.round(maxScroll * eased));
          const cx = Math.round(640 + Math.sin(p * Math.PI * 2) * 180);
          const cy = Math.round(420 - Math.cos(p * Math.PI) * 90);
          cursor.style.transition = "transform 80ms linear";
          cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
          await sleep(34);
        }

        await sleep(360);

        const upSteps = 32;
        for (let i = 1; i <= upSteps; i++) {
          const p = i / upSteps;
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
          window.scrollTo(0, Math.round(maxScroll * (1 - eased)));
          await sleep(30);
        }
      } else {
        await moveCursor(360, 480, 650);
        await moveCursor(900, 260, 650);
        await moveCursor(640, 400, 500);
      }

      await sleep(250);
    });

    const videoObj = page.video();
    await context.close();
    await browser.close();
    browser = null;

    if (!videoObj) return false;
    const rawWebmPath = await videoObj.path();

    await execFileAsync(
      ffmpegBin,
      [
        "-y",
        "-ss",
        "0.35",
        "-i",
        rawWebmPath,
        "-t",
        "5.4",
        "-vf",
        "scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2,fps=30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "26",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        outMp4Path,
      ],
      { timeout: 35000 },
    );

    const stat = await fs.stat(outMp4Path).catch(() => null);
    return Boolean(stat && stat.size > 4000);
  } catch {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return false;
  }
}

async function fetchTallWebsiteSnapshot(targetUrl: string): Promise<Buffer> {
  // 1. Microlink tall viewport (1280x1800)
  try {
    const mlUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&viewport.width=1280&viewport.height=1800`;
    const mlRes = await fetch(mlUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(14000),
    });
    if (mlRes.ok) {
      const mlJson = await mlRes.json();
      const shotUrl = mlJson?.data?.screenshot?.url || mlJson?.data?.image?.url;
      if (shotUrl && (await isSafePublicUrl(shotUrl))) {
        const imgRes = await fetch(shotUrl, { signal: AbortSignal.timeout(10000) });
        if (imgRes.ok) {
          return await readBoundedBuffer(imgRes);
        }
      }
    }
  } catch {
    // Fallback to Thum.io
  }

  // 2. Thum.io tall capture (1280x1800)
  try {
    const thumUrl = `https://image.thum.io/get/width/1280/crop/1800/noanimate/${targetUrl}`;
    const thumRes = await fetch(thumUrl, { signal: AbortSignal.timeout(14000) });
    if (thumRes.ok && (thumRes.headers.get("content-type") || "").startsWith("image/")) {
      return await readBoundedBuffer(thumRes);
    }
  } catch {
    // Fallback to mShots
  }

  // 3. WordPress mShots
  const mshotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1280&h=1600`;
  const msRes = await fetch(mshotsUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (msRes.ok && (msRes.headers.get("content-type") || "").startsWith("image/")) {
    return await readBoundedBuffer(msRes);
  }

  throw new Error("Unable to fetch website snapshot for video synthesis.");
}

/**
 * Tier 2: Zero-browser fallback — synthesizes a smooth 30fps vertical cosine scroll-pan MP4 from a tall capture.
 */
async function recordSnapshotPanDemo(
  targetUrl: string,
  tmpDir: string,
  outMp4Path: string,
): Promise<boolean> {
  const ffmpegBin = await resolveFfmpegBinary();
  const rawBuffer = await fetchTallWebsiteSnapshot(targetUrl);
  const tallPngPath = path.join(tmpDir, "tall-source.png");

  await sharp(rawBuffer, { limitInputPixels: 40_000_000 })
    .resize(1280, 1600, {
      fit: "cover",
      position: "north",
    })
    .png()
    .toFile(tallPngPath);

  await execFileAsync(
    ffmpegBin,
    [
      "-y",
      "-loop",
      "1",
      "-i",
      tallPngPath,
      "-t",
      "5.0",
      "-vf",
      "crop=1280:800:0:'(ih-800)*(0.5-0.5*cos(PI*t/2.5))',scale=960:600,fps=30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "26",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      outMp4Path,
    ],
    { timeout: 30000 },
  );

  const stat = await fs.stat(outMp4Path).catch(() => null);
  return Boolean(stat && stat.size > 4000);
}

export async function GET(req: NextRequest) {
  const fileParam = req.nextUrl.searchParams.get("file") || "";
  const urlParam = req.nextUrl.searchParams.get("url") || "";

  let fileName = "";
  if (DEMO_FILE_REGEX.test(fileParam)) {
    fileName = fileParam;
  } else if (urlParam.trim()) {
    const normalized = normalizeTargetUrl(urlParam);
    const hash = crypto.createHash("md5").update(normalized).digest("hex").slice(0, 12);
    fileName = `demo-${hash}.mp4`;
  }

  if (!fileName || !DEMO_FILE_REGEX.test(fileName)) {
    return NextResponse.json({ status: "error", message: "Invalid demo video file." }, { status: 400 });
  }

  const filePath = path.join(DEMOS_DIR, fileName);
  try {
    const buf = await fs.readFile(filePath);
    const total = buf.byteLength;
    const range = req.headers.get("range");

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (start >= 0 && start < total && start <= end) {
          const chunk = buf.subarray(start, end + 1);
          return new NextResponse(new Uint8Array(chunk), {
            status: 206,
            headers: {
              "Content-Type": "video/mp4",
              "Content-Range": `bytes ${start}-${end}/${total}`,
              "Accept-Ranges": "bytes",
              "Content-Length": String(chunk.byteLength),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      }
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": String(total),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ status: "error", message: "Demo video not found." }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedAdmin(req))) {
    return NextResponse.json({ status: "error", message: "Unauthorized access." }, { status: 401 });
  }

  let tmpDir: string | null = null;
  try {
    const body = await req.json();
    const rawUrl = body?.url;
    const forceRefresh = Boolean(body?.forceRefresh);

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { status: "error", message: "Valid website URL is required." },
        { status: 400 },
      );
    }

    const normalizedUrl = normalizeTargetUrl(rawUrl);
    if (!(await isSafePublicUrl(normalizedUrl))) {
      return NextResponse.json(
        { status: "error", message: "Blocked or invalid target URL." },
        { status: 400 },
      );
    }

    await ensureDemosDir();
    const hash = crypto.createHash("md5").update(normalizedUrl).digest("hex").slice(0, 12);
    const fileName = `demo-${hash}.mp4`;
    const outMp4Path = path.join(DEMOS_DIR, fileName);
    const streamUrl = `/api/capture-video?file=${fileName}`;
    const staticUrl = `/Resources/works_demos/${fileName}`;

    if (!forceRefresh) {
      const existingStat = await fs.stat(outMp4Path).catch(() => null);
      if (existingStat && existingStat.size > 4000) {
        const sizeKb = Math.round((existingStat.size / 1024) * 10) / 10;
        return NextResponse.json({
          status: "success",
          video_url: streamUrl,
          static_url: staticUrl,
          size_kb: sizeKb,
          engine: "cached",
          message: `Cached video preview applied (${sizeKb} KB)!`,
        });
      }
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "izer-video-demo-"));

    // Tier 1: Live Headless Browser Recording (Playwright + FFmpeg)
    let engine: "playwright-live" | "cinematic-scroll" = "playwright-live";
    let ok = await recordLiveBrowserDemo(normalizedUrl, tmpDir, outMp4Path);

    // Tier 2: Fallback Tall Snapshot Smooth Scroll Pan (Sharp + FFmpeg)
    if (!ok) {
      engine = "cinematic-scroll";
      ok = await recordSnapshotPanDemo(normalizedUrl, tmpDir, outMp4Path);
    }

    if (!ok) {
      return NextResponse.json(
        { status: "error", message: "Gagal membuat video preview dari situs target." },
        { status: 500 },
      );
    }

    const finalStat = await fs.stat(outMp4Path);
    const sizeKb = Math.round((finalStat.size / 1024) * 10) / 10;

    return NextResponse.json({
      status: "success",
      video_url: streamUrl,
      static_url: staticUrl,
      size_kb: sizeKb,
      engine,
      message:
        engine === "playwright-live"
          ? `Live browser video preview generated (${sizeKb} KB)!`
          : `Cinematic scroll video preview generated (${sizeKb} KB)!`,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to generate video preview from URL.";
    return NextResponse.json(
      {
        status: "error",
        message: errorMsg,
      },
      { status: 500 },
    );
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
