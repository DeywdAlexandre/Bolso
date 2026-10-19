const common = {
  primary: "#00d68f",
  primaryForeground: "#ffffff",
  income: "#00d68f",
  expense: "#ff5a5f",
  destructive: "#ff5a5f",
  destructiveForeground: "#ffffff",
  accent: "#ffd166",
  accentForeground: "#1a1100",
  radius: 18,
};

const colors = {
  light: {
    ...common,
    background: "#ffffff",
    foreground: "#09090b",
    card: "#f4f4f5",
    cardForeground: "#09090b",
    secondary: "#f4f4f5",
    secondaryForeground: "#09090b",
    muted: "#f4f4f5",
    mutedForeground: "#5f5f68",
    border: "#e4e4e7",
    input: "#f4f4f5",
    text: "#09090b",
    tint: "#00d68f",
  },
  dark: {
    ...common,
    background: "#0a0a0c",
    foreground: "#fafafa",
    card: "#15151a",
    cardForeground: "#fafafa",
    secondary: "#1c1c22",
    secondaryForeground: "#fafafa",
    muted: "#1c1c22",
    mutedForeground: "#8a8a93",
    border: "#26262c",
    input: "#1c1c22",
    text: "#fafafa",
    tint: "#00d68f",
    primaryForeground: "#04130c",
  },
  radius: 18,
};

export default colors;

