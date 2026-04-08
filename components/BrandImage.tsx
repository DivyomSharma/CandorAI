import React from 'react';
import { Image, ImageResizeMode, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const sources = {
  mark: {
    dark: require('../assets/branding/mark-dark.png'),
    light: require('../assets/branding/mark-light.png'),
  },
  wordmark: {
    dark: require('../assets/branding/wordmark-dark.png'),
    light: require('../assets/branding/wordmark-light.png'),
  },
} as const;

interface BrandImageProps {
  variant?: keyof typeof sources;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ImageStyle>;
}

export function BrandImage({
  variant = 'wordmark',
  resizeMode = 'cover',
  style,
}: BrandImageProps) {
  const { mode } = useTheme();

  return (
    <Image
      resizeMode={resizeMode}
      source={sources[variant][mode]}
      style={style}
    />
  );
}
