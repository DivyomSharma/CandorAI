import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface BrandImageProps {
  variant?: 'mark' | 'wordmark';
  style?: StyleProp<ViewStyle>;
}

function withAlpha(hslColor: string, alpha: number) {
  const match = hslColor.match(/^hsl\((.+)\)$/);
  if (!match) {
    return hslColor;
  }

  return `hsla(${match[1]}, ${alpha})`;
}

function getDimensions(style?: StyleProp<ViewStyle>) {
  const flattened = StyleSheet.flatten(style) || {};
  return {
    height: typeof flattened.height === 'number' ? flattened.height : undefined,
    width: typeof flattened.width === 'number' ? flattened.width : undefined,
  };
}

function getSize(style?: StyleProp<ViewStyle>, fallback = 44) {
  const { width, height } = getDimensions(style);
  return width || height || fallback;
}

function CandorMark({ size }: { size: number }) {
  const { colors, mode } = useTheme();
  const fill = mode === 'dark' ? colors.primary : colors.foreground;
  const cut = colors.background;

  return (
    <View style={[styles.markFrame, { height: size * 0.88, width: size }]}>
      <View
        style={[
          styles.markBody,
          {
            backgroundColor: fill,
            borderBottomLeftRadius: size * 0.34,
            borderBottomRightRadius: size * 0.2,
            borderTopLeftRadius: size * 0.34,
            borderTopRightRadius: size * 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.markCutout,
          {
            backgroundColor: cut,
            borderBottomLeftRadius: size * 0.34,
            borderBottomRightRadius: size * 0.34,
            borderTopLeftRadius: size * 0.34,
            borderTopRightRadius: size * 0.34,
            height: size * 0.44,
            right: -size * 0.02,
            top: size * 0.2,
            width: size * 0.44,
          },
        ]}
      />
      <View
        style={[
          styles.markNotch,
          {
            backgroundColor: cut,
            borderRadius: size * 0.08,
            bottom: size * 0.08,
            height: size * 0.1,
            right: size * 0.06,
            width: size * 0.28,
          },
        ]}
      />
      <View
        style={[
          styles.markSheen,
          {
            backgroundColor: withAlpha(mode === 'dark' ? '#ffffff' : colors.primary, mode === 'dark' ? 0.08 : 0.06),
          },
        ]}
      />
    </View>
  );
}

export function BrandImage({ variant = 'wordmark', style }: BrandImageProps) {
  const { colors, mode } = useTheme();
  const size = getSize(style, variant === 'mark' ? 44 : 180);
  const flattened = StyleSheet.flatten(style) || {};

  if (variant === 'mark') {
    return (
      <View style={[styles.markWrap, flattened]}>
        <CandorMark size={size} />
      </View>
    );
  }

  const { height, width } = getDimensions(style);
  const fontSize = Math.max(24, Math.round((height || width || size) * 0.68));
  const letterSpacing = fontSize * -0.05;
  const wordColor = mode === 'dark' ? colors.foreground : colors.foreground;

  return (
    <View style={[styles.wordmarkWrap, flattened]}>
      <Text
        numberOfLines={1}
        style={[
          styles.wordmarkText,
          {
            color: wordColor,
            fontSize,
            letterSpacing,
            lineHeight: fontSize * 1.05,
          },
        ]}
      >
        candor
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  markBody: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  markCutout: {
    position: 'absolute',
  },
  markFrame: {
    overflow: 'hidden',
    position: 'relative',
  },
  markNotch: {
    position: 'absolute',
  },
  markSheen: {
    borderRadius: 999,
    height: '100%',
    left: '-25%',
    opacity: 0.9,
    position: 'absolute',
    top: 0,
    width: '70%',
  },
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkText: {
    fontFamily: 'DMSans_400Regular',
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  wordmarkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
