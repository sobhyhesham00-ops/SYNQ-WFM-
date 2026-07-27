// Aura visual identity — a warm, nocturnal, "glow in the dark" palette.
export const theme = {
  colors: {
    bg: "#0B0B1A",
    surface: "#15152B",
    surfaceAlt: "#1E1E3A",
    primary: "#8B5CF6", // aura violet
    primaryDim: "#6D28D9",
    accent: "#F472B6", // charm pink
    gold: "#FBBF24", // wealth gold
    text: "#F5F5FF",
    textDim: "#A0A0C0",
    online: "#34D399",
    away: "#FBBF24",
    busy: "#F87171",
    border: "#2A2A4A",
  },
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
  spacing: (n: number) => n * 4,
};

export const statusColor = (status?: string) => {
  switch (status) {
    case "ONLINE":
      return theme.colors.online;
    case "AWAY":
      return theme.colors.away;
    case "BUSY":
      return theme.colors.busy;
    default:
      return theme.colors.textDim;
  }
};
