import { ImageResponse } from "next/og";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/brand";

export const alt = `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, #121416 0%, #17161f 58%, #26202a 100%)",
          color: "#e2e2e5",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 78px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 790 }}>
          <div
            style={{
              color: "#d4af37",
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            Campaign memory · live table support
          </div>
          <div
            style={{
              color: "#f2e0c3",
              display: "flex",
              fontFamily: "Georgia",
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.03,
              marginTop: 26,
            }}
          >
            {PRODUCT_NAME}
          </div>
          <div
            style={{
              color: "#d0c5af",
              display: "flex",
              fontSize: 31,
              lineHeight: 1.35,
              marginTop: 28,
            }}
          >
            {PRODUCT_TAGLINE}
          </div>
          <div
            style={{
              alignItems: "center",
              color: "#9ec8cc",
              display: "flex",
              fontSize: 24,
              marginTop: 42,
            }}
          >
            <span
              style={{
                background: "#1f6f78",
                borderRadius: 999,
                display: "flex",
                height: 10,
                marginRight: 14,
                width: 10,
              }}
            />
            thedndcompanion.com
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            background: "#1e2022",
            border: "2px solid #4d4635",
            borderRadius: 42,
            boxShadow: "0 28px 80px rgba(10, 11, 15, 0.42)",
            display: "flex",
            height: 240,
            justifyContent: "center",
            width: 240,
          }}
        >
          <svg fill="none" height="188" viewBox="0 0 96 96" width="188">
            <path d="M48 10 82 29v38L48 86 14 67V29L48 10Z" fill="#f7f1e5" />
            <path d="M48 18 74 33v30L48 78 22 63V33L48 18Z" fill="#8b2f39" />
            <path d="M48 26 66 36v22L48 70 30 58V36L48 26Z" fill="#f7f1e5" />
            <path d="M47 34h3l10 24h-6l-2-5h-9l-2 5h-6l12-24Zm.5 7-3 8h6l-3-8Z" fill="#17161f" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
