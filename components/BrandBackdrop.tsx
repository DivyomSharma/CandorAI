import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const themeAtmosphere = {
  'dark-honey': {
    end: 'hsl(40, 15%, 8%)',
    glow: 'hsl(40, 35%, 50%)',
    mid: 'hsl(40, 12%, 12%)',
    start: 'hsl(40, 15%, 10%)',
  },
  'dark-lavender': {
    end: 'hsl(268, 15%, 8%)',
    glow: 'hsl(268, 30%, 50%)',
    mid: 'hsl(268, 12%, 12%)',
    start: 'hsl(268, 15%, 10%)',
  },
  'dark-rose': {
    end: 'hsl(350, 15%, 8%)',
    glow: 'hsl(350, 30%, 50%)',
    mid: 'hsl(350, 12%, 12%)',
    start: 'hsl(350, 15%, 10%)',
  },
  'dark-sand': {
    end: 'hsl(20, 14%, 10%)',
    glow: 'hsl(30, 20%, 50%)',
    mid: 'hsl(30, 10%, 11%)',
    start: 'hsl(24, 12%, 9%)',
  },
  'dark-sky': {
    end: 'hsl(207, 20%, 8%)',
    glow: 'hsl(207, 40%, 50%)',
    mid: 'hsl(207, 18%, 12%)',
    start: 'hsl(207, 20%, 10%)',
  },
  'light-honey': {
    end: 'hsl(40, 35%, 94%)',
    glow: 'hsl(48, 60%, 75%)',
    mid: 'hsl(48, 40%, 92%)',
    start: 'hsl(48, 50%, 94%)',
  },
  'light-lavender': {
    end: 'hsl(280, 25%, 96%)',
    glow: 'hsl(268, 50%, 80%)',
    mid: 'hsl(268, 28%, 94%)',
    start: 'hsl(270, 30%, 96%)',
  },
  'light-rose': {
    end: 'hsl(0, 30%, 95%)',
    glow: 'hsl(348, 50%, 80%)',
    mid: 'hsl(348, 35%, 93%)',
    start: 'hsl(355, 40%, 95%)',
  },
  'light-sand': {
    end: 'hsl(20, 14%, 96%)',
    glow: 'hsl(28, 30%, 80%)',
    mid: 'hsl(28, 10%, 94%)',
    start: 'hsl(28, 12%, 96%)',
  },
  'light-sky': {
    end: 'hsl(200, 30%, 95%)',
    glow: 'hsl(207, 60%, 80%)',
    mid: 'hsl(210, 35%, 93%)',
    start: 'hsl(207, 40%, 95%)',
  },
} as const;

const grainSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E`;

function withAlpha(hslColor: string, alpha: number) {
  const match = hslColor.match(/^hsl\((.+)\)$/);
  if (!match) {
    return hslColor;
  }

  return `hsla(${match[1]}, ${alpha})`;
}

interface BrandBackdropProps {
  style?: StyleProp<ViewStyle>;
}

export function BrandBackdrop({ style }: BrandBackdropProps) {
  const { accent, colors, mode } = useTheme();
  const key = `${mode}-${accent}` as keyof typeof themeAtmosphere;
  const atmosphere = themeAtmosphere[key];

  const webGradientStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(180deg, ${atmosphere.start} 0%, ${atmosphere.mid} 50%, ${atmosphere.end} 100%)`,
        } as unknown as ViewStyle)
      : undefined;

  const grainStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `url("${grainSvg}")`,
          backgroundSize: '256px 256px',
        } as unknown as ViewStyle)
      : undefined;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, webGradientStyle]} />
      <View
        style={[
          styles.glowPrimary,
          { backgroundColor: withAlpha(atmosphere.glow, 0.14) },
        ]}
      />
      <View
        style={[
          styles.glowSecondary,
          { backgroundColor: withAlpha(atmosphere.glow, 0.08) },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.grain, grainStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glowPrimary: {
    borderRadius: 999,
    height: 440,
    left: '50%',
    marginLeft: -280,
    marginTop: -170,
    position: 'absolute',
    top: '32%',
    width: 560,
  },
  glowSecondary: {
    borderRadius: 999,
    height: 320,
    marginRight: -150,
    position: 'absolute',
    right: '16%',
    top: '52%',
    width: 320,
  },
  grain: {
    opacity: 0.03,
  },
});
