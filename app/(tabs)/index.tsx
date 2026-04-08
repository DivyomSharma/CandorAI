import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

interface Profile {
  analysis_count: number;
  bio: string | null;
  display_name: string | null;
  match_ready: boolean;
  traits: Record<string, string | string[]> | null;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, traits, match_ready, analysis_count')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
      }
    };

    void fetchProfile();

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const startAIConversation = async () => {
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [user.id],
        type: 'ai',
      })
      .select('id')
      .single();

    if (data && !error) {
      router.push(`/conversation/${data.id}`);
    }
  };

  const getProgressText = () => {
    if (profile?.match_ready) {
      return 'someone might understand you';
    }

    if ((profile?.analysis_count ?? 0) > 0 || (profile?.traits && Object.keys(profile.traits).length > 2)) {
      return 'candor is learning';
    }

    return 'candor is listening';
  };

  const displayTraits = Object.entries(profile?.traits || {})
    .filter(([key, value]) => !Array.isArray(value) && value !== 'unknown' && !key.startsWith('_'))
    .slice(0, 5);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.greeting}>
        <View style={[styles.sparkle, { backgroundColor: colors.bubbleUser }]}>
          <Text style={[styles.sparkleText, { color: colors.accent }]}>{"\u2726"}</Text>
        </View>
        <Text style={[styles.greetingText, { color: colors.foreground }]}>
          hi{profile?.display_name ? `, ${profile.display_name.toLowerCase()}` : ''}.
        </Text>
        <Text style={[styles.greetingSubtext, { color: colors.foregroundSecondary }]}>
          {getProgressText()}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={startAIConversation}
        style={[
          styles.card,
          Shadows.md,
          { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
          <Text style={[styles.cardEmoji, { color: colors.foreground }]}>{"\u2726"}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>talk to candor</Text>
        <Text style={[styles.cardDescription, { color: colors.foregroundSecondary }]}>
          a quiet space for honest conversation.
        </Text>
        <View style={[styles.cardAction, { backgroundColor: colors.primary }]}>
          <Text style={[styles.cardActionText, { color: colors.primaryForeground }]}>start chatting</Text>
        </View>
      </TouchableOpacity>

      {displayTraits.length > 0 && (
        <View
          style={[
            styles.card,
            Shadows.sm,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>what candor notices</Text>
          <View style={styles.traitsGrid}>
            {displayTraits.map(([trait, value]) => (
              <View
                key={trait}
                style={[styles.traitChip, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.traitName, { color: colors.foregroundSecondary }]}>
                  {trait.replace(/_/g, ' ')}
                </Text>
                <Text style={[styles.traitValue, { color: colors.foreground }]}>
                  {value as string}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <ThemeSelector />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  cardAction: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cardActionText: {
    ...Typography.bodySmall,
    fontFamily: 'DMSans_500Medium',
  },
  cardDescription: {
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  greeting: {
    marginBottom: Spacing.xl,
  },
  greetingSubtext: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  greetingText: {
    ...Typography.heading,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 48,
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.md,
    textTransform: 'lowercase',
  },
  sparkle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 44,
  },
  sparkleText: {
    fontSize: 20,
  },
  traitChip: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  traitName: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  traitValue: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  traitsGrid: {
    gap: Spacing.md,
  },
});
