import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VO Biz Suite",
    short_name: "VO Biz Suite",
    description:
      "CRM and business management for voice actors — clients, auditions, billing, and AI tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1530",
    theme_color: "#1a1530",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  }
}
