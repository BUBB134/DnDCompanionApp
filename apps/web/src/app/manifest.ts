import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D&D Companion",
    short_name: "D&D Companion",
    description: "Campaign memory and table support for D&D groups.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e5",
    theme_color: "#17161f",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
