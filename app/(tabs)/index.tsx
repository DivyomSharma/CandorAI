import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Button } from '@/components/ui';
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.container}
      >
        <View style={styles.header}>
          <BrandImage style={styles.wordmark} variant="wordmark" />
          <ThemeSelector />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            hi{profile?.display_name ? `, ${profile.display_name.toLowerCase()}` : ''}.
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.foregroundSecondary }]}>
            {getProgressText()}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={startAIConversation}
          style={[
            styles.card,
            Shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <BrandImage style={styles.cardMark} variant="mark" />
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>talk to candor</Text>
              <Text style={[styles.cardDescription, { color: colors.foregroundSecondary }]}>
                a quiet space for honest conversation.
              </Text>
            </View>
          </View>

          <Button onPress={startAIConversation} title="start chatting" />
        </TouchableOpacity>

        {displayTraits.length > 0 && (
          <View
            style={[
              styles.card,
              Shadows.soft,
              { backgroundColor: colors.surface, borderColor: colors.border },
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  cardDescription: {
    ...Typography.bodySmall,
    lineHeight: 24,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardMark: {
    borderRadius: 24,
    height: 72,
    width: 72,
  },
  cardTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
    textTransform: 'lowercase',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 56,
  },
  hero: {
    marginBottom: Spacing.xl,
  },
  heroSubtitle: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  heroTitle: {
    ...Typography.heading,
    fontSize: 36,
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.md,
    textTransform: 'lowercase',
  },
  traitChip: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
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
  wordmark: {
    height: 56,
    width: 200,
  },
});
