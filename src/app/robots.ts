import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/admin/*"],
      },
    ],
    sitemap: "https://izerworks.my.id/sitemap.xml",
  };
}

