/**
 * Static registry of lightweight showcase MP4 loops recorded via the `video-demo` studio.
 * Maps canonical project hostnames to local assets under `/Resources/works_demos/`.
 * Explicit `video_url` values set in Admin always take precedence.
 */
export const WORKS_DEMO_VIDEOS: Record<string, string> = {
  "taskpanel.ftsduaenam.web.id": "/Resources/works_demos/taskpanel.mp4",
  "krakatau.izerworks.my.id": "/Resources/works_demos/krakatau.mp4",
  "signature.izerworks.my.id": "/Resources/works_demos/signature.mp4",
  "cafepulse.izerworks.my.id": "/Resources/works_demos/cafepulse.mp4",
  "osis.smaasbsolo.sch.id": "/Resources/works_demos/osis.mp4",
  "greenify.izerworks.my.id": "/Resources/works_demos/greenify.mp4",
  "izerworks.my.id": "/Resources/works_demos/izerworks.mp4",
};

const DIRECT_VIDEO_REGEX = /\.(mp4|webm|ogg|mov)($|\?)/i;

export function isDirectVideoFile(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") return false;
  return DIRECT_VIDEO_REGEX.test(url.trim());
}

export function extractDomainHost(url: string | null | undefined): string {
  if (!url || !url.trim()) return "";
  try {
    const clean = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    return new URL(clean).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function resolveWorkDemoVideo(
  projectUrl?: string | null,
  explicitVideoUrl?: string | null,
): string | null {
  if (explicitVideoUrl && isDirectVideoFile(explicitVideoUrl)) {
    return explicitVideoUrl.trim();
  }
  const host = extractDomainHost(projectUrl);
  if (host && WORKS_DEMO_VIDEOS[host]) {
    return WORKS_DEMO_VIDEOS[host];
  }
  return null;
}
