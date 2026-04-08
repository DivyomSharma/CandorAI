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

type StarterType = 'relationship' | 'bothering' | 'thinking' | 'talk';

interface Profile {
  analysis_count: number;
  display_name: string | null;
  match_ready: boolean;
}

const entryOptions: { description: string; key: StarterType; label: string }[] = [
  { key: 'relationship', label: 'a relationship situation', description: 'start with something involving someone else' },
  { key: 'bothering', label: 'something that’s been bothering me', description: 'name the thing that keeps returning' },
  { key: 'thinking', label: 'something i’ve been thinking about', description: 'start from a thought that won’t leave' },
  { key: 'talk', label: 'just talk', description: 'enter quietly and see where it goes' },
];

function EntryCard({
  description,
  label,
  onPress,
}: {
  description: string;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.entryTitle, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.entryDescription, { color: colors.foregroundSecondary }]}>{description}</Text>
    </TouchableOpacity>
  );
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

    supabase
      .from('profiles')
      .select('display_name, match_ready, analysis_count')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
        }
      });
  }, [user]);

  const startConversation = async (starter?: StarterType) => {
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
      router.push(starter ? `/conversation/${data.id}?starter=${starter}` : `/conversation/${data.id}`);
    }
  };

  const firstName = profile?.display_name?.trim().split(' ')[0]?.toLowerCase();

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
          <Text style={[styles.heroEyebrow, { color: colors.foregroundSecondary }]}>
            {firstName ? `welcome back, ${firstName}` : 'entry engine'}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>what’s been on your mind lately?</Text>
          <Text style={[styles.heroSubtitle, { color: colors.foregroundSecondary }]}>
            you don’t have to impress anyone here.
          </Text>

          <View style={styles.entryGrid}>
            {entryOptions.map((option) => (
              <EntryCard
                key={option.key}
                description={option.description}
                label={option.label}
                onPress={() => startConversation(option.key)}
              />
            ))}
          </View>
        </View>

        <View
          style={[
            styles.scenarioCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.scenarioEyebrow, { color: colors.foregroundSecondary }]}>imagine this</Text>
          <Text style={[styles.scenarioCopy, { color: colors.foreground }]}>
            you’re excited about something{'\n'}
            and the person you care about barely reacts{'\n\n'}
            what stays with you more?
          </Text>
          <View style={styles.scenarioActions}>
            <Button onPress={() => startConversation('relationship')} title="respond" />
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => startConversation()} style={styles.secondaryCta}>
            <Text style={[styles.secondaryCtaText, { color: colors.foregroundSecondary }]}>or just start talking</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.signalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.signalTitle, { color: colors.foreground }]}>
            {profile?.match_ready
              ? 'i might know someone who makes sense for you.'
              : 'i think i’m starting to understand you.'}
          </Text>
          <Text style={[styles.signalCopy, { color: colors.foregroundSecondary }]}>
            {profile?.match_ready
              ? 'keep going, or step into matches when you feel ready.'
              : 'the more you respond, the more signal candor can hold onto.'}
          </Text>
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
  entryCard: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 220,
    padding: Spacing.lg,
  },
  entryDescription: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  entryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  entryTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  heroCard: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  heroEyebrow: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    textTransform: 'lowercase',
  },
  heroSubtitle: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  heroTitle: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: 38,
    lineHeight: 42,
    maxWidth: 560,
  },
  scenarioActions: {
    marginTop: Spacing.lg,
    maxWidth: 220,
  },
  scenarioCard: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  scenarioCopy: {
    ...Typography.body,
    fontFamily: 'DMSans_400Regular',
    fontSize: 20,
    lineHeight: 30,
  },
  scenarioEyebrow: {
    ...Typography.caption,
    letterSpacing: 1.4,
    marginBottom: Spacing.md,
    textTransform: 'lowercase',
  },
  secondaryCta: {
    marginTop: Spacing.lg,
  },
  secondaryCtaText: {
    ...Typography.bodySmall,
    textTransform: 'lowercase',
  },
  signalCard: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    padding: Spacing.xl,
  },
  signalCopy: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  signalTitle: {
    ...Typography.subheading,
    textTransform: 'lowercase',
  },
  wordmark: {
    height: 42,
    width: 150,
  },
});
