import { NextRequest, NextResponse } from "next/server";
import {
  canonicalHostPath,
  isAuthenticatedAdmin,
  isKnownProjectUrl,
  isSafePublicUrl,
  normalizeTargetUrl,
  probeEmbedAllowed,
} from "@/app/lib/url-safety";

const EMBED_CACHE_TTL_MS = 15 * 60 * 1000;
const embedCache = new Map<string, { allowed: boolean; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl || !rawUrl.trim()) {
    return NextResponse.json({ iframe_allowed: false }, { status: 400 });
  }

  const normalizedUrl = normalizeTargetUrl(rawUrl);
  if (!(await isSafePublicUrl(normalizedUrl))) {
    return NextResponse.json({ iframe_allowed: false }, { status: 400 });
  }

  const cacheKey = canonicalHostPath(normalizedUrl);
  const cached = cacheKey ? embedCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { iframe_allowed: cached.allowed },
      { headers: { "Cache-Control": "public, max-age=900" } },
    );
  }

  const [isAdmin, isKnown] = await Promise.all([
    isAuthenticatedAdmin(req),
    isKnownProjectUrl(normalizedUrl),
  ]);

  if (!isAdmin && !isKnown) {
    return NextResponse.json({ iframe_allowed: false }, { status: 403 });
  }

  const allowed = await probeEmbedAllowed(normalizedUrl);
  if (cacheKey) {
    embedCache.set(cacheKey, { allowed, expiresAt: Date.now() + EMBED_CACHE_TTL_MS });
  }

  return NextResponse.json(
    { iframe_allowed: allowed },
    { headers: { "Cache-Control": "public, max-age=900" } },
  );
}
