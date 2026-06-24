export const arcaneClerkAppearance = {
  elements: {
    card: {
      background: "#1e2022",
      border: "1px solid #4d4635",
      boxShadow: "0 28px 80px rgba(10, 11, 15, 0.48)",
    },
    footer: {
      background: "#1a1c1e",
      borderTop: "1px solid #4d4635",
    },
    formButtonPrimary: {
      boxShadow: "none",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "#d0c5af",
    },
    headerTitle: {
      color: "#e2e2e5",
      fontFamily: "var(--font-auth-display), serif",
      letterSpacing: "-0.02em",
    },
    rootBox: {
      width: "100%",
    },
  },
  options: {
    logoImageUrl: "/brand-mark.svg",
    logoPlacement: "inside",
  },
  variables: {
    borderRadius: "0.5rem",
    colorBackground: "#1e2022",
    colorBorder: "#4d4635",
    colorDanger: "#ffb4ab",
    colorForeground: "#e2e2e5",
    colorInput: "#0c0e10",
    colorInputForeground: "#e2e2e5",
    colorMuted: "#282a2c",
    colorMutedForeground: "#d0c5af",
    colorPrimary: "#d4af37",
    colorPrimaryForeground: "#3c2f00",
    colorRing: "#e9c349",
    colorShadow: "rgba(10, 11, 15, 0.5)",
    fontFamily: "var(--font-auth-sans), Inter, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-auth-sans), Inter, system-ui, sans-serif",
    spacing: "1rem",
  },
} as const;
