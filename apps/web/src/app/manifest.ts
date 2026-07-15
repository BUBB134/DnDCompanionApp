import type { MetadataRoute } from "next";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_MARK_PATH,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
} from "@/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_SHORT_NAME,
    description: PRODUCT_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en-GB",
    categories: ["games", "productivity"],
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
        src: PRODUCT_MARK_PATH,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
