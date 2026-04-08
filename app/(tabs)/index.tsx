import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

interface QuickLinkProps {
  caption: string;
  onPress: () => void;
  title: string;
}

function QuickLink({ caption, onPress, title }: QuickLinkProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.quickLink,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.quickLinkTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.quickLinkCaption, { color: colors.foregroundSecondary }]}>{caption}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestAiConversationId, setLatestAiConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchData = async () => {
      const [{ data: profileData }, { data: conversationData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, bio, traits, match_ready, analysis_count')
          .eq('id', user.id)
          .single(),
        supabase
          .from('conversations')
          .select('id')
          .eq('type', 'ai')
          .contains('participant_ids', [user.id])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileData) {
        setProfile(profileData as Profile);
      }

      setLatestAiConversationId(conversationData?.id ?? null);
    };

    void fetchData();

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

  const openCandor = async () => {
    if (!user) {
      return;
    }

    if (latestAiConversationId) {
      router.push(`/conversation/${latestAiConversationId}`);
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
      setLatestAiConversationId(data.id);
      router.push(`/conversation/${data.id}`);
    }
  };

  const firstName = profile?.display_name?.trim().split(' ')[0]?.toLowerCase();
  const intro = profile?.match_ready
    ? 'someone has been unlocked. you can keep talking, or see who is waiting.'
    : (profile?.analysis_count ?? 0) > 0
      ? 'candor is listening closely enough to start noticing patterns.'
      : 'start one quiet conversation and let candor do the rest.';

  const traits = Object.entries(profile?.traits || {})
    .filter(([key, value]) => !Array.isArray(value) && value !== 'unknown' && !key.startsWith('_'))
    .slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <View style={styles.header}>
          <BrandImage style={styles.wordmark} variant="wordmark" />
          <ThemeSelector />
        </View>

        <View
          style={[
            styles.heroCard,
            Shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.foregroundSecondary }]}>
            {firstName ? `welcome back, ${firstName}` : 'your quiet corner'}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            honest conversation, gently held.
          </Text>
          <Text style={[styles.heroCopy, { color: colors.foregroundSecondary }]}>{intro}</Text>

          <View style={styles.heroActions}>
            <Button onPress={openCandor} title={latestAiConversationId ? 'continue with candor' : 'start with candor'} />
          </View>
        </View>

        <View style={styles.quickLinks}>
          <QuickLink
            caption="all conversations in one place"
            onPress={() => router.push('/(tabs)/chat')}
            title="conversations"
          />
          <QuickLink
            caption={profile?.match_ready ? 'someone may be waiting' : 'unlocks appear here'}
            onPress={() => router.push('/(tabs)/matches')}
            title="matches"
          />
          <QuickLink
            caption="adjust your name, bio, and sign-out"
            onPress={() => router.push('/(tabs)/profile')}
            title="profile"
          />
        </View>

        <View
          style={[
            styles.insightCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>what candor notices</Text>
          {traits.length > 0 ? (
            <View style={styles.insightList}>
              {traits.map(([trait, value]) => (
                <View
                  key={trait}
                  style={[styles.insightRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.insightLabel, { color: colors.foregroundSecondary }]}>
                    {trait.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.insightValue, { color: colors.foreground }]}>{String(value)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyCopy, { color: colors.foregroundSecondary }]}>
              the first few conversations will start shaping this.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  emptyCopy: {
    ...Typography.body,
  },
  eyebrow: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    textTransform: 'lowercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  heroActions: {
    marginTop: Spacing.xl,
  },
  heroCard: {
    borderColor: 'transparent',
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  heroCopy: {
    ...Typography.body,
    maxWidth: 460,
  },
  heroTitle: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: 34,
    lineHeight: 38,
    marginBottom: Spacing.md,
    maxWidth: 520,
  },
  insightCard: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    padding: Spacing.xl,
  },
  insightLabel: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  insightList: {
    gap: Spacing.sm,
  },
  insightRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.sm,
  },
  insightValue: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    marginTop: 2,
    textTransform: 'lowercase',
  },
  quickLink: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    flex: 1,
    minWidth: 180,
    padding: Spacing.lg,
  },
  quickLinkCaption: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  quickLinkTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.md,
    textTransform: 'lowercase',
  },
  wordmark: {
    height: 42,
    width: 150,
  },
});
