export interface HudToastDetail {
  title: string;
  subtitle?: string;
}

function legacyCopyText(text: string): boolean {
  const field = Object.assign(document.createElement("textarea"), { value: text });
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopyText(text);
  }
}

export function showHudToast(detail: HudToastDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HudToastDetail>("izer-hud-toast", { detail }));
}
