import { NextRequest } from "next/server";
import net from "net";
import dns from "dns/promises";

export function normalizeTargetUrl(rawUrl: string): string {
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

export function isPrivateIpAddress(ip: string): boolean {
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

export async function isSafePublicUrl(urlStr: string): Promise<boolean> {
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
  if (hostname === "localhost" || blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
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

export function canonicalHostPath(urlStr: string): string {
  try {
    const u = new URL(normalizeTargetUrl(urlStr));
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return "";
  }
}

export function getCanonicalHost(urlStr: string | null | undefined): string {
  if (!urlStr) return "";
  try {
    return new URL(normalizeTargetUrl(urlStr)).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export async function isAuthenticatedAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_token")?.value || req.headers.get("x-admin-token") || "";
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

export async function isKnownProjectUrl(targetUrl: string): Promise<boolean> {
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

function headersAllowIframe(res: Response): boolean {
  const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) {
    return false;
  }

  const csp = (res.headers.get("content-security-policy") || "").toLowerCase();
  const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/);
  if (frameAncestorsMatch && frameAncestorsMatch[1]) {
    const sources = frameAncestorsMatch[1].trim();
    if (sources === "'none'" || sources === "'self'") {
      return false;
    }
    const allowedTokens = sources.split(/\s+/);
    const explicitlyAllowsAll = allowedTokens.some((tok) => tok === "*" || tok.includes("izerworks.my.id"));
    if (!explicitlyAllowsAll && allowedTokens.every((tok) => tok.startsWith("'"))) {
      return false;
    }
  }

  return true;
}

/**
 * Probes whether a validated public URL allows cross-origin iframe embedding.
 * Rejects redirects to private/loopback hosts and safely defaults false on network error.
 */
export async function probeEmbedAllowed(normalizedUrl: string): Promise<boolean> {
  if (!(await isSafePublicUrl(normalizedUrl))) {
    return false;
  }

  const tryFetch = async (method: "HEAD" | "GET") => {
    const res = await fetch(normalizedUrl, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(4500),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      const redirectedUrl = new URL(location, normalizedUrl).toString();
      if (!(await isSafePublicUrl(redirectedUrl))) {
        throw new Error("Unsafe redirect destination");
      }
      return fetch(redirectedUrl, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(4500),
      });
    }

    return res;
  };

  try {
    let res = await tryFetch("HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await tryFetch("GET");
    }
    if (!res.ok) return false;
    return headersAllowIframe(res);
  } catch {
    return false;
  }
}
