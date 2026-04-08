/**
 * Candor Design System
 * Exact port of the becandor.vercel.app theme system.
 *
 * Dual-axis: mode (light/dark) × accent (sand/rose/sky/lavender/honey)
 * HSL values from candor/src/index.css
 */

// ── Types ────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';
export type ThemeAccent = 'sand' | 'rose' | 'sky' | 'lavender' | 'honey';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  foreground: string;
  foregroundSecondary: string;
  accent: string;
  accentForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
  // chat-specific
  bubbleUser: string;
  bubbleAI: string;
  bubbleUserText: string;
  bubbleAIText: string;
}

// ── HSL helper ───────────────────────────────────────────────────────

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// ── Accents metadata (for ThemeSelector dots) ────────────────────────

export const accents: {
  name: ThemeAccent;
  label: string;
  lightColor: string;
  darkColor: string;
}[] = [
  { name: 'sand', label: 'sand', lightColor: hsl(28, 15, 82), darkColor: hsl(28, 9, 61) },
  { name: 'rose', label: 'rose', lightColor: hsl(348, 40, 82), darkColor: hsl(350, 40, 65) },
  { name: 'sky', label: 'sky', lightColor: hsl(207, 50, 82), darkColor: hsl(207, 50, 60) },
  { name: 'lavender', label: 'lavender', lightColor: hsl(268, 40, 82), darkColor: hsl(268, 40, 65) },
  { name: 'honey', label: 'honey', lightColor: hsl(48, 50, 80), darkColor: hsl(40, 45, 65) },
];

// ── All 10 theme combos ──────────────────────────────────────────────
// Values copied verbatim from candor/src/index.css

