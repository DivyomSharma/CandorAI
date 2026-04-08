import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

interface Profile {
  analysis_count?: number;
  display_name?: string | null;
  traits?: Record<string, string | string[]> | null;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({});
  const [snapshots, setSnapshots] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    supabase
      .from('profiles')
      .select('display_name, traits, analysis_count')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
        }
      });

    supabase
      .from('messages')
      .select('content')
      .eq('sender_id', user.id)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setSnapshots(data.map((item) => item.content));
        }
      });
  }, [user]);

  const handleSignOut = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('sign out of candor?');
      if (!confirmed) {
        return;
      }

      await signOut();
      router.replace('/');
      return;
    }

    Alert.alert('sign out', 'sign out of candor?', [
      { text: 'cancel', style: 'cancel' },
      {
        style: 'destructive',
        text: 'sign out',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const traitCards = [
    {
      key: 'emotional style',
      value:
        profile.traits?.emotional_depth && profile.traits?.emotional_regulation
          ? `you tend toward ${String(profile.traits.emotional_depth)} feeling, and often hold emotion in a ${String(profile.traits.emotional_regulation)} way`
          : 'unlocks as candor understands more',
      blurred: !(profile.traits?.emotional_depth && profile.traits?.emotional_regulation),
    },
    {
      key: 'conflict style',
      value: profile.traits?.conflict_style
        ? `when things get tense, you often ${String(profile.traits.conflict_style)} first`
        : 'unlocks as candor understands more',
      blurred: !profile.traits?.conflict_style,
    },
    {
      key: 'connection style',
      value: profile.traits?.attachment
        ? `you seem to connect in a more ${String(profile.traits.attachment)} way`
        : 'unlocks as candor understands more',
      blurred: !profile.traits?.attachment,
    },
    {
      key: 'communication patterns',
      value: profile.traits?.communication_style
        ? `your voice tends to feel ${String(profile.traits.communication_style)}`
        : 'unlocks as candor understands more',
      blurred: !profile.traits?.communication_style,
    },
  ];

  const recentShifts = [
    profile.analysis_count
      ? `candor has updated its understanding ${profile.analysis_count} time${profile.analysis_count === 1 ? '' : 's'}`
      : 'still early, but the pattern is beginning',
    Array.isArray(profile.traits?.values) && profile.traits?.values.length
      ? `values showing up lately: ${(profile.traits.values as string[]).slice(0, 3).join(', ')}`
      : 'values will appear here when there is more signal',
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />

      <View pointerEvents="box-none" style={styles.floatingTopBar}>
        <TouchableOpacity
          accessibilityLabel="sign out"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => void handleSignOut()}
          style={[
            styles.signOutButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <FontAwesome color={colors.foregroundSecondary} name="sign-out" size={14} />
          <Text style={[styles.signOutText, { color: colors.foregroundSecondary }]}>sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <View style={styles.header}>
          <BrandImage style={styles.wordmark} variant="wordmark" />
          <View style={[styles.avatarCircle, { backgroundColor: colors.surface }]}>
            <BrandImage style={styles.avatarMark} variant="mark" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            what candor notices about you
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.foregroundSecondary }]}>
            this isn't fixed. it changes as you talk.
          </Text>
        </View>

        <View style={styles.stack}>
          {traitCards.map((card) => (
            <View
              key={card.key}
              style={[
                styles.card,
                Shadows.md,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.cardEyebrow, { color: colors.foregroundSecondary }]}>
                {card.key}
              </Text>
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.foreground },
                  card.blurred && styles.blurredText,
                ]}
              >
                {card.value}
              </Text>
            </View>
          ))}

          <View
            style={[
              styles.card,
              Shadows.md,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.foregroundSecondary }]}>
              recent shifts
            </Text>
            {recentShifts.map((line) => (
              <Text key={line} style={[styles.shiftLine, { color: colors.foreground }]}>
                {line}
              </Text>
            ))}
          </View>

          <View
            style={[
              styles.card,
              Shadows.md,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.foregroundSecondary }]}>
              memory snapshots
            </Text>
            {snapshots.length > 0 ? (
              snapshots.map((snapshot) => (
                <Text key={snapshot} style={[styles.snapshotLine, { color: colors.foreground }]}>
                  "{snapshot}"
                </Text>
              ))
            ) : (
              <Text style={[styles.snapshotLine, styles.blurredText, { color: colors.foreground }]}>
                unlocks as candor understands more
              </Text>
            )}
          </View>

          <View
            style={[
              styles.card,
              Shadows.md,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.foregroundSecondary }]}>
              reflection
            </Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              does this feel accurate?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.inlineAction}>
              <Text style={[styles.inlineActionText, { color: colors.foregroundSecondary }]}>
                want to add something?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 96,
  },
  avatarMark: {
    height: 44,
    width: 44,
  },
  blurredText: {
    opacity: 0.48,
  },
  card: {
    borderRadius: Radius['3xl'],
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  cardEyebrow: {
    ...Typography.caption,
    marginBottom: Spacing.md,
    textTransform: 'lowercase',
  },
  cardTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    lineHeight: 30,
    textTransform: 'lowercase',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: 88,
  },
  floatingTopBar: {
    position: 'absolute',
    right: Spacing.lg,
    top: Spacing.lg,
    zIndex: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  inlineAction: {
    marginTop: Spacing.lg,
  },
  inlineActionText: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    maxWidth: 320,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  shiftLine: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textTransform: 'lowercase',
  },
  signOutButton: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutText: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  snapshotLine: {
    ...Typography.body,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  stack: {
    gap: 0,
  },
  wordmark: {
    height: 56,
    marginBottom: Spacing.xl,
    width: 190,
  },
});
