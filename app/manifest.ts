import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f6f0e7",
    description: "Play unlimited country guessing games online or offline.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/icon-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/icon-maskable-512.png",
        type: "image/png",
      },
    ],
    name: "WikiGuesser",
    orientation: "portrait-primary",
    scope: "/",
    short_name: "WikiGuesser",
    start_url: "/?source=pwa",
    theme_color: "#115e59",
  };
}