const themes: Record<`${ThemeMode}-${ThemeAccent}`, ThemeColors> = {
  // ── SAND ───────────────────────────────────────────
  'light-sand': {
    background: hsl(28, 12, 96),
    surface: hsl(28, 10, 92),
    surfaceSecondary: hsl(28, 8, 89),
    foreground: hsl(28, 16, 25),
    foregroundSecondary: hsl(28, 10, 45),
    accent: hsl(28, 15, 82),
    accentForeground: hsl(28, 16, 25),
    primary: hsl(28, 15, 72),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(28, 10, 92),
    secondaryForeground: hsl(28, 16, 25),
    muted: hsl(28, 12, 90),
    mutedForeground: hsl(28, 10, 45),
    card: hsl(28, 10, 92),
    cardForeground: hsl(28, 16, 25),
    border: hsl(28, 8, 85),
    input: hsl(28, 8, 85),
    ring: hsl(28, 15, 72),
    bubbleUser: 'hsla(28, 15%, 82%, 0.2)',
    bubbleAI: hsl(28, 8, 89),
    bubbleUserText: hsl(28, 16, 25),
    bubbleAIText: hsl(28, 10, 45),
  },
  'dark-sand': {
    background: hsl(24, 12, 9),
    surface: hsl(24, 10, 12),
    surfaceSecondary: hsl(24, 8, 15),
    foreground: hsl(30, 16, 90),
    foregroundSecondary: hsl(27, 6, 69),
    accent: hsl(28, 9, 61),
    accentForeground: hsl(30, 16, 9),
    primary: hsl(28, 9, 61),
    primaryForeground: hsl(24, 12, 9),
    secondary: hsl(24, 8, 15),
    secondaryForeground: hsl(30, 16, 90),
    muted: hsl(24, 10, 12),
    mutedForeground: hsl(27, 6, 69),
    card: hsl(24, 10, 12),
    cardForeground: hsl(30, 16, 90),
    border: hsl(24, 6, 20),
    input: hsl(24, 6, 20),
    ring: hsl(28, 9, 61),
    bubbleUser: 'hsla(28, 9%, 61%, 0.2)',
    bubbleAI: hsl(24, 8, 15),
    bubbleUserText: hsl(30, 16, 90),
    bubbleAIText: hsl(27, 6, 69),
  },

  // ── ROSE ───────────────────────────────────────────
  'light-rose': {
    background: hsl(355, 40, 95),
    surface: hsl(352, 35, 92),
    surfaceSecondary: hsl(350, 30, 89),
    foreground: hsl(0, 8, 28),
    foregroundSecondary: hsl(0, 6, 45),
    accent: hsl(348, 40, 82),
    accentForeground: hsl(0, 8, 28),
    primary: hsl(348, 40, 72),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(352, 35, 92),
    secondaryForeground: hsl(0, 8, 28),
    muted: hsl(352, 25, 90),
    mutedForeground: hsl(0, 6, 45),
    card: hsl(352, 35, 92),
    cardForeground: hsl(0, 8, 28),
    border: hsl(350, 20, 85),
    input: hsl(350, 20, 85),
    ring: hsl(348, 40, 72),
    bubbleUser: 'hsla(348, 40%, 82%, 0.2)',
    bubbleAI: hsl(350, 30, 89),
    bubbleUserText: hsl(0, 8, 28),
    bubbleAIText: hsl(0, 6, 45),
  },
  'dark-rose': {
    background: hsl(350, 15, 10),
    surface: hsl(350, 12, 13),
    surfaceSecondary: hsl(350, 10, 16),
    foreground: hsl(350, 16, 90),
    foregroundSecondary: hsl(350, 10, 65),
    accent: hsl(350, 40, 65),
    accentForeground: hsl(350, 15, 10),
    primary: hsl(350, 40, 60),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(350, 12, 13),
    secondaryForeground: hsl(350, 16, 90),
    muted: hsl(350, 12, 13),
    mutedForeground: hsl(350, 10, 65),
    card: hsl(350, 12, 13),
    cardForeground: hsl(350, 16, 90),
    border: hsl(350, 10, 25),
    input: hsl(350, 10, 25),
    ring: hsl(350, 40, 65),
    bubbleUser: 'hsla(350, 40%, 65%, 0.2)',
    bubbleAI: hsl(350, 10, 16),
    bubbleUserText: hsl(350, 16, 90),
    bubbleAIText: hsl(350, 10, 65),
  },

  // ── SKY ────────────────────────────────────────────
  'light-sky': {
    background: hsl(207, 40, 95),
    surface: hsl(210, 38, 92),
    surfaceSecondary: hsl(210, 30, 89),
    foreground: hsl(207, 16, 29),
    foregroundSecondary: hsl(207, 10, 42),
    accent: hsl(207, 50, 82),
    accentForeground: hsl(207, 16, 29),
    primary: hsl(207, 50, 72),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(210, 38, 92),
    secondaryForeground: hsl(207, 16, 29),
    muted: hsl(210, 25, 90),
    mutedForeground: hsl(207, 10, 42),
    card: hsl(210, 38, 92),
    cardForeground: hsl(207, 16, 29),
    border: hsl(210, 20, 85),
    input: hsl(210, 20, 85),
    ring: hsl(207, 50, 72),
    bubbleUser: 'hsla(207, 50%, 82%, 0.2)',
    bubbleAI: hsl(210, 30, 89),
    bubbleUserText: hsl(207, 16, 29),
    bubbleAIText: hsl(207, 10, 42),
  },
  'dark-sky': {
    background: hsl(207, 20, 10),
    surface: hsl(207, 15, 13),
    surfaceSecondary: hsl(207, 12, 16),
    foreground: hsl(207, 20, 90),
    foregroundSecondary: hsl(207, 15, 65),
    accent: hsl(207, 50, 60),
    accentForeground: hsl(207, 20, 10),
    primary: hsl(207, 50, 55),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(207, 15, 13),
    secondaryForeground: hsl(207, 20, 90),
    muted: hsl(207, 15, 13),
    mutedForeground: hsl(207, 15, 65),
    card: hsl(207, 15, 13),
    cardForeground: hsl(207, 20, 90),
    border: hsl(207, 15, 25),
    input: hsl(207, 15, 25),
    ring: hsl(207, 50, 60),
    bubbleUser: 'hsla(207, 50%, 60%, 0.2)',
    bubbleAI: hsl(207, 12, 16),
    bubbleUserText: hsl(207, 20, 90),
    bubbleAIText: hsl(207, 15, 65),
  },

  // ── LAVENDER ───────────────────────────────────────
  'light-lavender': {
    background: hsl(270, 30, 96),
    surface: hsl(268, 28, 92),
    surfaceSecondary: hsl(268, 22, 89),
    foreground: hsl(270, 8, 28),
    foregroundSecondary: hsl(270, 6, 42),
    accent: hsl(268, 40, 82),
    accentForeground: hsl(270, 8, 28),
    primary: hsl(268, 40, 72),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(268, 28, 92),
    secondaryForeground: hsl(270, 8, 28),
    muted: hsl(268, 20, 90),
    mutedForeground: hsl(270, 6, 42),
    card: hsl(268, 28, 92),
    cardForeground: hsl(270, 8, 28),
    border: hsl(268, 18, 85),
    input: hsl(268, 18, 85),
    ring: hsl(268, 40, 72),
    bubbleUser: 'hsla(268, 40%, 82%, 0.2)',
    bubbleAI: hsl(268, 22, 89),
    bubbleUserText: hsl(270, 8, 28),
    bubbleAIText: hsl(270, 6, 42),
  },
  'dark-lavender': {
    background: hsl(268, 15, 10),
    surface: hsl(268, 12, 13),
    surfaceSecondary: hsl(268, 10, 16),
    foreground: hsl(268, 16, 90),
    foregroundSecondary: hsl(268, 10, 65),
    accent: hsl(268, 40, 65),
    accentForeground: hsl(268, 15, 10),
    primary: hsl(268, 40, 60),
    primaryForeground: hsl(0, 0, 100),
    secondary: hsl(268, 12, 13),
    secondaryForeground: hsl(268, 16, 90),
    muted: hsl(268, 12, 13),
    mutedForeground: hsl(268, 10, 65),
    card: hsl(268, 12, 13),
    cardForeground: hsl(268, 16, 90),
    border: hsl(268, 10, 25),
    input: hsl(268, 10, 25),
    ring: hsl(268, 40, 65),
    bubbleUser: 'hsla(268, 40%, 65%, 0.2)',
    bubbleAI: hsl(268, 10, 16),
    bubbleUserText: hsl(268, 16, 90),
    bubbleAIText: hsl(268, 10, 65),
  },

  // ── HONEY ──────────────────────────────────────────
  'light-honey': {
    background: hsl(48, 50, 94),
    surface: hsl(48, 40, 90),
    surfaceSecondary: hsl(48, 30, 87),
    foreground: hsl(48, 12, 25),
    foregroundSecondary: hsl(48, 8, 40),
    accent: hsl(48, 50, 80),
    accentForeground: hsl(48, 12, 25),
    primary: hsl(48, 50, 68),
    primaryForeground: hsl(48, 12, 15),
    secondary: hsl(48, 40, 90),
    secondaryForeground: hsl(48, 12, 25),
    muted: hsl(48, 30, 88),
    mutedForeground: hsl(48, 8, 40),
    card: hsl(48, 40, 90),
    cardForeground: hsl(48, 12, 25),
    border: hsl(48, 20, 83),
    input: hsl(48, 20, 83),
    ring: hsl(48, 50, 68),
    bubbleUser: 'hsla(48, 50%, 80%, 0.2)',
    bubbleAI: hsl(48, 30, 87),
    bubbleUserText: hsl(48, 12, 25),
    bubbleAIText: hsl(48, 8, 40),
  },
  'dark-honey': {
    background: hsl(40, 15, 10),
    surface: hsl(40, 12, 13),
    surfaceSecondary: hsl(40, 10, 16),
    foreground: hsl(40, 16, 90),
    foregroundSecondary: hsl(40, 12, 65),
    accent: hsl(40, 45, 65),
    accentForeground: hsl(40, 15, 10),
    primary: hsl(40, 45, 60),
    primaryForeground: hsl(40, 15, 10),
    secondary: hsl(40, 12, 13),
    secondaryForeground: hsl(40, 16, 90),
    muted: hsl(40, 12, 13),
    mutedForeground: hsl(40, 12, 65),
    card: hsl(40, 12, 13),
    cardForeground: hsl(40, 16, 90),
    border: hsl(40, 10, 25),
    input: hsl(40, 10, 25),
    ring: hsl(40, 45, 65),
    bubbleUser: 'hsla(40, 45%, 65%, 0.2)',
    bubbleAI: hsl(40, 10, 16),
    bubbleUserText: hsl(40, 16, 90),
    bubbleAIText: hsl(40, 12, 65),
  },
};

// ── Get resolved colors ──────────────────────────────────────────────

export function getThemeColors(mode: ThemeMode, accent: ThemeAccent): ThemeColors {
  return themes[`${mode}-${accent}`];
}

// ── Typography (DM Sans) ─────────────────────────────────────────────

export const Typography = {
  heading: {
    fontSize: 28,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '300' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Radius (matching tailwind --radius + extensions) ─────────────────

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 30,
  full: 999,
} as const;

// ── Shadows ──────────────────────────────────────────────────────────

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;
