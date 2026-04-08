import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/utils/theme';
import { Hero } from './Hero';
import { Sections } from './Sections';
import type { LandingMode } from './CTA';

interface LandingProps {
  mode: LandingMode;
}

export function Landing({ mode }: LandingProps) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <View style={styles.nav}>
          <BrandImage style={styles.navWordmark} variant="wordmark" />
          <View style={styles.navActions}>
            <ThemeSelector />
            <Pressable onPress={() => router.push(mode === 'app' ? '/login' : '/')}>
              <Text style={[styles.navLink, { color: colors.foregroundSecondary }]}>
                {mode === 'app' ? 'sign in' : 'join waitlist'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Hero
          mode={mode}
          onEnter={() => router.push(mode === 'app' ? (session ? '/(tabs)' : '/login') : '/')}
        />
        <Sections />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: 18,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  navLink: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  navWordmark: {
    height: 32,
    width: 110,
  },
});
