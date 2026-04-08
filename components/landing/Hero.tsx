import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/utils/theme';
import { CTA, type LandingMode } from './CTA';

interface HeroProps {
  mode: LandingMode;
  onEnter?: () => void;
}

export function Hero({ mode, onEnter }: HeroProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.hero}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        no swipes.{'\n'}just honest conversations.
      </Text>
      <Text style={[styles.subtitle, { color: colors.foregroundSecondary }]}>
        a space where you can be understood before you&apos;re seen.
      </Text>
      <View style={styles.cta}>
        <CTA mode={mode} onEnter={onEnter} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: Spacing.xl,
    maxWidth: 560,
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? 520 : 420,
    paddingVertical: Spacing.xxl,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.md,
    maxWidth: 520,
    textAlign: 'center',
  },
  title: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: Platform.OS === 'web' ? 68 : 42,
    lineHeight: Platform.OS === 'web' ? 72 : 48,
    maxWidth: 840,
    textAlign: 'center',
  },
});
